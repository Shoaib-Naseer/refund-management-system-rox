import { IsArray } from 'class-validator';

export class UpdateRolePermissionsDto {
  @IsArray()
  permissionIds: number[];
}
