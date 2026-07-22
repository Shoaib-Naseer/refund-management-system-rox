import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';

/** Use alongside JwtAuthGuard (must run after it so request.user is populated). */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredPermissions || requiredPermissions.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    const userPermissions: Set<string> | undefined = user?.permissions;
    if (!userPermissions || !requiredPermissions.some((p) => userPermissions.has(p))) {
      throw new ForbiddenException(`Requires one of permissions: ${requiredPermissions.join(', ')}`);
    }
    return true;
  }
}
