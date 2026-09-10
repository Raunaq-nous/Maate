import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ description: 'User message or clinical question', example: 'What was my last HbA1c result?' })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiPropertyOptional({ description: 'Optional Chat session UUID. If omitted, an active session is used or created.' })
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Context type filter (e.g. general, document, medication)', example: 'general' })
  @IsOptional()
  @IsString()
  contextType?: string;

  @ApiPropertyOptional({ description: 'Reference ID for focused context (e.g. specific documentId)' })
  @IsOptional()
  @IsUUID()
  contextRefId?: string;
}
