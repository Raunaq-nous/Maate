// ============================================
// Chat Service — AI RAG Orchestration
// Message Persistence & AI Service Proxy
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../../common/database/database.module';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly aiServiceUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly http: HttpService,
  ) {
    this.aiServiceUrl = this.config.get('AI_SERVICE_URL', 'http://localhost:8000');
  }

  async sendMessage(userId: string, sessionId: string, message: string) {
    // 1. Get or Create Session
    const session = await this.prisma.chatSession.upsert({
      where: { id: sessionId },
      create: { id: sessionId, userId, title: message.slice(0, 50) },
      update: { isActive: true },
    });

    // 2. Fetch history (last 10 messages)
    const history = await this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: 10,
    });

    // 3. Save User Message
    await this.prisma.chatMessage.create({
      data: { sessionId, role: 'USER', content: message },
    });

    // 4. Call AI Service
    try {
      const response = await firstValueFrom(
        this.http.post<any>(`${this.aiServiceUrl}/chat`, {
          user_id: userId,
          session_id: sessionId,
          message,
          history: history.map(m => ({ role: m.role.toLowerCase(), content: m.content })),
        })
      );

      const { data } = response;

      // 5. Save AI Response
      const aiMsg = await this.prisma.chatMessage.create({
        data: {
          sessionId,
          role: 'ASSISTANT',
          content: data.answer,
          metadata: { sources: data.sources, suggestions: data.suggested_actions },
        },
      });

      return {
        answer: data.answer,
        suggestions: data.suggested_actions,
        messageId: aiMsg.id,
      };

    } catch (err) {
      this.logger.error(`AI Chat failed: session=${sessionId}`, err);
      return {
        answer: "I'm having trouble connecting to my health knowledge base. Please try again soon.",
        suggestions: ["Try again", "Go to records"],
      };
    }
  }

  async getHistory(userId: string, sessionId: string) {
    return this.prisma.chatMessage.findMany({
      where: { sessionId, session: { userId } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async listSessions(userId: string) {
    return this.prisma.chatSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}
