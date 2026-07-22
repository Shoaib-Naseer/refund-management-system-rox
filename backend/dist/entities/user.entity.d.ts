import { Role } from './role.entity';
export declare enum UserRole {
    AGENT = "agent",
    REVIEWER = "reviewer",
    ADMIN = "admin"
}
export declare class User {
    id: number;
    username: string;
    email: string;
    passwordHash: string;
    fullName: string;
    role: UserRole;
    roles: Role[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
