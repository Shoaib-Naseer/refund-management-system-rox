import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../entities/user.entity';

export interface RequestUser extends Pick<User, 'id' | 'username' | 'role' | 'fullName' | 'email'> {
  roles: string[];
  permissions: Set<string>;
}

/**
 * Pulls the authenticated user (attached by JwtStrategy.validate) off the request.
 * Use alongside @UseGuards(JwtAuthGuard).
 */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): RequestUser => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
