import { BulkOperation } from './bulk-operation.entity';
export declare class BulkOperationLog {
    id: number;
    bulkOperationId: number;
    message: string;
    createdAt: Date;
    bulkOperation: BulkOperation;
}
