import { Module } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { InquiryService } from './inquiry-service';

@Module({
  providers: [VerificationService, InquiryService],
  exports: [VerificationService, InquiryService],
})
export class VerificationModule {}
