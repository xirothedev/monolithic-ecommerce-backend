import { Ticket } from '@prisma/generated';

export interface TicketMessageResponse {
  id: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  attachments: string[];
  ticket: {
    id: string;
    author: { fullname: string; id: string; avatarUrl: string };
    assign: { fullname: string; id: string; avatarUrl: string };
  };
  sender: {
    user: {
      id: string;
      fullname: string;
      avatarUrl: string | null;
    };
  };
}

export interface TicketResponse extends Ticket {}
