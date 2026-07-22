import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { RefundRequestsService } from './refund-requests.service';
import { CreateRefundRequestDto } from './dto/create-refund-request.dto';
import { ReviewRefundRequestDto } from './dto/review-refund-request.dto';
import { QueryRefundRequestsDto } from './dto/query-refund-requests.dto';
import { BulkReviewRefundRequestsDto } from './dto/bulk-review-refund-requests.dto';
import { BulkCreateAndRefundDto } from './dto/bulk-create-and-refund.dto';

@Controller('refund-requests')
@UseGuards(JwtAuthGuard)
export class RefundRequestsController {
  constructor(private readonly refundRequestsService: RefundRequestsService) {}

  @Post()
  create(@Body() dto: CreateRefundRequestDto, @CurrentUser() user: any) {
    return this.refundRequestsService.create(dto, user);
  }

  @Get()
  findAll(@Query() query: QueryRefundRequestsDto, @CurrentUser() user: any) {
    return this.refundRequestsService.findAll(query, user);
  }

  // ── Bulk endpoints MUST come before :id routes to avoid NestJS route matching conflicts ──

  @Post('bulk-review')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('refund_requests.review')
  bulkReview(@Body() dto: BulkReviewRefundRequestsDto, @CurrentUser() user: any) {
    return this.refundRequestsService.bulkReview(dto.ids, dto.decision, dto.comment, user);
  }

  @Post('bulk-create-and-refund')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('refund_requests.review')
  bulkCreateAndRefund(@Body() body: BulkCreateAndRefundDto, @CurrentUser() user: any) {
    return this.refundRequestsService.bulkCreateAndRefund(body.records, user, !!body.autoApprove);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.refundRequestsService.findOne(+id);
  }

  @Post(':id/review')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('refund_requests.review')
  review(@Param('id') id: string, @Body() dto: ReviewRefundRequestDto, @CurrentUser() user: any) {
    return this.refundRequestsService.review(+id, dto, user);
  }
}
