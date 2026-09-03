// ============================================
// Analytics Service — Aggregation Pipeline
// Computes health scores, trends, and adherence
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/database/database.module';
import { RedisService } from '../../common/redis/redis.service';
import { subDays, subMonths, startOfDay, endOfDay, format } from 'date-fns';
import { VitalType } from '@maate/database';
import { QueryTrendsDto } from './dto/health.dto';

export type PeriodKey = '7D' | '1M' | '3M' | '6M' | '1Y';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Main dashboard aggregator — returns every metric the UI needs.
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

    // Cache for 2 minutes
    await this.redis.set(cacheKey, JSON.stringify(result), 120);
    return result;
  }

  /**
   * Returns time-series trends for charting individual vitals or parameters.
   */
  async getTrends(userId: string, query: QueryTrendsDto) {
    const period = query.period || '3M';
    const { start, end } = this.periodToDates(period);

    if (query.vitalType) {
      const readings = await this.prisma.vitalSign.findMany({
        where: {
          userId,
          type: query.vitalType,
          measuredAt: { gte: start, lte: end },
        },
        orderBy: { measuredAt: 'asc' },
      });

      const values = readings.map((r) => r.value);
      const min = values.length ? Math.min(...values) : 0;
      const max = values.length ? Math.max(...values) : 0;
      const avg = values.length ? +(values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : 0;
      const latest = readings.length ? readings[readings.length - 1] : null;

      return {
        type: query.vitalType,
        period,
        unit: latest?.unit || '',
        count: readings.length,
        summary: { min, max, avg, latestValue: latest?.value ?? null },
        dataPoints: readings.map((r) => ({
          id: r.id,
          date: format(r.measuredAt, 'yyyy-MM-dd'),
          timestamp: r.measuredAt,
          value: r.value,
          valueSecondary: r.valueSecondary,
          status: r.status,
          notes: r.notes,
        })),
      };
    }

    if (query.parameterName) {
      const records = await this.prisma.labParameter.findMany({
        where: {
          parameterName: { contains: query.parameterName, mode: 'insensitive' },
          labReport: {
            userId,
            reportDate: { gte: start, lte: end },
          },
        },
        include: { labReport: true },
        orderBy: { labReport: { reportDate: 'asc' } },
      });

      return {
        parameterName: query.parameterName,
        period,
        count: records.length,
        dataPoints: records.map((r) => ({
          date: format(r.labReport.reportDate, 'yyyy-MM-dd'),
          value: r.value,
          unit: r.unit,
          referenceRange: r.referenceRange,
          isAbnormal: r.isAbnormal,
        })),
      };
    }

    // Default: return all active vital signs overview
    return this.getHealthTrends(userId, start, end);
  }

  // ─── Medication Adherence ─────────────────
  async getMedicationAdherence(userId: string, start: Date, end: Date) {
    const logs = await this.prisma.reminderLog.findMany({
      where: {
        userId,
        reminderType: 'MEDICINE',
        scheduledAt: { gte: start, lte: end },
      },
    });

    const total = logs.length;
    const taken = logs.filter((l) => l.response === 'TAKEN').length;
    const skipped = logs.filter((l) => l.response === 'SKIPPED').length;
    const missed = total - taken - skipped;
    const rate = total > 0 ? Math.round((taken / total) * 100) : 100;

    // Daily breakdown for chart
    const dailyMap = new Map<string, { taken: number; total: number }>();
    logs.forEach((l) => {
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
  async getWaterIntake(userId: string, start: Date, end: Date) {
    const logs = await this.prisma.reminderLog.findMany({
      where: {
        userId,
        reminderType: 'WATER',
        response: 'TAKEN',
        scheduledAt: { gte: start, lte: end },
      },
    });

    const glassSize = 250;
    const dailyMap = new Map<string, number>();
    logs.forEach((l) => {
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
  async getSleepTrends(userId: string, start: Date, end: Date) {
    const sleepRecords = await this.prisma.vitalSign.findMany({
      where: {
        userId,
        type: VitalType.SLEEP_HOURS,
        measuredAt: { gte: start, lte: end },
      },
      orderBy: { measuredAt: 'asc' },
    });

    const values = sleepRecords.map((r) => r.value);
    const avg = values.length > 0 ? +(values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : 0;
    const best = values.length > 0 ? +Math.max(...values).toFixed(1) : 0;
    const worst = values.length > 0 ? +Math.min(...values).toFixed(1) : 0;

    return {
      avgHours: avg,
      bestHours: best,
      worstHours: worst,
      dailyChart: sleepRecords.map((r) => ({
        date: format(r.measuredAt, 'yyyy-MM-dd'),
        hours: r.value,
      })),
    };
  }

  // ─── Health & Biomarker Trends ────────────
  async getHealthTrends(userId: string, start: Date, end: Date) {
    const trends: any[] = [];

    // 1. Vital Signs: Blood Pressure
    const bpReadings = await this.prisma.vitalSign.findMany({
      where: {
        userId,
        type: VitalType.BLOOD_PRESSURE,
        measuredAt: { gte: start, lte: end },
      },
      orderBy: { measuredAt: 'asc' },
      take: 20,
    });
    if (bpReadings.length > 0) {
      const latest = bpReadings[bpReadings.length - 1]!;
      const prev = bpReadings.length >= 2 ? bpReadings[bpReadings.length - 2] : null;
      const diff = prev ? +(latest.value - prev.value).toFixed(1) : 0;
      trends.push({
        parameter: 'Blood Pressure',
        value: `${latest.value}${latest.valueSecondary ? `/${latest.valueSecondary}` : ''}`,
        unit: latest.unit || 'mmHg',
        referenceRange: '120/80',
        isAbnormal: latest.status !== 'NORMAL',
        status: latest.status === 'NORMAL' ? 'normal' : latest.status === 'CRITICAL' || latest.status === 'HIGH' ? 'high' : 'low',
        trend: diff > 0 ? `+${diff}` : `${diff}`,
        trendDirection: diff > 0 ? 'UP' : diff < 0 ? 'DOWN' : 'STABLE',
        sparkline: bpReadings.map((r) => r.value),
      });
    }

    // 2. Vital Signs: Heart Rate
    const hrReadings = await this.prisma.vitalSign.findMany({
      where: {
        userId,
        type: VitalType.HEART_RATE,
        measuredAt: { gte: start, lte: end },
      },
      orderBy: { measuredAt: 'asc' },
      take: 20,
    });
    if (hrReadings.length > 0) {
      const latest = hrReadings[hrReadings.length - 1]!;
      const prev = hrReadings.length >= 2 ? hrReadings[hrReadings.length - 2] : null;
      const diff = prev ? +(latest.value - prev.value).toFixed(1) : 0;
      trends.push({
        parameter: 'Heart Rate',
        value: `${latest.value}`,
        unit: latest.unit || 'bpm',
        referenceRange: '60-100',
        isAbnormal: latest.status !== 'NORMAL',
        status: latest.status === 'NORMAL' ? 'normal' : latest.status === 'HIGH' ? 'high' : 'low',
        trend: diff > 0 ? `+${diff}` : `${diff}`,
        trendDirection: diff > 0 ? 'UP' : diff < 0 ? 'DOWN' : 'STABLE',
        sparkline: hrReadings.map((r) => r.value),
      });
    }

    // 3. Vital Signs: Blood Sugar
    const sugarReadings = await this.prisma.vitalSign.findMany({
      where: {
        userId,
        type: VitalType.BLOOD_SUGAR,
        measuredAt: { gte: start, lte: end },
      },
      orderBy: { measuredAt: 'asc' },
      take: 20,
    });
    if (sugarReadings.length > 0) {
      const latest = sugarReadings[sugarReadings.length - 1]!;
      const prev = sugarReadings.length >= 2 ? sugarReadings[sugarReadings.length - 2] : null;
      const diff = prev ? +(latest.value - prev.value).toFixed(1) : 0;
      trends.push({
        parameter: 'Blood Sugar',
        value: `${latest.value}`,
        unit: latest.unit || 'mg/dL',
        referenceRange: '70-140',
        isAbnormal: latest.status !== 'NORMAL',
        status: latest.status === 'NORMAL' ? 'normal' : latest.status === 'HIGH' ? 'high' : 'low',
        trend: diff > 0 ? `+${diff}` : `${diff}`,
        trendDirection: diff > 0 ? 'UP' : diff < 0 ? 'DOWN' : 'STABLE',
        sparkline: sugarReadings.map((r) => r.value),
      });
    }

    // 4. Lab Parameters from reports
    const keyLabParams = ['Hemoglobin', 'Blood Sugar', 'Cholesterol', 'Creatinine'];
    for (const paramName of keyLabParams) {
      // If we already added from vitals, skip duplicate
      if (paramName === 'Blood Sugar' && sugarReadings.length > 0) continue;

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

      if (records.length > 0) {
        const latest = records[records.length - 1]!;
        const previous = records.length >= 2 ? records[records.length - 2] : null;
        const latestVal = parseFloat(latest.value) || 0;
        const prevVal = previous ? parseFloat(previous.value) || null : null;
        const diff = prevVal !== null ? +(latestVal - prevVal).toFixed(1) : 0;

        trends.push({
          parameter: paramName,
          value: latest.value,
          unit: latest.unit || '',
          referenceRange: latest.referenceRange || '',
          isAbnormal: latest.isAbnormal,
          status: latest.isAbnormal ? (diff > 0 ? 'high' : 'low') : 'normal',
          trend: diff > 0 ? `+${diff}` : `${diff}`,
          trendDirection: diff > 0 ? 'UP' : diff < 0 ? 'DOWN' : 'STABLE',
          sparkline: records.map((r) => parseFloat(r.value) || 0),
        });
      }
    }

    return trends;
  }

  // ─── Composite Health Score ───────────────
  async computeHealthScore(userId: string, start: Date, end: Date) {
    const adherence = await this.getMedicationAdherence(userId, start, end);
    const adherenceScore = adherence.rate; // 0-100

    const abnormalLabs = await this.prisma.labParameter.count({
      where: {
        isAbnormal: true,
        labReport: { userId, reportDate: { gte: start, lte: end } },
      },
    });

    const abnormalVitals = await this.prisma.vitalSign.count({
      where: {
        userId,
        status: { in: ['HIGH', 'LOW', 'CRITICAL'] },
        measuredAt: { gte: start, lte: end },
      },
    });

    const penalty = abnormalLabs * 8 + abnormalVitals * 5;
    const labScore = Math.max(0, 100 - penalty);

    const score = Math.round(adherenceScore * 0.45 + labScore * 0.4 + 85 * 0.15);

    return {
      score: Math.min(100, Math.max(0, score)),
      breakdown: {
        adherence: { weight: 45, value: adherenceScore },
        labResults: { weight: 40, value: labScore },
        activity: { weight: 15, value: 85 },
      },
    };
  }

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
