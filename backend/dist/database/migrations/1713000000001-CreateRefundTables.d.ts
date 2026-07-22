import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class CreateRefundTables1713000000001 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
