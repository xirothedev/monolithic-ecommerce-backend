import { Bill, Order, SelectFrom } from '@prisma/generated';

export interface OrderItem {
  productId: string;
  productItemId: string;
  quantity: number;
  price: number;
  from: SelectFrom;
}

export interface OrderWithInvoiceDetails extends Order {
  items: {
    product: {
      seller: {
        id: string;
        fullname: string;
      };
    };
  }[];
  bill: Bill;
  user: {
    id: string;
    fullname: string;
    email: string;
    phone: string | null;
    address: string | null;
  };
}
