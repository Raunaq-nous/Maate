import { Global, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { StorageService } from './storage.service';
import { FileProcessingService } from './file-processing.service';
import { DocumentProcessor } from './document.processor';

@Global()
@Module({
  imports: [
    HttpModule,
    BullModule.registerQueue({
      name: 'document-processing',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: false,
      },
    }),
  ],
  providers: [StorageService, FileProcessingService, DocumentProcessor],
  exports: [StorageService, FileProcessingService, BullModule],
})
export class StorageModule {}
