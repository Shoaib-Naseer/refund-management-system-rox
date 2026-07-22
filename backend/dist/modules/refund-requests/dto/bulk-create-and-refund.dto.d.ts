import { CreateRefundRequestDto } from './create-refund-request.dto';
export declare class BulkCreateAndRefundDto {
    records: CreateRefundRequestDto[];
    autoApprove?: boolean;
}
