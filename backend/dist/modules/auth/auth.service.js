"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcryptjs");
const user_entity_1 = require("../../entities/user.entity");
const role_entity_1 = require("../../entities/role.entity");
let AuthService = class AuthService {
    constructor(userRepo, roleRepo, jwtService) {
        this.userRepo = userRepo;
        this.roleRepo = roleRepo;
        this.jwtService = jwtService;
    }
    async register(dto) {
        const existing = await this.userRepo.findOne({
            where: [{ username: dto.username }, { email: dto.email }],
        });
        if (existing) {
            throw new common_1.ConflictException("A user with this username or email already exists");
        }
        const passwordHash = await bcrypt.hash(dto.password, 10);
        const roleName = dto.role || user_entity_1.UserRole.AGENT;
        const role = await this.roleRepo.findOne({ where: { name: roleName } });
        const user = this.userRepo.create({
            username: dto.username,
            email: dto.email,
            passwordHash,
            fullName: dto.fullName,
            role: roleName,
            roles: role ? [role] : [],
        });
        await this.userRepo.save(user);
        return {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
        };
    }
    async login(dto) {
        const user = await this.userRepo.findOne({
            where: { username: dto.username },
            relations: ["roles", "roles.permissions"],
        });
        if (!user || !user.isActive) {
            throw new common_1.UnauthorizedException("Invalid username or password");
        }
        const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
        if (!passwordMatches) {
            throw new common_1.UnauthorizedException("Invalid username or password");
        }
        const payload = {
            sub: user.id,
            username: user.username,
            role: user.role,
        };
        const accessToken = this.jwtService.sign(payload);
        const permissions = new Set();
        for (const role of user.roles || []) {
            for (const permission of role.permissions || []) {
                permissions.add(permission.name);
            }
        }
        return {
            accessToken,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                roles: (user.roles || []).map((r) => r.name),
                permissions: [...permissions],
            },
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(role_entity_1.Role)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map