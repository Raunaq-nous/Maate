// ============================================
// MAATE API — Application Entry Point
// ============================================

import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('APP_PORT', 3000);

  // ─── Logger ──────────────────────────────
  app.useLogger(app.get(Logger));

  // ─── Security ────────────────────────────
  app.use(helmet());
  const corsOrigins = configService.get<string>('CORS_ORIGINS');
  const allowedOrigins = corsOrigins ? corsOrigins.split(',') : [];
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      const isAllowed =
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin === 'http://localhost:3001' ||
        configService.get('NODE_ENV') !== 'production';

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  });


  // ─── API Versioning ──────────────────────
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // ─── Validation ──────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ─── Swagger Documentation ───────────────
  if (configService.get('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Maate API')
      .setDescription('AI-Powered Personal Health Management Platform')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication & Authorization')
      .addTag('users', 'User Profile Management')
      .addTag('documents', 'Medical Document Management')
      .addTag('reminders', 'Medicine, Water & Meal Reminders')
      .addTag('timeline', 'Health Timeline')
      .addTag('analytics', 'Health Analytics & Trends')
      .addTag('family', 'Family Group Management')
      .addTag('shares', 'Doctor Sharing')
      .addTag('chat', 'AI Chatbot')
      .addTag('notifications', 'Push Notifications')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  // ─── Graceful Shutdown ───────────────────
  app.enableShutdownHooks();

  await app.listen(port);
  console.log(`🚀 Maate API running on http://localhost:${port}`);
  console.log(`📚 Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
