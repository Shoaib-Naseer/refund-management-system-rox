import { Controller, Get, Post, Patch, Put, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignUserRolesDto } from './dto/assign-user-roles.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('refund_requests.override_approve')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(+id, dto);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.usersService.deactivate(+id);
  }

  @Put(':id/roles')
  assignRoles(@Param('id') id: string, @Body() dto: AssignUserRolesDto) {
    return this.usersService.assignRoles(+id, dto);
  }
}
