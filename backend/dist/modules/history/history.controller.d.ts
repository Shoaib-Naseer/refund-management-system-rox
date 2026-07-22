import { HistoryService } from './history.service';
export declare class HistoryController {
    private readonly historyService;
    constructor(historyService: HistoryService);
    getHistory(msisdn: string, amount?: string, date?: string, packageName?: string, includeEra1?: string, era?: string): Promise<import("./history.service").HistoryRecord[]>;
}
