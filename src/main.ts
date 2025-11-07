import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { useContainer } from 'class-validator';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import * as passport from 'passport';
import 'reflect-metadata';
import { AppModule } from './app.module';
import { RedisStore } from 'connect-redis';
import session from 'express-session';
import { createClient } from 'redis';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggerService } from './logger/logger.service';

// Swagger config
const swaggerConfig = new DocumentBuilder()
  .setTitle('Store backend service')
  .setDescription('Store backend service API description')
  .setVersion('1.0')
  .build();

// Helmet config
const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: [`'self'`],
      styleSrc: [`'self'`, `'unsafe-inline'`],
      imgSrc: [`'self'`, 'data:', 'validator.swagger.io', 'apollo-server-landing-page.cdn.apollographql.com'],
      scriptSrc: [`'self'`, `https: 'unsafe-inline'`],
      manifestSrc: [`'self'`, 'apollo-server-landing-page.cdn.apollographql.com'],
      frameSrc: [`'self'`, 'sandbox.embed.apollographql.com'],
    },
  },
};

// CORS config
const corsConfig = {
  origin: [process.env.FRONTEND_URL || 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  transports: ['websocket', 'polling'],
};

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { cors: corsConfig });

  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useLogger(new LoggerService());
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Swagger
  const documentFactory = () => SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, documentFactory);

  const redisClient = createClient({
    url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
    password: process.env.REDIS_PASSWORD,
  });

  try {
    await redisClient.connect();
  } catch (err) {
    console.error('❌ Redis connection failed:', err);
  }

  const redisStore = new RedisStore({
    client: redisClient,
    prefix: 'webstore:',
  });

  // Middleware
  app.use(
    session({
      store: redisStore,
      secret: process.env.SESSION_SECRET!,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24, // 1 day
      },
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());
  app.use(cookieParser(process.env.COOKIE_SECRET));
  app.use(helmet(helmetConfig));
  app.use(compression());

  await app.listen(process.env.PORT ?? 4000);
}
void bootstrap();
