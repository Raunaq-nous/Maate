import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  MinLength,
  MaxLength,
  IsDateString,
  Min,
  Max,
} from "class-validator";
import { Gender } from "@maate/database";

export class UpdateUserDto {
  @ApiPropertyOptional({ example: "Priya Sharma" })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @IsOptional()
  fullName?: string;

  @ApiPropertyOptional({ example: "1990-05-15" })
  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @ApiPropertyOptional({ enum: Gender })
  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @ApiPropertyOptional({ example: "O+" })
  @IsString()
  @MaxLength(5)
  @IsOptional()
  bloodGroup?: string;

  @ApiPropertyOptional({ example: "https://example.com/avatar.jpg" })
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: "en-IN" })
  @IsString()
  @MaxLength(10)
  @IsOptional()
  locale?: string;

  @ApiPropertyOptional({ example: "Asia/Kolkata" })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  timezone?: string;

  @ApiPropertyOptional({ example: 165 })
  @IsNumber()
  @Min(30)
  @Max(250)
  @IsOptional()
  heightCm?: number;

  @ApiPropertyOptional({ example: 62.5 })
  @IsNumber()
  @Min(2)
  @Max(300)
  @IsOptional()
  weightKg?: number;

  @ApiPropertyOptional({ example: "+919876543210" })
  @IsString()
  @MaxLength(20)
  @IsOptional()
  emergencyContact?: string;

  @ApiPropertyOptional({ example: ["Peanuts", "Penicillin"] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allergiesJson?: string[];
}
