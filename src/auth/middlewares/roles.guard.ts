import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { RoleService } from 'src/role/role.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly roleService: RoleService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles =
      this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as { sub?: string; role?: string; roleName?: string; roleId?: string };

    if (!user?.sub) throw new ForbiddenException('Not authenticated');

    // 1) Prefer role name from token (no DB hit)
    const tokenRoleName =
      (user.role ?? user.roleName ?? '').toString().trim();
    if (tokenRoleName) {
      const tokenRoleLc = tokenRoleName.toLowerCase();
      const ok = requiredRoles.some((r) => r.toLowerCase() === tokenRoleLc);
      if (ok) return true;
      throw new ForbiddenException('Insufficient permissions');
    }

    // 2) Fallback to roleId in token → lookup DB
    if (!user.roleId) {
      throw new ForbiddenException('User has no role assigned');
    }

    const userRole = await this.roleService.findById(user.roleId);
    if (!userRole) throw new ForbiddenException('Role not found');

    const ok = requiredRoles.includes(userRole.name);
    if (!ok) throw new ForbiddenException('Insufficient permissions');

    return true;
  }
}
