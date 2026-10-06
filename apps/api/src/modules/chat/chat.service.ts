// ============================================
// Chat Service — AI RAG Orchestration
// pgvector Semantic Retrieval & Groq Proxy
// ============================================

import { Injectable, Logger, NotFoundException, ForbiddenException, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../../common/database/database.module';
import { SendMessageDto } from './dto/chat.dto';
import { ConsentService } from '../consent/consent.service';
import { ConsentPurpose } from '../consent/dto/consent.dto';
import { randomUUID } from 'crypto';

interface RetrievedChunk {
  id: string;
  documentId: string;
  documentTitle: string;
  documentType: string;
  documentDate: string | null;
  content: string;
  score: number;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly aiServiceUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly http: HttpService,
    @Optional() private readonly consentService?: ConsentService,
  ) {
    this.aiServiceUrl = this.config.get('AI_SERVICE_URL', 'http://localhost:8001');
  }

  async sendMessage(userId: string, dto: SendMessageDto) {
    // 0. DPDP Purpose-Based Consent Check
    if (this.consentService) {
      const hasChatConsent = await this.consentService.hasConsent(userId, ConsentPurpose.AI_CHAT);
      if (!hasChatConsent) {
        throw new ForbiddenException(
          'AI Chat consent is required to use the conversational assistant. Please grant consent for AI_CHAT in Settings > Privacy & Data Consent under DPDP Act.',
        );
      }
    }

    const sessionId = dto.sessionId || randomUUID();

    // 1. Get or Create Session
    const session = await this.prisma.chatSession.upsert({
      where: { id: sessionId },
      create: {
        id: sessionId,
        userId,
        title: dto.message.slice(0, 50),
        contextType: dto.contextType || 'general',
        contextRefId: dto.contextRefId,
      },
      update: {
        isActive: true,
      },
    });

    // 2. Fetch recent conversation history (last 6 messages)
    const rawHistory = await this.prisma.chatMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'asc' },
      take: 6,
    });

    // 3. Save User Message
    await this.prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: 'USER',
        content: dto.message,
      },
    });

    // 4. Retrieve query embedding from AI Service
    let queryVector: number[] | null = null;
    try {
      const embRes = await firstValueFrom(
        this.http.post<{ data: { embeddings: number[][] } }>(
          `${this.aiServiceUrl}/api/v1/ai/embeddings`,
          { texts: [dto.message] },
          { timeout: 5000 },
        ),
      );
      if (embRes?.data?.data?.embeddings?.[0]) {
        queryVector = embRes.data.data.embeddings[0];
      }
    } catch (embErr: any) {
      this.logger.warn(`Query embedding failed: ${embErr?.message || embErr}`);
    }

    // 5. pgvector Semantic Search (Strictly scoped to userId for 100% Cross-User Isolation)
    let contextChunks: RetrievedChunk[] = [];
    if (queryVector) {
      try {
        const vectorStr = `[${queryVector.join(',')}]`;
        const rawResults: any[] = await this.prisma.$queryRaw`
          SELECT 
            dc.id,
            dc.content,
            d.id as "documentId",
            COALESCE(d.title, 'Medical Document') as "documentTitle",
            d.document_type::text as "documentType",
            d.document_date::text as "documentDate",
            1 - (dc.embedding <=> ${vectorStr}::vector) AS score
          FROM "document_chunks" dc
          JOIN "documents" d ON dc.document_id = d.id
          WHERE d.user_id = ${userId}::uuid
            AND dc.embedding IS NOT NULL
            AND d.deleted_at IS NULL
          ORDER BY dc.embedding <=> ${vectorStr}::vector ASC
          LIMIT 5;
        `;

        contextChunks = rawResults.map((r) => ({
          id: r.id,
          documentId: r.documentId,
          documentTitle: r.documentTitle,
          documentType: r.documentType,
          documentDate: r.documentDate,
          content: r.content,
          score: Number(r.score || 0),
        }));
      } catch (sqlErr: any) {
        this.logger.error(`pgvector retrieval failed: ${sqlErr?.message || sqlErr}`);
      }
    }

    // 6. Fetch structured patient health context
    const [conditions, medications, vitals, user] = await Promise.all([
      this.prisma.chronicCondition.findMany({
        where: { userId, status: 'ACTIVE', deletedAt: null },
        select: { conditionName: true, severity: true },
      }),
      this.prisma.medication.findMany({
        where: { userId, status: 'ACTIVE', deletedAt: null },
        select: { name: true, dosage: true, frequency: true },
      }),
      this.prisma.vitalSign.findMany({
        where: { userId },
        orderBy: { measuredAt: 'desc' },
        take: 4,
        select: { type: true, value: true, unit: true, measuredAt: true },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { allergiesJson: true, bloodGroup: true },
      }),
    ]);

    const vitalsMap: Record<string, string> = {};
    for (const v of vitals) {
      vitalsMap[v.type] = `${v.value} ${v.unit}`;
    }

    const healthProfile = {
      conditions: conditions.map((c) => c.conditionName),
      medications: medications.map((m) => `${m.name} (${m.dosage})`),
      latest_vitals: vitalsMap,
      allergies: Array.isArray(user?.allergiesJson) ? (user?.allergiesJson as string[]) : [],
    };

    // 7. Call AI Service Chat Engine
    try {
      const response = await firstValueFrom(
        this.http.post<any>(`${this.aiServiceUrl}/api/v1/ai/chat`, {
          session_id: session.id,
          user_id: userId,
          message: dto.message,
          history: rawHistory.map((m) => ({
            role: m.role.toLowerCase(),
            content: m.content,
          })),
          context_chunks: contextChunks,
          health_profile: healthProfile,
          context_type: dto.contextType || 'general',
          context_ref_id: dto.contextRefId,
        }),
      );

      const aiData = response.data?.data || response.data;
      const content = aiData.content || aiData.answer || 'I am ready to help with your health questions.';
      const metadata = aiData.metadata || {};

      // 8. Save AI Response
      const aiMsg = await this.prisma.chatMessage.create({
        data: {
          sessionId: session.id,
          role: 'ASSISTANT',
          content,
          metadata: {
            sources: metadata.sources || [],
            suggestions: metadata.suggestions || [],
            is_emergency: metadata.is_emergency || false,
            model: metadata.model || 'groq',
          },
        },
      });

      return {
        answer: content,
        suggestions: metadata.suggestions || [],
        sources: metadata.sources || [],
        messageId: aiMsg.id,
        sessionId: session.id,
        isEmergency: metadata.is_emergency || false,
      };
    } catch (err: any) {
      this.logger.error(`AI Chat completion failed: session=${session.id}`, err?.message || err);
      const fallbackContent =
        "I'm having trouble connecting to my health knowledge base. Please try again soon.";
      const aiMsg = await this.prisma.chatMessage.create({
        data: {
          sessionId: session.id,
          role: 'ASSISTANT',
          content: fallbackContent,
          metadata: { sources: [], suggestions: ['Try again', 'View records'] },
        },
      });

      return {
        answer: fallbackContent,
        suggestions: ['Try again', 'View records'],
        sources: [],
        messageId: aiMsg.id,
        sessionId: session.id,
        isEmergency: false,
      };
    }
  }

  async getHistory(userId: string, sessionId: string) {
    const session = await this.prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) {
      return [];
    }

    return this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async listSessions(userId: string) {
    return this.prisma.chatSession.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async deleteSession(userId: string, sessionId: string) {
    const session = await this.prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    await this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { isActive: false },
    });

    return { success: true, message: 'Chat session archived' };
  }
}
