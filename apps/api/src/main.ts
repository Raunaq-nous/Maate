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

// Support BigInt serialization in JSON responses (e.g. Prisma fileSizeBytes)
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('APP_PORT', 3000);

  // ─── Environment & Secrets Validation ────────
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const isDev = nodeEnv === 'development';

  if (!isDev) {
    const placeholders = [
      'change-this-to-a-secure-random-secret',
      'change-this-to-a-secure-random-refresh-secret',
      'change-this-to-a-secure-random-mfa-secret',
      'your-super-secret-jwt-key',
    ];

    const validateSecret = (name: string, val?: string) => {
      if (!val || val.trim().length < 32) {
        throw new Error(
          `FATAL: ${name} must be configured in ${nodeEnv} (minimum 32 bytes / 256 bits, e.g. openssl rand -base64 32)`,
        );
      }
      if (placeholders.some((ph) => val.includes(ph))) {
        throw new Error(
          `FATAL: ${name} contains an insecure default placeholder. Set a real cryptographic secret.`,
        );
      }
    };

    validateSecret('JWT_SECRET', configService.get<string>('JWT_SECRET'));
    validateSecret('JWT_REFRESH_SECRET', configService.get<string>('JWT_REFRESH_SECRET'));
    validateSecret('MFA_ENCRYPTION_KEY', configService.get<string>('MFA_ENCRYPTION_KEY'));
  }

  // ─── Logger ──────────────────────────────
  app.useLogger(app.get(Logger));

  // ─── Security ────────────────────────────
  app.use(helmet());
  const corsOrigins = configService.get<string>('CORS_ORIGINS');
  const allowedOrigins = corsOrigins
    ? corsOrigins
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean)
    : [];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      const isAllowed =
        allowedOrigins.includes(origin) ||
        (isDev && origin === 'http://localhost:3001');

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
  if (configService.get('ENABLE_DEV_TOOLS') === 'true' && isDev) {
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
