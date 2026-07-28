// ============================================
// Notification Controller — Token & History
// ============================================

import { Controller, Post, Get, Body, Delete, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/jwt-auth.guard';
import { NotificationService } from './notification.service';
import { PrismaService } from '../../common/database/database.module';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

class RegisterDeviceDto {
  @IsString() @IsNotEmpty() pushToken!: string;
  @IsString() @IsNotEmpty() deviceType!: string;
  @IsString() @IsOptional() deviceName?: string;
}

@ApiTags('notifications')
@ApiBearerAuth()
@Controller({ path: 'notifications', version: '1' })
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('register-device')
  @ApiOperation({ summary: 'Register a device push token' })
  async registerDevice(
    @CurrentUser('sub') userId: string,
    @Body() dto: RegisterDeviceDto,
  ) {
    return this.notificationService.registerDevice(userId, dto);
  }

  @Delete('unregister-device/:token')
  @ApiOperation({ summary: 'Unregister a device push token' })
  async unregisterDevice(@Param('token') token: string) {
    return this.notificationService.unregisterDevice(token);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get notification history' })
  async getHistory(@CurrentUser('sub') userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date(), status: 'READ' },
    });
  }
}
