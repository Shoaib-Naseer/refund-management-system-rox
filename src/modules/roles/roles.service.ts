import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Role } from '../../entities/role.entity';
import { Permission } from '../../entities/permission.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission) private readonly permissionRepo: Repository<Permission>,
  ) {}

  findAllRoles(): Promise<Role[]> {
    return this.roleRepo.find({ relations: ['permissions'], order: { name: 'ASC' } });
  }

  findAllPermissions(): Promise<Permission[]> {
    return this.permissionRepo.find({ order: { name: 'ASC' } });
  }

  async create(dto: CreateRoleDto): Promise<Role> {
    const existing = await this.roleRepo.findOne({ where: { name: dto.name } });
    if (existing) {
      throw new ConflictException(`A role named "${dto.name}" already exists`);
    }
    const role = this.roleRepo.create({ name: dto.name, description: dto.description, permissions: [] });
    return this.roleRepo.save(role);
  }

  async update(id: number, dto: UpdateRoleDto): Promise<Role> {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    if (dto.name !== undefined) role.name = dto.name;
    if (dto.description !== undefined) role.description = dto.description;
    return this.roleRepo.save(role);
  }

  async updatePermissions(id: number, dto: UpdateRolePermissionsDto): Promise<Role> {
    const role = await this.roleRepo.findOne({ where: { id }, relations: ['permissions'] });
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    const permissions = dto.permissionIds.length
      ? await this.permissionRepo.find({ where: { id: In(dto.permissionIds) } })
      : [];
    if (permissions.length !== dto.permissionIds.length) {
      throw new BadRequestException('One or more permissionIds do not exist');
    }
    role.permissions = permissions;
    return this.roleRepo.save(role);
  }
}
