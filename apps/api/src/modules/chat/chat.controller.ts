// ============================================
// Chat Controller — AI Assistant Endpoints
// ============================================

import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/jwt-auth.guard';
import { ChatService } from './chat.service';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsUUID()
  sessionId!: string;
}

@ApiTags('chat')
@ApiBearerAuth()
@Controller({ path: 'chat', version: '1' })
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('message')
  @ApiOperation({ summary: 'Send a message to Maate AI' })
  async sendMessage(
    @CurrentUser('sub') userId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(userId, dto.sessionId, dto.message);
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
}
