// ============================================
// MAATE API — Root Application Module
// Composes all domain modules with DDD boundaries
// ============================================

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';

import { AuthModule } from './modules/auth/auth.module';
import { ChatModule } from './modules/chat/chat.module';
import { DocumentModule } from './modules/document/document.module';
import { FamilyModule } from './modules/family/family.module';
import { HealthModule } from './modules/health/health.module';
import { NotificationModule } from './modules/notification/notification.module';
import { ReminderModule } from './modules/reminder/reminder.module';
import { ShareModule } from './modules/share/share.module';
import { TimelineModule } from './modules/timeline/timeline.module';
import { UserModule } from './modules/user/user.module';
import { CommonModule } from './common/common.module';
import { SecurityModule } from './common/security/security.module';

@Module({
  imports: [
    // ─── Infrastructure ──────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env['NODE_ENV'] !== 'production' && process.env['USE_PINO_PRETTY'] === 'true'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
        level: process.env['LOG_LEVEL'] || 'info',
        redact: ['req.headers.authorization', 'req.body.password', 'req.body.otp'],
      },
    }),

    CommonModule,
    SecurityModule,

    // ─── Domain Modules (DDD Bounded Contexts) ─
    AuthModule,
    UserModule,
    DocumentModule,
    ReminderModule,
    HealthModule,
    FamilyModule,
    ShareModule,
    ChatModule,
    NotificationModule,
    TimelineModule,
  ],
})
export class AppModule {}

