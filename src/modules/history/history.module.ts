import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefundRequest } from '../../entities/refund-request.entity';
import { RefundCase } from '../../entities/refund-case.entity';
import { HistoryController } from './history.controller';
import { HistoryService } from './history.service';

@Module({
  imports: [TypeOrmModule.forFeature([RefundRequest, RefundCase])],
  controllers: [HistoryController],
  providers: [HistoryService],
})
export class HistoryModule {}
