import { Controller, Get, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('eligible/old')
  getEligibleOld(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('packageName') packageName?: string,
    @Query('refundStatus') refundStatus?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number = 50,
  ) {
    return this.subscriptionsService.getEligibleOldSubscriptions({
      dateFrom,
      dateTo,
      paymentMethod,
      packageName,
      refundStatus,
      page,
      limit: Math.min(limit, 200),
    });
  }

  @Get('eligible/new')
  getEligibleNew(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('packageName') packageName?: string,
    @Query('refundStatus') refundStatus?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number = 50,
  ) {
    return this.subscriptionsService.getEligibleNewSubscriptions({
      dateFrom,
      dateTo,
      paymentMethod,
      packageName,
      refundStatus,
      page,
      limit: Math.min(limit, 200),
    });
  }

  @Get('eligible/all')
  getEligibleAll(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('packageName') packageName?: string,
    @Query('refundStatus') refundStatus?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number = 50,
  ) {
    return this.subscriptionsService.getEligibleAllSubscriptions({
      dateFrom,
      dateTo,
      paymentMethod,
      packageName,
      refundStatus,
      page,
      limit: Math.min(limit, 200),
    });
  }

  @Get('processed/old')
  getProcessedOld(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('refundedAtFrom') refundedAtFrom?: string,
    @Query('refundedAtTo') refundedAtTo?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('packageName') packageName?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number = 50,
  ) {
    return this.subscriptionsService.getProcessedSubscriptions({
      dateFrom,
      dateTo,
      refundedAtFrom,
      refundedAtTo,
      paymentMethod,
      packageName,
      page,
      limit: Math.min(limit, 200),
    }, 2);
  }

  @Get('processed/new')
  getProcessedNew(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('refundedAtFrom') refundedAtFrom?: string,
    @Query('refundedAtTo') refundedAtTo?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('packageName') packageName?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number = 50,
  ) {
    return this.subscriptionsService.getProcessedSubscriptions({
      dateFrom,
      dateTo,
      refundedAtFrom,
      refundedAtTo,
      paymentMethod,
      packageName,
      page,
      limit: Math.min(limit, 200),
    }, 3);
  }

  @Get('processed/all')
  getProcessedAll(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('refundedAtFrom') refundedAtFrom?: string,
    @Query('refundedAtTo') refundedAtTo?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('packageName') packageName?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number = 50,
  ) {
    return this.subscriptionsService.getProcessedSubscriptions({
      dateFrom,
      dateTo,
      refundedAtFrom,
      refundedAtTo,
      paymentMethod,
      packageName,
      page,
      limit: Math.min(limit, 200),
    });
  }
}
