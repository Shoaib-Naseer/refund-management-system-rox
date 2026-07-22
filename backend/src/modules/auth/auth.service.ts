import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { User, UserRole } from "../../entities/user.entity";
import { Role } from "../../entities/role.entity";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";

export interface JwtPayload {
  sub: number;
  username: string;
  role: UserRole;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    private readonly jwtService: JwtService,
  ) {}

  async register(
    dto: RegisterDto,
  ): Promise<{ id: number; username: string; email: string; role: UserRole }> {
    const existing = await this.userRepo.findOne({
      where: [{ username: dto.username }, { email: dto.email }],
    });
    if (existing) {
      throw new ConflictException(
        "A user with this username or email already exists",
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const roleName = dto.role || UserRole.AGENT;
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

  async login(
    dto: LoginDto,
  ): Promise<{
    accessToken: string;
    user: { id: number; username: string; role: UserRole; roles: string[]; permissions: string[] };
  }> {
    const user = await this.userRepo.findOne({
      where: { username: dto.username },
      relations: ["roles", "roles.permissions"],
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException("Invalid username or password");
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid username or password");
    }

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };
    const accessToken = this.jwtService.sign(payload);

    const permissions = new Set<string>();
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
}
