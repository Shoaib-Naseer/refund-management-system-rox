export declare class CreateRefundRequestDto {
    msisdn: string;
    historyRecord: Record<string, any>;
    refundCaseId?: number;
    requestReason?: string;
    isOverride?: boolean;
    overrideJustification?: string;
    requestedRefundAmount?: number;
}
