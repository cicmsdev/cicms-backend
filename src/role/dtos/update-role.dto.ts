import { PartialType } from '@nestjs/mapped-types';
import { CreateRoleDto } from './create-role.dtos';

export class UpdateRoleDto extends PartialType(CreateRoleDto) {}
