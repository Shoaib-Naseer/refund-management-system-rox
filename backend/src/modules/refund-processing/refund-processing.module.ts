import { Module } from '@nestjs/common';
import { RefundProcessingService } from './refund-processing.service';
import { VerificationModule } from '../verification/verification.module';

@Module({
  imports: [VerificationModule],
  providers: [RefundProcessingService],
  exports: [RefundProcessingService],
})
export class RefundProcessingModule {}
