import { PrismaService } from '@/prisma/prisma.service';
import { SupabaseService } from '@/supabase/supabase.service';
import { ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma, UserRole } from '@prisma/generated';
import { Request } from 'express';
import { CreateTicketMessageDto } from './dto/create-ticket-message.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { FindAllTicketMessageDto } from './dto/find-all-ticket-message.dto';
import { FindAllTicketDto } from './dto/find-all-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

@Injectable()
export class TicketService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly supabaseService: SupabaseService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Check if user has admin privileges (ROOT or ADMINISTRATOR)
   */
  private isAdminUser(user: any): boolean {
    return user?.roles?.includes(UserRole.ROOT) || user?.roles?.includes(UserRole.ADMINISTRATOR);
  }

  /**
   * Check if user has access to a specific ticket
   */
  private async hasTicketAccess(userId: string, ticketId: string): Promise<boolean> {
    const ticket = await this.prismaService.ticket.findUnique({
      where: { id: ticketId },
      select: {
        authorId: true,
        assignId: true,
        members: {
          where: { userId },
          select: { id: true },
        },
      },
    });

    if (!ticket) return false;

    // User has access if they are author, assignee, or member
    return ticket.authorId === userId || ticket.assignId === userId || ticket.members.length > 0;
  }

  public async create(req: Request, body: CreateTicketDto, attachments?: Express.Multer.File[]) {
    const creater = req.user;

    const urls: string[] = [];

    if (attachments && attachments.length > 0) {
      for (let i = 0; i < attachments.length; i++) {
        const { error, path } = await this.supabaseService.uploadFile(attachments[i], {
          contentType: attachments[i].mimetype,
        });

        if (error) {
          throw new InternalServerErrorException(`Failed to upload file: ${attachments[i].originalname}`);
        }

        urls.push(path);
      }
    }

    const { contexts, ...data } = body;

    const ticket = await this.prismaService.ticket.create({
      data: {
        ...data,
        authorId: creater.id,
        attachments: urls,
        contexts: { createMany: { data: contexts, skipDuplicates: true } },
        members: {
          create: {
            userId: creater.id,
          },
        },
      },
    });

    this.eventEmitter.emit('ticket.created', { ticket });
    return {
      message: 'Create ticket succesful',
      data: ticket,
    };
  }

  public async findAll(req: Request, query: FindAllTicketDto) {
    const { page, limit, cursor, category, priority, status, search } = query;
    const take = limit ?? 20;
    let skip: number | undefined = undefined;
    let cursorObj: Prisma.TicketWhereUniqueInput | undefined = undefined;

    if (cursor) {
      cursorObj = { id: cursor };
      skip = 1;
    } else if (page && page > 1) {
      skip = (page - 1) * take;
    }

    const where: Prisma.TicketWhereInput = {};

    // Admin users can see all tickets, regular users only see their own tickets
    if (!this.isAdminUser(req.user)) {
      where.OR = [{ authorId: req.user.id }, { assignId: req.user.id }, { members: { some: { userId: req.user.id } } }];
    }

    if (category) {
      where.category = category;
    }
    if (priority) {
      where.priority = priority;
    }
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const tickets = await this.prismaService.ticket.findMany({
      where,
      select: {
        id: true,
        numericalOrder: true,
        createdAt: true,
        updatedAt: true,
        title: true,
        description: true,
        status: true,
        category: true,
        priority: true,
        contexts: true,
        attachments: true,
        author: {
          select: {
            id: true,
            fullname: true,
            email: true,
            avatarUrl: true,
            lastActiveAt: true,
          },
        },
        assign: {
          select: {
            id: true,
            fullname: true,
            email: true,
            avatarUrl: true,
            lastActiveAt: true,
          },
        },
        _count: { select: { messages: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      skip,
      ...(cursorObj && { cursor: cursorObj }),
    });

    const totalItems = await this.prismaService.ticket.count({ where });

    let prevCursor: string | null = null;
    let hasPrevPage = false;
    let result = tickets;
    if (tickets.length > take) {
      hasPrevPage = true;
      const prevItem = tickets[take];
      prevCursor = prevItem.id;
      result = tickets.slice(0, take);
    }

    return {
      message: 'Get all tickets successful',
      data: result,
      '@data': {
        totalItems,
        prevCursor,
        hasPrevPage,
      },
    };
  }

  public async findOne(req: Request, id: string) {
    try {
      // Check if user has access to this ticket (unless admin)
      if (!this.isAdminUser(req.user)) {
        const hasAccess = await this.hasTicketAccess(req.user.id, id);
        if (!hasAccess) {
          throw new ForbiddenException('You do not have permission to view this ticket');
        }
      }

      const ticket = await this.prismaService.ticket.findUniqueOrThrow({
        where: { id },
        select: {
          id: true,
          numericalOrder: true,
          createdAt: true,
          updatedAt: true,
          title: true,
          description: true,
          status: true,
          category: true,
          priority: true,
          contexts: true,
          attachments: true,
          author: {
            select: {
              id: true,
              fullname: true,
              email: true,
              avatarUrl: true,
              lastActiveAt: true,
            },
          },
          assign: {
            select: {
              id: true,
              fullname: true,
              email: true,
              avatarUrl: true,
              lastActiveAt: true,
            },
          },
          messages: {
            select: {
              id: true,
              content: true,
              isRead: true,
              createdAt: true,
              updatedAt: true,
              attachments: true,
              sender: {
                select: {
                  user: {
                    select: {
                      fullname: true,
                      email: true,
                      avatarUrl: true,
                      lastActiveAt: true,
                    },
                  },
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      return { message: 'Get ticket successful', data: ticket };
    } catch {
      throw new NotFoundException('Ticket not found');
    }
  }

  public async update(req: Request, id: string, body: UpdateTicketDto) {
    const user = req.user;
    const ticket = await this.prismaService.ticket.findUnique({
      where: { id },
      select: {
        authorId: true,
        assignId: true,
      },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');

    // Admin users can update all fields
    const isAdmin = this.isAdminUser(user);
    const isAuthor = ticket.authorId === user.id;
    const isAssign = ticket.assignId === user.id;

    if (!isAdmin && !isAuthor && !isAssign) {
      throw new ForbiddenException('You do not have permission to update this ticket');
    }
    // Build update data
    let updateData: Prisma.TicketUpdateInput = {};
    if (isAdmin || isAuthor) {
      // Admin and author can update all fields
      updateData = { ...body };
    } else if (isAssign) {
      // Assign can only update status
      if (body.status) {
        updateData.status = body.status;
      } else {
        throw new ForbiddenException('Assign user can only update status');
      }
    }
    // Remove id from updateData if present
    delete updateData.id;

    const updated = await this.prismaService.ticket.update({
      where: { id },
      data: updateData,
    });
    return { message: 'Update ticket successful', data: updated };
  }

  public async createMessage(
    req: Request,
    ticketId: string,
    body: CreateTicketMessageDto,
    attachments?: Express.Multer.File[],
  ) {
    const user = req.user;

    // Admin users can send messages to any ticket
    if (!this.isAdminUser(user)) {
      // Check if user has access to this ticket
      const hasAccess = await this.hasTicketAccess(user.id, ticketId);
      if (!hasAccess) {
        throw new ForbiddenException('You do not have permission to send message to this ticket');
      }
    }

    // Check ticket exists
    const ticket = await this.prismaService.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    // Ensure user is a member of the ticket
    let ticketMember = await this.prismaService.ticketMember.findUnique({
      where: {
        ticketUserId: {
          ticketId,
          userId: user.id,
        },
      },
      select: {
        id: true,
        ticketId: true,
        userId: true,
      },
    });

    if (!ticketMember) {
      ticketMember = await this.prismaService.ticketMember.create({
        data: {
          ticketId,
          userId: user.id,
        },
      });
    }

    const urls: string[] = [];

    if (attachments && attachments.length > 0) {
      for (let i = 0; i < attachments.length; i++) {
        const { error, path } = await this.supabaseService.uploadFile(attachments[i], {
          contentType: attachments[i].mimetype,
        });

        if (error) {
          throw new InternalServerErrorException(`Failed to upload file: ${attachments[i].originalname}`);
        }

        urls.push(path);
      }
    }

    // Create message
    const message = await this.prismaService.ticketMessage.create({
      data: {
        ticketId,
        senderId: ticketMember.id,
        content: body.content,
        isRead: false,
        attachments: urls,
      },
      select: {
        id: true,
        content: true,
        isRead: true,
        createdAt: true,
        updatedAt: true,
        attachments: true,
        ticket: {
          select: {
            id: true,
            author: { select: { fullname: true, id: true, avatarUrl: true, lastActiveAt: true } },
            assign: { select: { fullname: true, id: true, avatarUrl: true, lastActiveAt: true } },
          },
        },
        sender: {
          select: {
            user: {
              select: {
                id: true,
                fullname: true,
                avatarUrl: true,
                lastActiveAt: true,
              },
            },
          },
        },
      },
    });

    this.eventEmitter.emit('ticket.message.created', { message });
    return { message: 'Create ticket message successful', data: message };
  }

  public async findMessages(req: Request, ticketId: string, query: FindAllTicketMessageDto) {
    // Admin users can view messages from any ticket
    if (!this.isAdminUser(req.user)) {
      // Check if user has access to this ticket
      const hasAccess = await this.hasTicketAccess(req.user.id, ticketId);
      if (!hasAccess) {
        throw new ForbiddenException('You do not have permission to view messages from this ticket');
      }
    }
    const { page, limit, cursor } = query;
    const take = limit ?? 20;
    let skip: number | undefined = undefined;
    let cursorObj: Prisma.TicketMessageWhereUniqueInput | undefined = undefined;

    if (cursor) {
      cursorObj = { id: cursor };
      skip = 1;
    } else if (page && page > 1) {
      skip = (page - 1) * take;
    }

    const where: Prisma.TicketMessageWhereInput = { ticketId };

    const messages = await this.prismaService.ticketMessage.findMany({
      where,
      select: {
        id: true,
        content: true,
        isRead: true,
        createdAt: true,
        updatedAt: true,
        attachments: true,
        ticket: {
          select: {
            id: true,
            author: { select: { fullname: true, id: true, avatarUrl: true, lastActiveAt: true } },
            assign: { select: { fullname: true, id: true, avatarUrl: true, lastActiveAt: true } },
          },
        },
        sender: {
          select: {
            user: {
              select: {
                id: true,
                fullname: true,
                avatarUrl: true,
                lastActiveAt: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      skip,
      ...(cursorObj && { cursor: cursorObj }),
    });

    const totalMessages = await this.prismaService.ticketMember.count({ where: { ticketId } });

    let prevCursor: string | null = null;
    let hasPrevPage = false;
    let result = messages;

    if (messages.length > take) {
      hasPrevPage = true;
      const prevItem = messages[take];
      prevCursor = prevItem.id;
      result = messages.slice(0, take);
    }

    result = result.reverse();

    return {
      message: 'Get ticket messages successful',
      data: result,
      '@data': {
        totalItems: totalMessages,
        prevCursor,
        hasPrevPage,
      },
    };
  }
}
