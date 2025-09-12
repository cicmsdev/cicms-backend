// chat/auth-helpers.ts
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';

export type AppUser = { id: string; email?: string; name?: string; role?: string };

export class ChatAuth {
  constructor(private prisma: DatabaseService) {}

  async assertClaimAccess(user: AppUser, claimId: string) {
    const claim = await this.prisma.claim.findUnique({
      where: { claimId },
      select: { claimId: true, submittedById: true, evaluatorId: true, companyId: true },
    });
    if (!claim) throw new NotFoundException('Claim not found');

    const r = user.role;

    // Global roles
    if (r === 'Admin' || r === 'Claim Manager') return;

    // Claim-linked actors
    if (claim.submittedById === user.id) return;     // Contractor (submitter)
    if (claim.evaluatorId === user.id) return;       // Evaluator

    // Insurance Representative must belong to the same company as the claim
    if (r === 'Insurance Representative') {
      const rep = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: { insuranceCompanyId: true },
      });
      if (rep?.insuranceCompanyId && rep.insuranceCompanyId === claim.companyId) return;
    }

    throw new ForbiddenException('Not allowed for this claim chat');
  }

  assertDmAccess(user: AppUser, a: string, b: string) {
    if (user.id === a || user.id === b) return;
    throw new ForbiddenException('Not allowed for this DM');
  }
}
