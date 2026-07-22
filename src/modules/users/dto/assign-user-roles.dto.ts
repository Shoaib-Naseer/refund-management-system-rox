import { IsArray } from 'class-validator';

export class AssignUserRolesDto {
  @IsArray()
  roleIds: number[];
}
