import { SetMetadata } from '@nestjs/common';

//
export const ROLES_KEY = 'roles';
// accept role name as string array
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);