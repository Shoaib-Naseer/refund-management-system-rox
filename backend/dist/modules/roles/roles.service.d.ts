import { Repository } from 'typeorm';
import { Role } from '../../entities/role.entity';
import { Permission } from '../../entities/permission.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
export declare class RolesService {
    private readonly roleRepo;
    private readonly permissionRepo;
    constructor(roleRepo: Repository<Role>, permissionRepo: Repository<Permission>);
    findAllRoles(): Promise<Role[]>;
    findAllPermissions(): Promise<Permission[]>;
    create(dto: CreateRoleDto): Promise<Role>;
    update(id: number, dto: UpdateRoleDto): Promise<Role>;
    updatePermissions(id: number, dto: UpdateRolePermissionsDto): Promise<Role>;
}
