// jwt.strategy.ts
import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

type JwtPayload = {
  sub: string;
  email: string;
  name?: string;
  role?: string;     // e.g., "Contractor"
  roleId?: string;   // role FK
  roleName?: string; // legacy/alt
  role_id?: string;  // legacy/alt
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET!,
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtPayload) {
    return {
      sub: payload.sub, 
      email: payload.email,
      name: payload.name,
      role: payload.role ?? payload.roleName,       // keep the role name too (handy if you later switch guard logic)
      roleId: payload.roleId ?? payload.role_id,    // <-- your RolesGuard needs this
    };
  }

  
}
