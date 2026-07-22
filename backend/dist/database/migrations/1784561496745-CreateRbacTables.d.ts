import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class CreateRbacTables1784561496745 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
