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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = require("bcryptjs");
const user_entity_1 = require("../../entities/user.entity");
const role_entity_1 = require("../../entities/role.entity");
function deriveLegacyRole(roles) {
    const names = roles.map((r) => r.name);
    if (names.includes(user_entity_1.UserRole.ADMIN))
        return user_entity_1.UserRole.ADMIN;
    if (names.includes(user_entity_1.UserRole.REVIEWER))
        return user_entity_1.UserRole.REVIEWER;
    return user_entity_1.UserRole.AGENT;
}
let UsersService = class UsersService {
    constructor(userRepo, roleRepo) {
        this.userRepo = userRepo;
        this.roleRepo = roleRepo;
    }
    async findAll() {
        return this.userRepo.find({
            relations: ['roles'],
            order: { createdAt: 'DESC' },
        });
    }
    async resolveRoles(roleIds) {
        if (!roleIds || roleIds.length === 0)
            return [];
        const roles = await this.roleRepo.find({ where: { id: (0, typeorm_2.In)(roleIds) } });
        if (roles.length !== roleIds.length) {
            throw new common_1.BadRequestException('One or more roleIds do not exist');
        }
        return roles;
    }
    async create(dto) {
        const existing = await this.userRepo.findOne({
            where: [{ username: dto.username }, { email: dto.email }],
        });
        if (existing) {
            throw new common_1.ConflictException('A user with this username or email already exists');
        }
        const roles = await this.resolveRoles(dto.roleIds);
        const passwordHash = await bcrypt.hash(dto.password, 10);
        const user = this.userRepo.create({
            username: dto.username,
            email: dto.email,
            passwordHash,
            fullName: dto.fullName,
            role: deriveLegacyRole(roles),
            roles,
        });
        return this.userRepo.save(user);
    }
    async update(id, dto) {
        const user = await this.userRepo.findOne({ where: { id } });
        if (!user) {
            throw new common_1.NotFoundException(`User with ID ${id} not found`);
        }
        if (dto.fullName !== undefined)
            user.fullName = dto.fullName;
        if (dto.email !== undefined)
            user.email = dto.email;
        if (dto.isActive !== undefined)
            user.isActive = dto.isActive;
        return this.userRepo.save(user);
    }
    async deactivate(id) {
        return this.update(id, { isActive: false });
    }
    async assignRoles(id, dto) {
        const user = await this.userRepo.findOne({ where: { id }, relations: ['roles'] });
        if (!user) {
            throw new common_1.NotFoundException(`User with ID ${id} not found`);
        }
        const roles = await this.resolveRoles(dto.roleIds);
        user.roles = roles;
        user.role = deriveLegacyRole(roles);
        return this.userRepo.save(user);
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(role_entity_1.Role)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], UsersService);
//# sourceMappingURL=users.service.js.map