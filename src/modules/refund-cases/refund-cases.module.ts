import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefundCase } from '../../entities/refund-case.entity';
import { RefundCasesService } from './refund-cases.service';
import { RefundCasesController } from './refund-cases.controller';
import { VerificationModule } from '../verification/verification.module';
import { RefundProcessingModule } from '../refund-processing/refund-processing.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RefundCase]),
    VerificationModule,
    RefundProcessingModule,
    AuditLogsModule,
  ],
  controllers: [RefundCasesController],
  providers: [RefundCasesService],
  exports: [RefundCasesService],
})
export class RefundCasesModule {}
