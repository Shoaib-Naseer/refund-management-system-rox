import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Role } from '../../entities/role.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignUserRolesDto } from './dto/assign-user-roles.dto';
export declare class UsersService {
    private readonly userRepo;
    private readonly roleRepo;
    constructor(userRepo: Repository<User>, roleRepo: Repository<Role>);
    findAll(): Promise<User[]>;
    private resolveRoles;
    create(dto: CreateUserDto): Promise<User>;
    update(id: number, dto: UpdateUserDto): Promise<User>;
    deactivate(id: number): Promise<User>;
    assignRoles(id: number, dto: AssignUserRolesDto): Promise<User>;
}
