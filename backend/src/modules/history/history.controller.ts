import { Controller, Get, Param, Query } from '@nestjs/common';
import { HistoryService } from './history.service';

@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get(':msisdn')
  getHistory(
    @Param('msisdn') msisdn: string,
    @Query('amount') amount?: string,
    @Query('date') date?: string,
    @Query('packageName') packageName?: string,
    @Query('includeEra1') includeEra1?: string,
    @Query('era') era?: string,
  ) {
    const parsedAmount = amount !== undefined && amount !== '' ? Number(amount) : null;
    const parsedDate = date ? new Date(date) : null;

    return this.historyService.getMsisdnHistory(msisdn, {
      amount: Number.isFinite(parsedAmount) ? parsedAmount : null,
      date: parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate : null,
      packageName: packageName || null,
      includeEra1: includeEra1 === 'true',
      era: era || null,
    });
  }
}
