import { Test, TestingModule } from '@nestjs/testing';
import { TicketGateway } from './ticket.gateway';
import { TicketService } from './ticket.service';

describe('TicketGateway', () => {
  let gateway: TicketGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TicketGateway, TicketService],
    }).compile();

    gateway = module.get<TicketGateway>(TicketGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
