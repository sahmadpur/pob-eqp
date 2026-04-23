import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CibpayConfigService } from './cibpay.config';
import {
  CibpayCreateOrderRequest,
  CibpayOrder,
  CibpayOrdersResponse,
  CibpayPingResponse,
  CibpayRefundRequest,
} from './cibpay.types';

type Operation = 'create_order' | 'get_order' | 'refund' | 'cancel' | 'charge' | 'ping';

@Injectable()
export class CibpayService {
  private readonly logger = new Logger(CibpayService.name);
  private _client?: AxiosInstance;

  constructor(
    private readonly config: CibpayConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private client(): AxiosInstance {
    if (this._client) return this._client;
    const cfg = this.config.getConfig();
    this._client = axios.create({
      baseURL: cfg.baseUrl,
      timeout: 15000,
      httpsAgent: this.config.getHttpsAgent(),
      headers: {
        Authorization: this.config.getAuthHeader(),
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      maxRedirects: 0,
      validateStatus: (s) => (s >= 200 && s < 300) || s === 302 || s === 303,
    });
    return this._client;
  }

  private async logCall(
    paymentId: string | null,
    operation: Operation,
    direction: 'request' | 'response' | 'error',
    payload: unknown,
    opts: { httpStatus?: number; idempotencyKey?: string; latencyMs?: number } = {},
  ): Promise<void> {
    try {
      await this.prisma.paymentGatewayLog.create({
        data: {
          paymentId: paymentId ?? undefined,
          provider: 'cibpay',
          operation,
          direction,
          httpStatus: opts.httpStatus,
          idempotencyKey: opts.idempotencyKey,
          payload: payload as object,
          latencyMs: opts.latencyMs,
        },
      });
    } catch (err) {
      this.logger.warn(`Failed to write PaymentGatewayLog: ${(err as Error).message}`);
    }
  }

  async ping(): Promise<CibpayPingResponse> {
    const start = Date.now();
    try {
      const res = await this.client().get<CibpayPingResponse>('/ping');
      await this.logCall(null, 'ping', 'response', res.data, { httpStatus: res.status, latencyMs: Date.now() - start });
      return res.data;
    } catch (err) {
      await this.logCall(null, 'ping', 'error', this.extractError(err), { latencyMs: Date.now() - start });
      throw new ServiceUnavailableException('CIBPAY gateway unreachable');
    }
  }

  async createOrder(
    paymentId: string,
    body: CibpayCreateOrderRequest,
    idempotencyKey?: string,
  ): Promise<{ order: CibpayOrder; paymentUrl: string | null }> {
    const key = idempotencyKey ?? randomUUID();
    const start = Date.now();
    await this.logCall(paymentId, 'create_order', 'request', body, { idempotencyKey: key });

    try {
      const res = await this.client().post<CibpayOrdersResponse>('/orders/create', body, {
        headers: { 'X-Request-Id': key },
      });
      const paymentUrl = this.extractLocation(res);
      const order = res.data?.orders?.[0];
      await this.logCall(paymentId, 'create_order', 'response', { data: res.data, location: paymentUrl }, {
        httpStatus: res.status,
        idempotencyKey: key,
        latencyMs: Date.now() - start,
      });
      if (!order) throw new ServiceUnavailableException('CIBPAY create order returned no orders');
      return { order, paymentUrl };
    } catch (err) {
      await this.logCall(paymentId, 'create_order', 'error', this.extractError(err), {
        idempotencyKey: key,
        latencyMs: Date.now() - start,
      });
      throw this.wrap(err, 'CIBPAY create order failed');
    }
  }

  async getOrder(paymentId: string, cibpayOrderId: string, expand?: string[]): Promise<CibpayOrder> {
    const start = Date.now();
    const expandQs = expand?.length ? `?expand=${expand.join(',')}` : '';
    await this.logCall(paymentId, 'get_order', 'request', { cibpayOrderId, expand }, {});

    try {
      const res = await this.client().get<CibpayOrdersResponse>(`/orders/${cibpayOrderId}${expandQs}`);
      const order = res.data?.orders?.[0];
      await this.logCall(paymentId, 'get_order', 'response', res.data, {
        httpStatus: res.status,
        latencyMs: Date.now() - start,
      });
      if (!order) throw new ServiceUnavailableException('CIBPAY get order returned no orders');
      return order;
    } catch (err) {
      await this.logCall(paymentId, 'get_order', 'error', this.extractError(err), { latencyMs: Date.now() - start });
      throw this.wrap(err, 'CIBPAY get order failed');
    }
  }

  async refund(paymentId: string, cibpayOrderId: string, amount: string, idempotencyKey?: string): Promise<CibpayOrder> {
    const key = idempotencyKey ?? randomUUID();
    const start = Date.now();
    const body: CibpayRefundRequest = { amount };
    await this.logCall(paymentId, 'refund', 'request', { cibpayOrderId, ...body }, { idempotencyKey: key });

    try {
      const res = await this.client().put<CibpayOrdersResponse>(`/orders/${cibpayOrderId}/refund`, body, {
        headers: { 'X-Request-Id': key },
      });
      const order = res.data?.orders?.[0];
      await this.logCall(paymentId, 'refund', 'response', res.data, {
        httpStatus: res.status,
        idempotencyKey: key,
        latencyMs: Date.now() - start,
      });
      if (!order) throw new ServiceUnavailableException('CIBPAY refund returned no orders');
      return order;
    } catch (err) {
      await this.logCall(paymentId, 'refund', 'error', this.extractError(err), {
        idempotencyKey: key,
        latencyMs: Date.now() - start,
      });
      throw this.wrap(err, 'CIBPAY refund failed');
    }
  }

  async cancel(paymentId: string, cibpayOrderId: string, idempotencyKey?: string): Promise<CibpayOrder> {
    const key = idempotencyKey ?? randomUUID();
    const start = Date.now();
    await this.logCall(paymentId, 'cancel', 'request', { cibpayOrderId }, { idempotencyKey: key });

    try {
      const res = await this.client().put<CibpayOrdersResponse>(`/orders/${cibpayOrderId}/cancel`, undefined, {
        headers: { 'X-Request-Id': key },
      });
      const order = res.data?.orders?.[0];
      await this.logCall(paymentId, 'cancel', 'response', res.data, {
        httpStatus: res.status,
        idempotencyKey: key,
        latencyMs: Date.now() - start,
      });
      if (!order) throw new ServiceUnavailableException('CIBPAY cancel returned no orders');
      return order;
    } catch (err) {
      await this.logCall(paymentId, 'cancel', 'error', this.extractError(err), {
        idempotencyKey: key,
        latencyMs: Date.now() - start,
      });
      throw this.wrap(err, 'CIBPAY cancel failed');
    }
  }

  async charge(paymentId: string, cibpayOrderId: string, amount: string, idempotencyKey?: string): Promise<CibpayOrder> {
    const key = idempotencyKey ?? randomUUID();
    const start = Date.now();
    await this.logCall(paymentId, 'charge', 'request', { cibpayOrderId, amount }, { idempotencyKey: key });

    try {
      const res = await this.client().put<CibpayOrdersResponse>(`/orders/${cibpayOrderId}/charge`, { amount }, {
        headers: { 'X-Request-Id': key },
      });
      const order = res.data?.orders?.[0];
      await this.logCall(paymentId, 'charge', 'response', res.data, {
        httpStatus: res.status,
        idempotencyKey: key,
        latencyMs: Date.now() - start,
      });
      if (!order) throw new ServiceUnavailableException('CIBPAY charge returned no orders');
      return order;
    } catch (err) {
      await this.logCall(paymentId, 'charge', 'error', this.extractError(err), {
        idempotencyKey: key,
        latencyMs: Date.now() - start,
      });
      throw this.wrap(err, 'CIBPAY charge failed');
    }
  }

  private extractLocation(res: AxiosResponse): string | null {
    const headerLoc = (res.headers?.location as string) || (res.headers?.Location as string);
    if (headerLoc) return headerLoc;
    const bodyLoc = (res.data as { orders?: Array<{ location?: unknown }> })?.orders?.[0]?.location;
    if (typeof bodyLoc === 'string') return bodyLoc;
    if (bodyLoc && typeof bodyLoc === 'object' && 'url' in bodyLoc && typeof (bodyLoc as { url?: unknown }).url === 'string') {
      return (bodyLoc as { url: string }).url;
    }
    return null;
  }

  private extractError(err: unknown): Record<string, unknown> {
    const e = err as { response?: { status?: number; data?: unknown }; message?: string; code?: string };
    const data = e.response?.data as { failure_type?: string; failure_message?: string; order_id?: string } | undefined;
    return {
      message: e.message,
      code: e.code,
      httpStatus: e.response?.status,
      failure_type: data?.failure_type,
      failure_message: data?.failure_message,
      order_id: data?.order_id,
      data: e.response?.data,
    };
  }

  private wrap(err: unknown, prefix: string): HttpException {
    const e = err as { response?: { status?: number; data?: unknown }; message?: string };
    const status = e.response?.status;
    const data = e.response?.data as { failure_type?: string; failure_message?: string } | undefined;
    const detail = data?.failure_message || data?.failure_type || JSON.stringify(e.response?.data ?? {}) || e.message;
    const msg = `${prefix}: ${detail}`;

    // 402 declined, 422 validation → client-visible business error
    if (status === 402 || status === 422 || (status && status >= 400 && status < 500)) {
      return new BadRequestException(msg);
    }
    // 5xx or network → upstream unavailable
    if (status && status >= 500) {
      return new ServiceUnavailableException(msg);
    }
    // No response at all (timeout, EPROTO, ECONNRESET …) — treat as gateway unavailable
    return new ServiceUnavailableException(msg);
  }
}
