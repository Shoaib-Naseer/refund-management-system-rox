export interface RefundApiResult {
    provider: "Jazz_Cash" | "Easy_Paisa" | "Card";
    processedAt: string;
    success: boolean;
    message: string;
    rawResponse?: string;
}
export declare class RefundProcessingService {
    private readonly logger;
    private readonly PKT_TIMEZONE;
    private get easypaisaConfig();
    private get jazzcashConfig();
    processRefund(paymentMethod: string, params: {
        orderId: string;
        amount: number;
        msisdn: string;
        accountNumber?: string;
        orderDate?: Date;
    }): Promise<{
        success: boolean;
        description: string;
        rawResponse: any;
    }>;
    private refundViaJazzCashWallet;
    private callJazzCashOrchestratorRefundApi;
    private refundViaJazzCashCard;
    private refundViaEasypaisa;
    private generateJazzCashSecureHash;
    private generateEasypaisaSignature;
    private resolveEasypaisaOrderDate;
    private formatDateForRefund;
    private executeWithRetry;
}
