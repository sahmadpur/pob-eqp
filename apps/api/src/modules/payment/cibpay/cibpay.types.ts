export type CibpayStatus =
  | 'new'
  | 'prepared'
  | 'authorized'
  | 'charged'
  | 'reversed'
  | 'refunded'
  | 'rejected'
  | 'fraud'
  | 'declined'
  | 'chargedback'
  | 'credited'
  | 'error';

export interface CibpayCreateOrderRequest {
  amount: number;
  currency: string;
  merchant_order_id: string;
  extra_fields?: {
    invoice_id?: string;
    oneclick?: {
      customer_id?: string;
      prechecked?: 0 | 1;
    };
  };
  options: {
    auto_charge: boolean;
    expiration_timeout?: string;
    force3d?: 0 | 1;
    language?: string;
    return_url: string;
    country?: string;
    google_pay_enabled?: 0 | 1;
    apple_pay_enabled?: 0 | 1;
    terminal?: string;
    recurring?: 0 | 1;
  };
  custom_fields?: Record<string, string>;
  client?: {
    email?: string;
    phone?: string;
    city?: string;
    country?: string;
    address?: string;
    zip?: string;
  };
}

export interface CibpayOrder {
  id: string;
  merchant_order_id: string;
  status: CibpayStatus;
  amount: string;
  amount_charged: string;
  amount_refunded: string;
  currency: string;
  created: string;
  updated: string;
  description?: string | null;
  failure_message?: string;
  auth_code?: string;
  pan?: string;
  card?: {
    holder?: string;
    subtype?: string;
    type?: string;
  };
  location?: { ip?: string };
  operations?: Array<Record<string, unknown>>;
  [k: string]: unknown;
}

export interface CibpayOrdersResponse {
  orders: CibpayOrder[];
}

export interface CibpayRefundRequest {
  amount: string;
}

export interface CibpayPingResponse {
  message: string;
  date: string;
}
