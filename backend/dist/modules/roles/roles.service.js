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
exports.RolesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const role_entity_1 = require("../../entities/role.entity");
const permission_entity_1 = require("../../entities/permission.entity");
let RolesService = class RolesService {
    constructor(roleRepo, permissionRepo) {
        this.roleRepo = roleRepo;
        this.permissionRepo = permissionRepo;
    }
    findAllRoles() {
        return this.roleRepo.find({ relations: ['permissions'], order: { name: 'ASC' } });
    }
    findAllPermissions() {
        return this.permissionRepo.find({ order: { name: 'ASC' } });
    }
    async create(dto) {
        const existing = await this.roleRepo.findOne({ where: { name: dto.name } });
        if (existing) {
            throw new common_1.ConflictException(`A role named "${dto.name}" already exists`);
        }
        const role = this.roleRepo.create({ name: dto.name, description: dto.description, permissions: [] });
        return this.roleRepo.save(role);
    }
    async update(id, dto) {
        const role = await this.roleRepo.findOne({ where: { id } });
        if (!role) {
            throw new common_1.NotFoundException(`Role with ID ${id} not found`);
        }
        if (dto.name !== undefined)
            role.name = dto.name;
        if (dto.description !== undefined)
            role.description = dto.description;
        return this.roleRepo.save(role);
    }
    async updatePermissions(id, dto) {
        const role = await this.roleRepo.findOne({ where: { id }, relations: ['permissions'] });
        if (!role) {
            throw new common_1.NotFoundException(`Role with ID ${id} not found`);
        }
        const permissions = dto.permissionIds.length
            ? await this.permissionRepo.find({ where: { id: (0, typeorm_2.In)(dto.permissionIds) } })
            : [];
        if (permissions.length !== dto.permissionIds.length) {
            throw new common_1.BadRequestException('One or more permissionIds do not exist');
        }
        role.permissions = permissions;
        return this.roleRepo.save(role);
    }
};
exports.RolesService = RolesService;
exports.RolesService = RolesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(role_entity_1.Role)),
    __param(1, (0, typeorm_1.InjectRepository)(permission_entity_1.Permission)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], RolesService);
//# sourceMappingURL=roles.service.js.map