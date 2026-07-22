import { Repository } from "typeorm";
import { JwtService } from "@nestjs/jwt";
import { User, UserRole } from "../../entities/user.entity";
import { Role } from "../../entities/role.entity";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
export interface JwtPayload {
    sub: number;
    username: string;
    role: UserRole;
}
export declare class AuthService {
    private readonly userRepo;
    private readonly roleRepo;
    private readonly jwtService;
    constructor(userRepo: Repository<User>, roleRepo: Repository<Role>, jwtService: JwtService);
    register(dto: RegisterDto): Promise<{
        id: number;
        username: string;
        email: string;
        role: UserRole;
    }>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        user: {
            id: number;
            username: string;
            role: UserRole;
            roles: string[];
            permissions: string[];
        };
    }>;
}
