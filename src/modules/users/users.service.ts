import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '../../entities/user.entity';
import { Role } from '../../entities/role.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignUserRolesDto } from './dto/assign-user-roles.dto';

/**
 * Best-effort mirror of a user's relational roles onto the legacy `role`
 * enum column, so anything still reading that column (until it's dropped in
 * a follow-up migration) shows something sensible. Highest privilege wins.
 */
function deriveLegacyRole(roles: Role[]): UserRole {
  const names = roles.map((r) => r.name);
  if (names.includes(UserRole.ADMIN)) return UserRole.ADMIN;
  if (names.includes(UserRole.REVIEWER)) return UserRole.REVIEWER;
  return UserRole.AGENT;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepo.find({
      relations: ['roles'],
      order: { createdAt: 'DESC' },
    });
  }

  private async resolveRoles(roleIds: number[]): Promise<Role[]> {
    if (!roleIds || roleIds.length === 0) return [];
    const roles = await this.roleRepo.find({ where: { id: In(roleIds) } });
    if (roles.length !== roleIds.length) {
      throw new BadRequestException('One or more roleIds do not exist');
    }
    return roles;
  }

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.userRepo.findOne({
      where: [{ username: dto.username }, { email: dto.email }],
    });
    if (existing) {
      throw new ConflictException('A user with this username or email already exists');
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

  async update(id: number, dto: UpdateUserDto): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.email !== undefined) user.email = dto.email;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    return this.userRepo.save(user);
  }

  async deactivate(id: number): Promise<User> {
    return this.update(id, { isActive: false });
  }

  async assignRoles(id: number, dto: AssignUserRolesDto): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id }, relations: ['roles'] });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    const roles = await this.resolveRoles(dto.roleIds);
    user.roles = roles;
    user.role = deriveLegacyRole(roles);
    return this.userRepo.save(user);
  }
}
