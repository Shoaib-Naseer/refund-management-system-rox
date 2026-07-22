import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { RefundCasesService } from './refund-cases.service';
import { CreateRefundCaseDto } from './dto/create-refund-case.dto';
import { QueryRefundCasesDto } from './dto/query-refund-cases.dto';

@Controller('cases')
export class RefundCasesController {
  constructor(private readonly refundCasesService: RefundCasesService) {}

  @Post()
  create(@Body() createDto: CreateRefundCaseDto, @Req() req: any) {
    const userContext = {
      username: req.user?.username || 'system',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.refundCasesService.create(createDto, userContext);
  }

  @Get()
  findAll(@Query() queryDto: QueryRefundCasesDto) {
    return this.refundCasesService.findAll(queryDto);
  }

  @Get('by-msisdn/:msisdn')
  findAllByMsisdn(@Param('msisdn') msisdn: string) {
    return this.refundCasesService.findAllByMsisdn(msisdn);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.refundCasesService.findOne(+id);
  }

  @Post(':id/verify')
  verifyCase(@Param('id') id: string, @Req() req: any) {
    const userContext = {
      username: req.user?.username || 'system',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.refundCasesService.verifyCase(+id, userContext);
  }

  @Post(':id/refund')
  processRefund(@Param('id') id: string, @Req() req: any) {
    const userContext = {
      username: req.user?.username || 'system',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.refundCasesService.processRefund(+id, userContext);
  }
}
