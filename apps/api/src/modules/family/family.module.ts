// ============================================
// Family Module — Collaborative Health Care
// ============================================

import { Module, Global } from '@nestjs/common';
import { FamilyController } from './family.controller';
import { FamilyService } from './family.service';

@Global()
@Module({
  controllers: [FamilyController],
  providers: [FamilyService],
  exports: [FamilyService],
})
export class FamilyModule {}
