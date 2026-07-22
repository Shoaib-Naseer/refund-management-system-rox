import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { RefundRequest } from '../../entities/refund-request.entity';
import { RefundCase } from '../../entities/refund-case.entity';
import { BulkOperation } from '../../entities/bulk-operation.entity';
import { BulkOperationLog } from '../../entities/bulk-operation-log.entity';
import { RefundRequestsController } from './refund-requests.controller';
import { BulkOperationsController } from './bulk-operations.controller';
import { RefundRequestsService } from './refund-requests.service';
import { RefundProcessor } from './refund.processor';
import { RefundProcessingModule } from '../refund-processing/refund-processing.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RefundRequest, RefundCase, BulkOperation, BulkOperationLog]),
    // Rate-limited queue: max 5 gateway calls per second to prevent rate-limiting
    BullModule.registerQueue({
      name: 'refund-queue',
      limiter: {
        max: 5,       // 5 jobs
        duration: 1000, // per 1000ms (1 second)
        bounceBack: false,
      },
    }),
    RefundProcessingModule,
    AuthModule,
    NotificationsModule,
  ],
  controllers: [RefundRequestsController, BulkOperationsController],
  providers: [RefundRequestsService, RefundProcessor],
})
export class RefundRequestsModule {}
