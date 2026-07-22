import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../../entities/user.entity";
import { JwtPayload } from "./auth.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req) => {
          return (req?.query?.token as string) || null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || "dev-only-change-me-in-production",
    });
  }

  /**
   * Runs on every authenticated request — re-fetches the user so a
   * deactivated/deleted account can't keep using an already-issued token.
   * Also resolves the user's roles/permissions live from the DB (rather
   * than trusting anything baked into the JWT), so a permission change made
   * by an admin takes effect on the user's very next request — no re-login
   * needed.
   */
  async validate(payload: JwtPayload) {
    const user = await this.userRepo.findOne({
      where: { id: payload.sub },
      relations: ["roles", "roles.permissions"],
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException("User account is no longer active");
    }

    const permissions = new Set<string>();
    for (const role of user.roles || []) {
      for (const permission of role.permissions || []) {
        permissions.add(permission.name);
      }
    }

    return {
      id: user.id,
      username: user.username,
      role: user.role,
      roles: (user.roles || []).map((r) => r.name),
      permissions,
      fullName: user.fullName,
      email: user.email,
    };
  }
}
