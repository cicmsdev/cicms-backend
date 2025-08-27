import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { RoleService } from 'src/role/role.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly roleService: RoleService, // Inject RoleService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true; // no @Roles() decorator found, allow access
    }

    const { user } = context.switchToHttp().getRequest();

    // Fetch the roles from the database based on the user's role_id
    const userRole = await this.roleService.findById(user.role_id); // Use 'role_id' here

    if (!userRole) {
      return false; // No role found in DB, deny access
    }

    return requiredRoles.includes(userRole.name); // Compare role name from DB with required roles
  }
}
