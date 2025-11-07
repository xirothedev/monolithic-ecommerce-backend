import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  BillStatus,
  BillType,
  PaymentMethod,
  Prisma,
  PrismaClient,
  ProductFlag,
  TicketCategory,
  TicketContextType,
  TicketPriority,
  TicketStatus,
  UserFlag,
  UserRole,
} from '@prisma/generated';
import { faker } from '@faker-js/faker';

// --- Helper functions ---
const unique = <T>(arr: T[]) => Array.from(new Set(arr));

const chunk = <T>(array: T[], size: number): T[][] => {
  return Array.from({ length: Math.ceil(array.length / size) }, (_, i) => array.slice(i * size, i * size + size));
};

function generateSku() {
  const category = faker.commerce.department().slice(0, 3).toUpperCase();
  const product = faker.commerce.product().slice(0, 3).toUpperCase();
  const number = faker.number.int({ min: 1000, max: 9999 });
  return `${category}-${product}-${number}`;
}

const generateProductImages = (count = 5): string[] => {
  return Array.from({ length: count }, () => faker.image.urlPicsumPhotos({ width: 400, height: 300 }).slice(0, 500));
};

function generateTicketImages(min = 2, max = 5) {
  // const categories = ['technology', 'computer', 'error', 'screen', 'code'];
  const imageCount = faker.number.int({ min, max });

  return Array.from({ length: imageCount }, () =>
    faker.image
      .urlPicsumPhotos({
        width: 800,
        height: 600,
      })
      .slice(0, 500),
  );
}

// --- Generate IDs ---
const userIds = unique(Array.from({ length: 100 }, () => faker.string.uuid()));
const categoryIds = unique(Array.from({ length: 10 }, () => faker.string.uuid()));
const cartItemIds = unique(Array.from({ length: 2000 }, () => faker.string.uuid()));
const productIds = unique(Array.from({ length: 100 }, () => faker.string.uuid()));
const productItemIds = unique(Array.from({ length: 1000 }, () => faker.string.uuid()));
const reviewIds = unique(Array.from({ length: 1000 }, () => faker.string.uuid()));
const billIds = unique(Array.from({ length: 5000 }, () => faker.string.uuid()));
const orderIds = unique(Array.from({ length: 5000 }, () => faker.string.uuid()));
const orderItemIds = unique(Array.from({ length: 50000 }, () => faker.string.uuid()));
const ticketIds = unique(Array.from({ length: 2000 }, () => faker.string.uuid()));

const users: Prisma.UserCreateManyInput[] = userIds.map((id, i) => ({
  id,
  fullname: faker.person.fullName().slice(0, 50),
  email: `user${i}_${faker.internet.email().slice(0, 200)}`.slice(0, 255),
  phone: faker.phone.number().slice(0, 20),
  avatarUrl: faker.image.avatar().slice(0, 500),
  address: faker.location.streetAddress().slice(0, 500),
  city: faker.location.city().slice(0, 50),
  state: faker.location.state().slice(0, 50),
  zipCode: faker.location.zipCode().slice(0, 10),
  biography: faker.lorem.sentence(),
  roles: ['USER', faker.helpers.arrayElement(Object.values(UserRole))],
  flags: [faker.helpers.arrayElement(Object.values(UserFlag))],
  credit: faker.number.int({ min: 0, max: 1000 }),
  isVerified: true,
}));

const categories: Prisma.CategoryCreateManyInput[] = categoryIds.map((id) => {
  const name = unique([
    faker.commerce.department(),
    faker.commerce.productMaterial(),
    faker.commerce.productAdjective(),
  ]).join(' ');

  return {
    id,
    name,
    slug: faker.helpers.slugify(name),
  };
});

const products: Prisma.ProductCreateManyInput[] = productIds.map((id, i) => {
  const name = faker.commerce.productName().slice(0, 255);
  const originalPrice = faker.number.float({ min: 10, max: 1000 });
  const discountRate = faker.number.int({ min: 10, max: 50 });
  const discountPrice = +(originalPrice * (1 - discountRate / 100)).toFixed(2);

  return {
    id,
    categoryId: faker.helpers.arrayElement(categoryIds),
    sellerId: faker.helpers.arrayElement(userIds),
    name,
    sku: generateSku(),
    description: faker.commerce.productDescription(),
    originalPrice,
    discountPrice,
    slug: faker.helpers.slugify(name + i),
    stock: faker.number.int({ min: 10, max: 50 }),
    sold: faker.number.int({ min: 0, max: 100 }),
    flags: [faker.helpers.arrayElement(Object.values(ProductFlag))],
    tags: [faker.commerce.productAdjective().slice(0, 100), faker.commerce.productMaterial().slice(0, 100)],
    isActive: faker.datatype.boolean(),
    medias: generateProductImages(),
  };
});

const cartItemPairSet = new Set<string>();
const cartItems: Prisma.CartItemCreateManyInput[] = [];
for (const id of cartItemIds) {
  let productId = faker.helpers.arrayElement(productIds);
  let userId = faker.helpers.arrayElement(userIds);
  let pairKey = `${productId}_${userId}`;
  let tries = 0;
  while (cartItemPairSet.has(pairKey) && tries < 10) {
    productId = faker.helpers.arrayElement(productIds);
    userId = faker.helpers.arrayElement(userIds);
    pairKey = `${productId}_${userId}`;
    tries++;
  }
  if (!cartItemPairSet.has(pairKey)) {
    cartItemPairSet.add(pairKey);
    cartItems.push({
      id,
      productId,
      userId,
      createdAt: faker.date.recent({ days: 10 }),
      quantity: faker.number.int({ min: 1, max: 10 }),
    });
  }
}

const productItems: Prisma.ProductItemCreateManyInput[] = productItemIds.map((id) => {
  const isSold = faker.datatype.boolean();

  return {
    id,
    productId: faker.helpers.arrayElement(productIds),
    data: faker.string.sample(10),
    isSold,
    soldAt: isSold ? faker.date.past() : null,
  };
});

const reviewPairSet = new Set<string>();
const reviews: Prisma.ReviewCreateManyInput[] = [];
for (const id of reviewIds) {
  let productId = faker.helpers.arrayElement(productIds);
  let userId = faker.helpers.arrayElement(userIds);
  let pairKey = `${productId}_${userId}`;
  let tries = 0;
  while (reviewPairSet.has(pairKey) && tries < 10) {
    productId = faker.helpers.arrayElement(productIds);
    userId = faker.helpers.arrayElement(userIds);
    pairKey = `${productId}_${userId}`;
    tries++;
  }
  if (!reviewPairSet.has(pairKey)) {
    reviewPairSet.add(pairKey);
    reviews.push({
      id,
      userId,
      productId,
      comment: faker.lorem.sentence({ min: 5, max: 15 }),
      rating: faker.number.float({ min: 1, max: 5, fractionDigits: 1 }).toFixed(1),
    });
  }
}

const bills: Prisma.BillCreateManyInput[] = billIds.map((id) => ({
  id,
  userId: faker.helpers.arrayElement(userIds),
  transactionId: faker.string.alphanumeric(12),
  paymentMethod: faker.helpers.arrayElement(Object.values(PaymentMethod)),
  type: faker.helpers.arrayElement(Object.values(BillType)),
  status: faker.helpers.arrayElement(Object.values(BillStatus)),
  amount: faker.number.int({ min: 20, max: 1000 }),
  note: faker.lorem.sentence(),
}));

const orders: Prisma.OrderCreateManyInput[] = orderIds.map((id, i) => {
  const bill = bills[i];
  return {
    id,
    userId: faker.helpers.arrayElement(userIds),
    billId: bill.id!,
    totalPrice: faker.number.int({ min: 100, max: 2000 }),
  };
});

const usedProductItemIds = new Set<string>();
const orderItems: Prisma.OrderItemCreateManyInput[] = [];
for (const id of orderItemIds) {
  let productItemId = faker.helpers.arrayElement(productItemIds);
  let tries = 0;
  while (usedProductItemIds.has(productItemId) && tries < 10) {
    productItemId = faker.helpers.arrayElement(productItemIds);
    tries++;
  }
  if (!usedProductItemIds.has(productItemId)) {
    usedProductItemIds.add(productItemId);
    orderItems.push({
      id,
      from: faker.helpers.arrayElement(['CART', 'SERVICES']),
      quantity: faker.number.int({ min: 1, max: 10 }),
      price: faker.number.int({ min: 10, max: 500 }),
      productId: faker.helpers.arrayElement(productIds),
      productItemId,
      orderId: faker.helpers.arrayElement(orderIds),
    });
  }
}

const tickets: Prisma.TicketCreateManyInput[] = ticketIds.map((id, i) => {
  const assignableUsers = users.filter((user) => Array.isArray(user.roles) && user.roles.includes('SUPPORTER'));
  const authorId = faker.helpers.arrayElement(userIds);
  let assignId: string | undefined;

  if (assignableUsers.length > 0) {
    let assignUser = faker.helpers.arrayElement(assignableUsers);
    while (assignUser.id === authorId && assignableUsers.length > 1) {
      assignUser = faker.helpers.arrayElement(assignableUsers);
    }
    assignId = assignUser.id;
  }

  return {
    id,
    numericalOrder: i + 1,
    title: faker.helpers.arrayElement([
      `Cannot ${faker.hacker.verb()} ${faker.hacker.noun()}`,
      `${faker.company.buzzAdjective()} ${faker.commerce.productName()} not working`,
      `${faker.hacker.ingverb()} issue with ${faker.internet.domainWord()}`,
      `Error when trying to ${faker.hacker.verb()} ${faker.system.fileExt()} file`,
    ]),
    description: faker.lorem.paragraphs({ min: 1, max: 2 }),
    authorId,
    assignId,
    category: faker.helpers.arrayElement(Object.values(TicketCategory)),
    priority: faker.helpers.arrayElement(Object.values(TicketPriority)),
    status: faker.helpers.arrayElement(Object.values(TicketStatus)),
    attachments: generateTicketImages(),
  };
});

const ticketUsers: Prisma.TicketMemberCreateManyInput[] = tickets.flatMap((ticket) => {
  const participants = new Set<string>([ticket.authorId]);
  if (ticket.assignId) participants.add(ticket.assignId);

  return Array.from(participants).map((userId) => ({
    id: faker.string.uuid(),
    ticketId: ticket.id!,
    userId,
    lastReadAt: faker.date.recent({ days: 7 }),
    lastReadMessageId: null,
  }));
});

const ticketUserMap = new Map<string, Prisma.TicketMemberCreateManyInput[]>();

for (const tu of ticketUsers) {
  const list = ticketUserMap.get(tu.ticketId) ?? [];
  list.push(tu);
  ticketUserMap.set(tu.ticketId, list);
}

const ticketMessages: Prisma.TicketMessageCreateManyInput[] = [];

for (const ticket of tickets) {
  const participants = ticketUserMap.get(ticket.id!);
  if (!participants || participants.length === 0) continue;

  const messageCount = faker.number.int({ min: 50, max: 100 });

  for (let i = 0; i < messageCount; i++) {
    const sender = faker.helpers.arrayElement(participants);

    ticketMessages.push({
      id: faker.string.uuid(),
      content: faker.lorem.sentences({ min: 1, max: 3 }),
      isRead: faker.datatype.boolean(),
      createdAt: faker.date.recent({ days: 10 }),
      updatedAt: new Date(),
      attachments: generateTicketImages(0, 2),
      ticketId: ticket.id!,
      senderId: sender.id!,
    });
  }
}

const contextTypes = Object.values(TicketContextType);
const ticketContexts: Prisma.TicketContextCreateManyInput[] = [];

for (const ticket of tickets) {
  const count = faker.number.int({ min: 1, max: contextTypes.length });
  const selectedTypes = faker.helpers.shuffle(contextTypes).slice(0, count);

  for (const type of selectedTypes) {
    let label: string;

    switch (type) {
      case 'PRODUCT':
        label = faker.commerce.productName();
        break;
      case 'ORDER':
        label = `ORDER-${faker.number.int({ min: 1000, max: 9999 })}`;
        break;
      case 'TRANSACTION':
        label = `TXN-${faker.string.alphanumeric({ length: 8, casing: 'upper' })}`;
        break;
      case 'ACCOUNT':
        label = faker.internet.email();
        break;
      default:
        label = 'Unknown';
        break;
    }

    ticketContexts.push({
      id: faker.string.uuid(),
      ticketId: ticket.id!,
      type,
      labelId: faker.string.uuid(),
      label,
    });
  }
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
      omit: { user: { hashedPassword: true } },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }

  async seed() {
    await this.user.createMany({ data: users });
    await this.category.createMany({ data: categories });
    await this.product.createMany({ data: products });
    await this.cartItem.createMany({ data: cartItems });
    await this.productItem.createMany({ data: productItems });
    await this.review.createMany({ data: reviews });
    await this.bill.createMany({ data: bills });
    await this.order.createMany({ data: orders });
    await this.orderItem.createMany({ data: orderItems });
    await this.ticket.createMany({ data: tickets });
    await this.ticketMember.createMany({ data: ticketUsers });

    for (const chunked of chunk(ticketMessages, 500)) {
      await this.ticketMessage.createMany({
        data: chunked,
        skipDuplicates: true,
      });
    }

    for (const batch of chunk(ticketContexts, 500)) {
      await this.ticketContext.createMany({ data: batch });
    }
    console.log('Seeded');
  }
}
