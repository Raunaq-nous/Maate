// ============================================
// Analytics Service — Aggregation Pipeline
// Computes health scores, trends, and adherence
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/database/database.module';
import { RedisService } from '../../common/redis/redis.service';
import { subDays, subMonths, startOfDay, endOfDay, format } from 'date-fns';

export type PeriodKey = '7D' | '1M' | '3M' | '6M' | '1Y';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Main dashboard aggregator — returns every metric the mobile UI needs.
   */
  async getDashboard(userId: string, period: PeriodKey) {
    const cacheKey = `analytics:${userId}:${period}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const { start, end } = this.periodToDates(period);

    const [adherence, waterIntake, sleepTrends, healthTrends, healthScore] = await Promise.all([
      this.getMedicationAdherence(userId, start, end),
      this.getWaterIntake(userId, start, end),
      this.getSleepTrends(userId, start, end),
      this.getHealthTrends(userId, start, end),
      this.computeHealthScore(userId, start, end),
    ]);

    const result = {
      period,
      adherence,
      waterIntake,
      sleepTrends,
      healthTrends,
      healthScore,
    };

    // Cache for 5 minutes
    await this.redis.set(cacheKey, JSON.stringify(result), 300);
    return result;
  }

  // ─── Medication Adherence ─────────────────
  private async getMedicationAdherence(userId: string, start: Date, end: Date) {
    const logs = await this.prisma.reminderLog.findMany({
      where: {
        userId,
        reminderType: 'MEDICINE',
        scheduledAt: { gte: start, lte: end },
      },
    });

    const total = logs.length;
    const taken = logs.filter(l => l.response === 'TAKEN').length;
    const skipped = logs.filter(l => l.response === 'SKIPPED').length;
    const missed = total - taken - skipped;
    const rate = total > 0 ? Math.round((taken / total) * 100) : 100;

    // Daily breakdown for chart
    const dailyMap = new Map<string, { taken: number; total: number }>();
    logs.forEach(l => {
      const day = format(l.scheduledAt, 'yyyy-MM-dd');
      const entry = dailyMap.get(day) || { taken: 0, total: 0 };
      entry.total += 1;
      if (l.response === 'TAKEN') entry.taken += 1;
      dailyMap.set(day, entry);
    });

    const dailyChart = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        date,
        rate: v.total > 0 ? Math.round((v.taken / v.total) * 100) : 0,
      }));

    return { rate, taken, skipped, missed, total, dailyChart };
  }

  // ─── Water Intake ─────────────────────────
  private async getWaterIntake(userId: string, start: Date, end: Date) {
    const logs = await this.prisma.reminderLog.findMany({
      where: {
        userId,
        reminderType: 'WATER',
        response: 'TAKEN',
        scheduledAt: { gte: start, lte: end },
      },
    });

    // Each "TAKEN" log = ~250ml glass
    const glassSize = 250;
    const dailyMap = new Map<string, number>();
    logs.forEach(l => {
      const day = format(l.scheduledAt, 'yyyy-MM-dd');
      dailyMap.set(day, (dailyMap.get(day) || 0) + glassSize);
    });

    const entries = Array.from(dailyMap.entries()).sort(([a], [b]) => a.localeCompare(b));
    const totalDays = entries.length || 1;
    const totalMl = entries.reduce((s, [, v]) => s + v, 0);
    const avgMl = Math.round(totalMl / totalDays);
    const bestMl = Math.max(0, ...entries.map(([, v]) => v));
    const goalHits = entries.filter(([, v]) => v >= 2500).length;

    return {
      avgLitres: (avgMl / 1000).toFixed(1),
      bestLitres: (bestMl / 1000).toFixed(1),
      goalHitDays: goalHits,
      totalDays,
      dailyChart: entries.map(([date, ml]) => ({ date, litres: +(ml / 1000).toFixed(1) })),
    };
  }

  // ─── Sleep Trends ─────────────────────────
  private async getSleepTrends(userId: string, start: Date, end: Date) {
    // Sleep data from vitals (type=SLEEP)
    const sleepRecords = await this.prisma.vitalSign.findMany({
      where: {
        userId,
        type: 'SLEEP_HOURS',
        measuredAt: { gte: start, lte: end },
      },
      orderBy: { measuredAt: 'asc' },
    });

    const values = sleepRecords.map(r => r.value);
    const avg = values.length > 0 ? +(values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : 0;
    const best = values.length > 0 ? +Math.max(...values).toFixed(1) : 0;
    const worst = values.length > 0 ? +Math.min(...values).toFixed(1) : 0;

    return {
      avgHours: avg,
      bestHours: best,
      worstHours: worst,
      dailyChart: sleepRecords.map(r => ({
        date: format(r.measuredAt, 'yyyy-MM-dd'),
        hours: r.value,
      })),
    };
  }

  // ─── Abnormal Report Trends ───────────────
  private async getHealthTrends(userId: string, start: Date, end: Date) {
    // Aggregate lab parameters over time for key biomarkers
    const keyParams = ['Hemoglobin', 'Blood Sugar', 'Blood Pressure Systolic', 'Cholesterol'];

    const trends = await Promise.all(
      keyParams.map(async (paramName) => {
        const records = await this.prisma.labParameter.findMany({
          where: {
            parameterName: { contains: paramName, mode: 'insensitive' },
            labReport: {
              userId,
              reportDate: { gte: start, lte: end },
            },
          },
          include: { labReport: true },
          orderBy: { labReport: { reportDate: 'asc' } },
          take: 20,
        });

        const latest = records[records.length - 1];
        const previous = records.length >= 2 ? records[records.length - 2] : null;
        const latestVal = latest ? parseFloat(latest.value) : 0;
        const prevVal = previous ? parseFloat(previous.value) : null;
        const diff = prevVal !== null ? +(latestVal - prevVal).toFixed(1) : 0;

        if (!latest) return null;

        return {
          parameter: paramName,
          value: latest.value,
          unit: latest.unit || '',
          referenceRange: latest.referenceRange || '',
          isAbnormal: latest.isAbnormal,
          status: latest.isAbnormal ? (diff > 0 ? 'high' : 'low') : 'normal',
          trend: diff > 0 ? `+${diff}` : `${diff}`,
          trendDirection: diff > 0 ? 'UP' : diff < 0 ? 'DOWN' : 'STABLE',
          sparkline: records.map(r => parseFloat(r.value)),
        };
      })
    );

    return trends.filter(Boolean);
  }

  // ─── Composite Health Score ───────────────
  private async computeHealthScore(userId: string, start: Date, end: Date) {
    // Weighted composite score (0-100)
    const adherence = await this.getMedicationAdherence(userId, start, end);
    const adherenceScore = adherence.rate; // 0-100

    // Abnormal labs penalty
    const abnormalCount = await this.prisma.labParameter.count({
      where: {
        isAbnormal: true,
        labReport: { userId, reportDate: { gte: start, lte: end } },
      },
    });
    const labScore = Math.max(0, 100 - abnormalCount * 10);

    // Weights: adherence 40%, labs 40%, activity 20%
    const score = Math.round(adherenceScore * 0.4 + labScore * 0.4 + 80 * 0.2);

    return {
      score: Math.min(100, Math.max(0, score)),
      breakdown: {
        adherence: { weight: 40, value: adherenceScore },
        labResults: { weight: 40, value: labScore },
        activity: { weight: 20, value: 80 }, // Placeholder until activity tracking
      },
    };
  }

  // ─── Utility ──────────────────────────────
  private periodToDates(period: PeriodKey): { start: Date; end: Date } {
    const end = endOfDay(new Date());
    let start: Date;
    switch (period) {
      case '7D':  start = startOfDay(subDays(end, 7)); break;
      case '1M':  start = startOfDay(subMonths(end, 1)); break;
      case '3M':  start = startOfDay(subMonths(end, 3)); break;
      case '6M':  start = startOfDay(subMonths(end, 6)); break;
      case '1Y':  start = startOfDay(subMonths(end, 12)); break;
      default:    start = startOfDay(subMonths(end, 3));
    }
    return { start, end };
  }
}
