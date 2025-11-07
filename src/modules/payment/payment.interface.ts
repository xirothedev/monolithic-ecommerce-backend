export interface PayOSPaymentData {
  orderCode: number;
  amount: number;
  description: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  returnUrl: string;
  cancelUrl: string;
}

export type { WebhookType as PayOSWebhookData } from '@payos/node/lib/type';
