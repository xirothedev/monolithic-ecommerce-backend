import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { ApolloDriver, type ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { GraphQLModule } from '@nestjs/graphql';
import { ThrottlerModule } from '@nestjs/throttler';
import { join } from 'node:path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ContextThrottlerGuard } from './common/guards/context-throttler.guard';
import { EmailModule } from './email/email.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuthCookieGuard } from './modules/auth/guards/auth-cookie.guard';
import { CartModule } from './modules/cart/cart.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ChatModule } from './modules/chat/chat.module';
import { CustomersModule } from './modules/customers/customers.module';
import { ScheduleModule } from '@nestjs/schedule';
import { JwtGlobalModule } from './jwt/jwt.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ProductsModule } from './modules/products/products.module';
import { TicketModule } from './modules/ticket/ticket.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { RedisService } from './redis/redis.service';
import { SupabaseModule } from './supabase/supabase.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    SupabaseModule,
    ScheduleModule.forRoot(),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      installSubscriptionHandlers: true,
      sortSchema: true,
      playground: false,
      introspection: true,
      context: ({ req, res, connection }) => {
        if (connection) {
          // For subscriptions (WebSocket)
          return { req: connection.context };
        }
        // For HTTP requests
        return { req, res };
      },
      // https://docs.nestjs.com/graphql/subscriptions#authentication-over-websockets
      subscriptions: {
        'graphql-ws': {
          path: '/graphql',
        },
      },
      formatError: (error) => {
        return {
          ...(error.extensions?.originalError as any),
          path: error.path,
          extensions: { code: error.extensions?.code },
        };
      },
      definitions: {
        path: join(process.cwd(), 'src/graphql.ts'),
        outputAs: 'class',
      },
      plugins: [ApolloServerPluginLandingPageLocalDefault()],
    }),
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRootAsync({
      imports: [RedisModule],
      inject: [RedisService],
      useFactory: (redisService: RedisService) => ({
        throttlers: [{ limit: 100, ttl: 2000 }],
        storage: new ThrottlerStorageRedisService(redisService.getClient()),
      }),
    }),
    JwtGlobalModule,
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    UsersModule,
    EmailModule,
    ProductsModule,
    CategoriesModule,
    CartModule,
    ChatModule,
    // DiscordModule,
    CustomersModule,
    TicketModule,
    OrdersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ContextThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AuthCookieGuard,
    },
  ],
})
export class AppModule {}
