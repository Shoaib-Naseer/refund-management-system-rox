import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignUserRolesDto } from './dto/assign-user-roles.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findAll(): Promise<import("../../entities/user.entity").User[]>;
    create(dto: CreateUserDto): Promise<import("../../entities/user.entity").User>;
    update(id: string, dto: UpdateUserDto): Promise<import("../../entities/user.entity").User>;
    deactivate(id: string): Promise<import("../../entities/user.entity").User>;
    assignRoles(id: string, dto: AssignUserRolesDto): Promise<import("../../entities/user.entity").User>;
}
