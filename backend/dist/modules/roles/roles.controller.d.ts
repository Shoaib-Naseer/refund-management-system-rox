import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
export declare class RolesController {
    private readonly rolesService;
    constructor(rolesService: RolesService);
    findAll(): Promise<import("../../entities/role.entity").Role[]>;
    findAllPermissions(): Promise<import("../../entities/permission.entity").Permission[]>;
    create(dto: CreateRoleDto): Promise<import("../../entities/role.entity").Role>;
    update(id: string, dto: UpdateRoleDto): Promise<import("../../entities/role.entity").Role>;
    updatePermissions(id: string, dto: UpdateRolePermissionsDto): Promise<import("../../entities/role.entity").Role>;
}
