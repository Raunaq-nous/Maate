// ============================================
// Chat Module — AI Conversation Context
// ============================================

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ConsentModule } from '../consent/consent.module';

@Module({
  imports: [HttpModule, ConsentModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
