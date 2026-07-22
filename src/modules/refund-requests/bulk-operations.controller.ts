import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BulkOperation } from '../../entities/bulk-operation.entity';
import { BulkOperationLog } from '../../entities/bulk-operation-log.entity';

@Controller('bulk-operations')
@UseGuards(JwtAuthGuard)
export class BulkOperationsController {
  constructor(
    @InjectRepository(BulkOperation)
    private readonly bulkOperationRepo: Repository<BulkOperation>,
    @InjectRepository(BulkOperationLog)
    private readonly bulkOperationLogRepo: Repository<BulkOperationLog>,
  ) {}

  /**
   * GET /api/bulk-operations/:id
   * Returns the current state of a bulk operation (for initial load / manual polling).
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const op = await this.bulkOperationRepo.findOne({ where: { id: +id } });
    if (!op) {
      return { error: `Bulk operation #${id} not found` };
    }
    const logs = await this.bulkOperationLogRepo.find({
      where: { bulkOperationId: op.id },
      order: { createdAt: 'ASC' },
    });
    return {
      ...op,
      logs: logs.map(l => l.message),
    };
  }

  /**
   * GET /api/bulk-operations/:id/stream
   *
   * Opens a Server-Sent Events (SSE) connection. The backend pushes a live
   * JSON progress snapshot every second until the batch is completed or failed.
   *
   * Frontend usage:
   *   const src = new EventSource('/api/bulk-operations/8/stream');
   *   src.onmessage = (e) => {
   *     const progress = JSON.parse(e.data);
   *     // { id, status, total, processed, success, failed, percentage }
   *   };
   *   src.addEventListener('done', () => src.close());
   */
  @Get(':id/stream')
  async streamProgress(@Param('id') id: string, @Res() res: Response) {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering if behind proxy
    res.flushHeaders();

    const send = (eventName: string, data: object) => {
      res.write(`event: ${eventName}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const POLL_INTERVAL_MS = 1000; // Push update every 1 second

    const interval = setInterval(async () => {
      try {
        const op = await this.bulkOperationRepo.findOne({ where: { id: +id } });

        if (!op) {
          send('error', { message: `Bulk operation #${id} not found` });
          clearInterval(interval);
          res.end();
          return;
        }

        const logs = await this.bulkOperationLogRepo.find({
          where: { bulkOperationId: op.id },
          order: { createdAt: 'ASC' },
        });

        // Push the current snapshot as a standard 'message' event
        send('message', {
          id: op.id,
          status: op.status,
          total: op.totalCases,
          processed: op.processedCases,
          success: op.successfulRefunds,
          failed: op.failedRefunds,
          percentage: Number(op.progressPercentage),
          currentlyProcessingRef: op.currentlyProcessingRef,
          logs: logs.map(l => l.message),
        });

        // If batch is done, fire a 'done' event so the frontend can close the stream
        if (op.status === 'completed' || op.status === 'failed') {
          send('done', { status: op.status, completedAt: op.completedAt });
          clearInterval(interval);
          res.end();
        }
      } catch (error) {
        send('error', { message: error.message });
        clearInterval(interval);
        res.end();
      }
    }, POLL_INTERVAL_MS);

    // Clean up if the client disconnects (e.g., closes the browser tab)
    res.on('close', () => {
      clearInterval(interval);
    });
  }
}
