import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEmail,
  IsArray,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export class CreateDoctorShareDto {
  @ApiPropertyOptional({ description: 'Name of physician or clinic' })
  @IsString()
  @IsOptional()
  doctorName?: string;

  @ApiPropertyOptional({ description: 'Doctor contact email' })
  @IsEmail()
  @IsOptional()
  doctorEmail?: string;

  @ApiPropertyOptional({ description: 'Doctor phone number' })
  @IsString()
  @IsOptional()
  doctorPhone?: string;

  @ApiPropertyOptional({ description: 'Expiration in days (default: 7, max: 90)' })
  @IsInt()
  @Min(1)
  @Max(90)
  @IsOptional()
  expiresInDays?: number;

  @ApiPropertyOptional({
    type: [String],
    description: 'Scoped resource types to share',
    default: ['lab_reports', 'prescriptions', 'vitals', 'timeline'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  sharedResources?: string[];

  @ApiPropertyOptional({ description: 'Access level', default: 'read_only' })
  @IsString()
  @IsOptional()
  accessLevel?: string;
}
