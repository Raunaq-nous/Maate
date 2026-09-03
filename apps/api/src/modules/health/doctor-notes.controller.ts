// ============================================
// Doctor Notes Controller — Clinical Encounters
// ============================================

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/jwt-auth.guard';
import { PrismaService } from '../../common/database/database.module';
import { TimelineService } from '../timeline/timeline.service';
import { CreateDoctorNoteDto } from './dto/health.dto';
import { TimelineEventType } from '@maate/database';

@ApiTags('doctor-notes')
@ApiBearerAuth()
@Controller({ path: 'doctor-notes', version: '1' })
export class DoctorNotesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timelineService: TimelineService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Record a clinical doctor note' })
  async createDoctorNote(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateDoctorNoteDto,
  ) {
    const patientId = dto.patientId || userId;

    const note = await this.prisma.doctorNote.create({
      data: {
        patientId,
        authorId: userId,
        noteType: dto.noteType,
        title: dto.title,
        subjective: dto.subjective,
        objective: dto.objective,
        assessment: dto.assessment,
        plan: dto.plan,
        icdCodes: dto.icdCodes || [],
        cptCodes: dto.cptCodes || [],
        followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : null,
        isConfidential: dto.isConfidential || false,
      },
    });

    // Auto-record TimelineEvent
    await this.timelineService.recordEvent({
      userId: patientId,
      type: TimelineEventType.DOCTOR_VISIT,
      title: dto.title || `Doctor Note (${dto.noteType})`,
      description: dto.assessment || dto.subjective || dto.plan || 'Clinical consultation note recorded.',
      refResourceType: 'DoctorNote',
      refResourceId: note.id,
      occurredAt: new Date(),
      metadata: {
        noteType: dto.noteType,
        followUpDate: dto.followUpDate,
        icdCodes: dto.icdCodes,
      },
    });

    return { success: true, data: note };
  }

  @Get()
  @ApiOperation({ summary: 'List doctor notes for current user' })
  async getDoctorNotes(@CurrentUser('sub') userId: string) {
    const notes = await this.prisma.doctorNote.findMany({
      where: {
        patientId: userId,
        deletedAt: null,
      },
      include: {
        author: {
          select: { id: true, fullName: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { data: notes };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single doctor note' })
  async getDoctorNote(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    const note = await this.prisma.doctorNote.findFirst({
      where: {
        id,
        patientId: userId,
        deletedAt: null,
      },
      include: {
        author: {
          select: { id: true, fullName: true, avatarUrl: true },
        },
      },
    });

    if (!note) return { success: false, message: 'Note not found' };
    return { data: note };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete doctor note' })
  async deleteDoctorNote(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    const deleted = await this.prisma.doctorNote.updateMany({
      where: { id, patientId: userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    return { success: deleted.count > 0 };
  }
}
