import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefundRequest } from '../../entities/refund-request.entity';
import { RefundCase } from '../../entities/refund-case.entity';
import { HistoryController } from './history.controller';
import { HistoryService } from './history.service';
import { VerificationModule } from '../verification/verification.module';

@Module({
  imports: [TypeOrmModule.forFeature([RefundRequest, RefundCase]), VerificationModule],
  controllers: [HistoryController],
  providers: [HistoryService],
})
export class HistoryModule {}
