import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class OrderNotificationsService {
  private readonly logger = new Logger(OrderNotificationsService.name);
  private readonly transporter: Transporter;
  private readonly fromAddress: string;

  constructor(private readonly config: ConfigService) {
    this.fromAddress = this.config.get<string>('MAIL_FROM', 'noreply@portofbaku.az');

    const smtpUser = this.config.get<string>('SMTP_USER');
    const smtpPass = this.config.get<string>('SMTP_PASS');

    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST', 'mailhog'),
      port: this.config.get<number>('SMTP_PORT', 1025),
      secure: this.config.get<string>('SMTP_SECURE', 'false') === 'true',
      ...(smtpUser && smtpPass ? { auth: { user: smtpUser, pass: smtpPass } } : {}),
    });
  }

  async sendClarificationRequest(
    to: string,
    orderId: string,
    requestNote: string,
    roundNumber: number,
  ) {
    const subject = `Action Needed — Clarification required for order ${orderId}`;
    const html = `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#1a56db">Port of Baku E-Queue Platform</h2>
        <p>Our Finance team has requested clarification on your order
          <strong style="font-family:monospace">${orderId}</strong>
          before it can be approved for payment.</p>
        <div style="background:#fff7ed;border:1px solid #fdba74;border-radius:8px;padding:14px 16px;margin:14px 0">
          <p style="margin:0 0 6px 0;font-size:12px;color:#9a3412;font-weight:600;text-transform:uppercase">
            Clarification round ${roundNumber}
          </p>
          <p style="margin:0;color:#7c2d12">${requestNote}</p>
        </div>
        <p>Please sign in to your account, review the request, update any
          details or documents as needed, and respond so Finance can continue
          the approval.</p>
        <p style="color:#999;font-size:12px">— Port of Baku E-Queue Platform (automated)</p>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject,
        html,
      });
      this.logger.log(`Clarification email sent to ${to} for order ${orderId}`);
    } catch (err) {
      this.logger.error(`Failed to send clarification email to ${to} for order ${orderId}`, err);
    }
  }
}
