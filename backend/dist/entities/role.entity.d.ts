import { Permission } from './permission.entity';
export declare class Role {
    id: number;
    name: string;
    description: string;
    permissions: Permission[];
    createdAt: Date;
    updatedAt: Date;
}
