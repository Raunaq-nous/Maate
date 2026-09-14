// ============================================
// Chat Controller — AI Assistant Endpoints
// Grounded Clinical Conversational API
// ============================================

import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/auth/jwt-auth.guard';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/chat.dto';

@ApiTags('chat')
@ApiBearerAuth()
@Controller({ path: 'chat', version: '1' })
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('message')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Send a message to Maate AI' })
  async sendMessage(
    @CurrentUser('sub') userId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(userId, dto);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'List user chat sessions' })
  async listSessions(@CurrentUser('sub') userId: string) {
    return this.chatService.listSessions(userId);
  }

  @Get('sessions/:id/history')
  @ApiOperation({ summary: 'Get message history for a session' })
  async getHistory(
    @CurrentUser('sub') userId: string,
    @Param('id') sessionId: string,
  ) {
    return this.chatService.getHistory(userId, sessionId);
  }

  @Delete('sessions/:id')
  @ApiOperation({ summary: 'Archive/delete a chat session' })
  async deleteSession(
    @CurrentUser('sub') userId: string,
    @Param('id') sessionId: string,
  ) {
    return this.chatService.deleteSession(userId, sessionId);
  }
}
