// ============================================
// Storage Module — S3 + Processing Pipeline
// ============================================

import { Global, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { StorageService } from './storage.service';
import { FileProcessingService } from './file-processing.service';

@Global()
@Module({
  imports: [HttpModule],
  providers: [StorageService, FileProcessingService],
  exports: [StorageService, FileProcessingService],
})
export class StorageModule {}
