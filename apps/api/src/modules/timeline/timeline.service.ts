// ============================================
// Timeline Service — Health History Aggregator
// Event Normalization, Sync-on-Write, Retrieval
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/database/database.module';
import { TimelineEventType, Severity } from '@maate/database';
import { RedisService } from '../../common/redis/redis.service';

export interface TimelineFilters {
  page?: number;
  limit?: number;
  type?: TimelineEventType;
  startDate?: string;
  endDate?: string;
  isPinned?: boolean;
}

@Injectable()
export class TimelineService {
  private readonly logger = new Logger(TimelineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Fetches the unified health timeline for a user.
   * Uses a Read-Optimized strategy from the TimelineEvent table.
   */
  async getTimeline(userId: string, filters: TimelineFilters) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const cacheKey = `timeline:${userId}:${JSON.stringify(filters)}`;
    const cachedData = await this.redis.get(cacheKey);
    if (cachedData) return JSON.parse(cachedData);

    const [events, total] = await Promise.all([
      this.prisma.timelineEvent.findMany({
        where: {
          userId,
          isHidden: false,
          ...(filters.type && { eventType: filters.type }),
          ...(filters.isPinned !== undefined && { isPinned: filters.isPinned }),
          ...(filters.startDate && filters.endDate && {
            occurredAt: {
              gte: new Date(filters.startDate),
              lte: new Date(filters.endDate),
            },
          }),
        },
        include: {
          document: true,
        },
        orderBy: [
          { isPinned: 'desc' },
          { occurredAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      this.prisma.timelineEvent.count({
        where: {
          userId,
          isHidden: false,
          ...(filters.type && { eventType: filters.type }),
        },
      }),
    ]);

    const result = {
      data: events,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    // Cache for 2 minutes
    await this.redis.set(cacheKey, JSON.stringify(result), 120);
    
    return result;
  }

  /**
   * Pins or unpins a timeline event for a user.
   * Updates database and invalidates user cache.
   */
  async togglePin(userId: string, eventId: string, isPinned: boolean) {
    const updated = await this.prisma.timelineEvent.updateMany({
      where: {
        id: eventId,
        userId,
      },
      data: {
        isPinned,
      },
    });

    // Invalidate timeline cache
    await this.redis.delByPrefix(`timeline:${userId}`);
    
    return { success: updated.count > 0 };
  }

  /**
   * Internal method to record a new timeline event.
   * Called by other services (Document, Health, Reminder) when data changes.
   */
  async recordEvent(params: {
    userId: string;
    type: TimelineEventType;
    title: string;
    description?: string;
    metadata?: any;
    severity?: Severity;
    refResourceType?: string;
    refResourceId?: string;
    occurredAt?: Date;
  }) {
    const event = await this.prisma.timelineEvent.create({
      data: {
        userId: params.userId,
        eventType: params.type,
        title: params.title,
        description: params.description,
        metadata: params.metadata,
        severity: params.severity,
        refResourceType: params.refResourceType,
        refResourceId: params.refResourceId,
        occurredAt: params.occurredAt || new Date(),
      },
    });

    // Invalidate timeline cache
    await this.redis.delByPrefix(`timeline:${params.userId}`);
    
    return event;
  }

  /**
   * One-time or background job to sync the timeline from legacy/raw tables.
   * Useful for initial migration or consistency checks.
   */
  async fullSync(userId: string) {
    this.logger.log(`Performing full timeline sync for user ${userId}`);
    
    // 1. Sync Documents
    const docs = await this.prisma.document.findMany({ where: { userId } });
    for (const doc of docs) {
      await this.prisma.timelineEvent.upsert({
        where: { id: `doc_${doc.id}` }, // If we use a custom ID scheme or check exists
        create: {
          userId,
          eventType: 'DOCUMENT_UPLOADED',
          title: doc.title || 'Document Uploaded',
          occurredAt: doc.createdAt,
          refResourceType: 'Document',
          refResourceId: doc.id,
        },
        update: {},
      });
    }

    // 2. Sync Medications, Lab Results, etc.
    // ... similar logic
  }
}
