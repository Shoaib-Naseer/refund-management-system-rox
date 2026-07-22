import { PaymentMethod } from '../../../entities/refund-case.entity';
export declare class CreateRefundCaseDto {
    msisdn: string;
    amount?: number;
    paymentMethod?: PaymentMethod;
    accountNumber?: string;
    packageCode?: string;
    orderId?: string;
    transactionDatetime?: string;
    createdBy?: string;
}
