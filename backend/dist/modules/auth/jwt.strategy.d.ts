import { Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { JwtPayload } from './auth.service';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly userRepo;
    constructor(userRepo: Repository<User>);
    validate(payload: JwtPayload): Promise<{
        id: number;
        username: string;
        role: import("../../entities/user.entity").UserRole;
        roles: string[];
        permissions: Set<string>;
        fullName: string;
        email: string;
    }>;
}
export {};
