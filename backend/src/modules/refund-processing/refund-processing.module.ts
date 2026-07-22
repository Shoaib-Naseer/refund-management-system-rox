import { Module } from '@nestjs/common';
import { RefundProcessingService } from './refund-processing.service';

@Module({
  providers: [RefundProcessingService],
  exports: [RefundProcessingService],
})
export class RefundProcessingModule {}
