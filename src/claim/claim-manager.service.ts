import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { $Enums, ClaimStatus, Prisma } from '@prisma/client';
import { QueryClaimsDto } from './dtos/query-claims.dto';
import { AssignEvaluatorDto } from './dtos/assign-evaluator.dto';
import { ListEvaluatorsDto } from './dtos/list-evaluators.dto';
import { NotificationsService } from 'src/notifications/notifications.service';

type CountRow = { status: $Enums.ClaimStatus; _count: { _all: number } };
// helper (put near the top of the service file)
const humanize = (s?: string | null) =>
  s ? s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : 'Unknown';


@Injectable()
export class ClaimManagerService {
  constructor(
    private readonly prisma: DatabaseService,
    private readonly notifications: NotificationsService,
  ) { }



  /** List all claims except SUBMITTED or REJECTED */
  async managerListClaims(q?: QueryClaimsDto & { status?: unknown }) {
    try {
      const {
        status: rawStatus,
        submittedFrom,
        submittedTo,
        search,
        page = 1,
        pageSize = 10,
      } = q ?? {};

      const allEnums = new Set(Object.values(ClaimStatus));
      const normalizeStatuses = (input: unknown): ClaimStatus[] => {
        if (!input) return [];
        const parts = Array.isArray(input) ? input : String(input).split(',');
        return parts
          .map((s) => String(s).trim())
          .filter(Boolean)
          .filter((s) => allEnums.has(s as ClaimStatus)) as ClaimStatus[];
      };
      const statuses = normalizeStatuses(rawStatus);

      const where: Prisma.ClaimWhereInput = {};
      if (statuses.length) where.status = { in: statuses };

      if (submittedFrom || submittedTo) {
        where.submissionDate = {};
        if (submittedFrom) (where.submissionDate as any).gte = new Date(submittedFrom);
        if (submittedTo) (where.submissionDate as any).lte = new Date(submittedTo);
      }

      if (search) {
        where.OR = [{ ClaimTitle: { contains: search, mode: 'insensitive' } }];
      }

      const skip = (page - 1) * pageSize;

      const [items, total] = await this.prisma.$transaction([
        this.prisma.claim.findMany({
          where,
          orderBy: { submissionDate: 'asc' },
          skip,
          take: pageSize,
          include: {
            company: true,
            submittedBy: { select: { id: true, name: true, email: true } },
            evaluator: { select: { id: true, name: true, email: true } },
            _count: { select: { documents: true } },
          },
        }),
        this.prisma.claim.count({ where }),
      ]);

      // Expose flat documentsCount + friendly label for claimType
      const data = items.map((it) => ({
        ...it,
        documentsCount: it._count.documents,
        claimType: it.claimType ?? null,                     // raw enum (or null)
        claimTypeLabel: humanize(it.claimType ?? undefined), // e.g. "Material Damage"
        _count: undefined as unknown as undefined,
      }));

      return { data, page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
    } catch (err) {
      console.error('managerListClaims error:', err);
      throw new InternalServerErrorException('Failed to list claims for manager');
    }
  }



  /** Manager inbox = approved and unassigned claims */
  async managerInbox(q?: { search?: string; page?: number; pageSize?: number }) {
    try {
      const page = q?.page ?? 1;
      const pageSize = q?.pageSize ?? 10;
      const skip = (page - 1) * pageSize;

      const where: any = {
        status: ClaimStatus.APPROVED,
        evaluatorId: null,
      };

      if (q?.search) {
        where.OR = [{ ClaimTitle: { contains: q.search, mode: 'insensitive' } }];
      }

      const [items, total] = await this.prisma.$transaction([
        this.prisma.claim.findMany({
          where,
          orderBy: { submissionDate: 'asc' },
          skip,
          take: pageSize,
          include: { company: true, submittedBy: true },
        }),
        this.prisma.claim.count({ where }),
      ]);

      return { data: items, page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
    } catch (err) {
      console.error('managerInbox error:', err);
      throw new InternalServerErrorException('Failed to load manager inbox');
    }
  }

  /** Assign evaluator (global, not company-scoped) */
  async managerAssignEvaluator(managerId: string, claimId: string, evaluatorId: string) {
    try {
      // Do it all atomically
      const { updated, oldStatus } = await this.prisma.$transaction(async (tx) => {
        // 1) Load claim
        const claim = await tx.claim.findUnique({
          where: { claimId },
          select: {
            claimId: true,
            status: true,
            evaluatorId: true,
            submittedById: true,
            companyId: true,
            ClaimTitle: true,
          },
        });
        if (!claim) throw new NotFoundException('Claim not found');

        // 2) Validate assignability
        // Allowed: from APPROVED (most common), or from IN_EVALUATION as long as no evaluator yet.
        const assignable =
          (claim.status === ClaimStatus.APPROVED && !claim.evaluatorId) ||
          (claim.status === ClaimStatus.IN_EVALUATION && !claim.evaluatorId);

        if (!assignable) {
          throw new BadRequestException('Claim is not available for assignment.');
        }

        // 3) Update claim → set evaluatorId + status IN_EVALUATION
        const updated = await tx.claim.update({
          where: { claimId },
          data: {
            evaluatorId,
            status: ClaimStatus.IN_EVALUATION,
          },
          select: {
            claimId: true,
            status: true,
            evaluatorId: true,
            submittedById: true,
            companyId: true,
            ClaimTitle: true,
            updatedAt: true,
          },
        });

        // 4) Log activity
        await tx.claimActivity.create({
          data: {
            claimId: claim.claimId,
            performedById: managerId,
            action: 'ASSIGN_EVALUATOR',
            fromStatus: claim.status,
            toStatus: ClaimStatus.IN_EVALUATION,
            reason: null,
          },
        });

        return { updated, oldStatus: claim.status };
      });

      //Notify stakeholders (fire-and-forget; remove .catch to make it hard-fail)
      this.notifications
        .createClaimStatusNotification(
          claimId,
          oldStatus,
          ClaimStatus.IN_EVALUATION,
          managerId,
        )
        .catch((e) => console.error('notify status-change failed:', e));

      this.notifications
        .createEvaluatorAssignmentNotification(claimId, updated.evaluatorId!, managerId)
        .catch((e) => console.error('notify evaluator-assigned failed:', e));

      return { message: 'Evaluator assigned successfully' };
    } catch (err) {
      console.error('managerAssignEvaluator error:', err);
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException
      ) throw err;
      throw new InternalServerErrorException('Failed to assign evaluator');
    }
  }

  /** Get claim (global) */
  async managerGetClaim(claimId: string) {
    try {
      const claim = await this.prisma.claim.findUnique({
        where: { claimId },
        include: {
          company: {
            select: {
              companyId: true,
              name: true,
              email: true,
              representatives: {
                select: { id: true, name: true, email: true, phoneNumber: true },
                orderBy: { name: 'asc' },
              },
            },
          },
          submittedBy: { select: { id: true, name: true, email: true, phoneNumber: true } },
          evaluator: { select: { id: true, name: true, email: true, phoneNumber: true } },
          documents: {
            orderBy: { uploadDate: 'desc' },
            select: {
              documentId: true,
              documentType: true,
              filePath: true,
              uploadDate: true,
              uploader: { select: { id: true, name: true, email: true } },
            },
          },
          activities: {
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              createdAt: true,
              action: true,
              fromStatus: true,
              toStatus: true,
              reason: true,
              performedBy: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });

      if (!claim) throw new NotFoundException('Claim not found');

      // add human-friendly label without changing existing payload shape
      return {
        ...claim,
        claimType: claim.claimType ?? null,
        claimTypeLabel: humanize(claim.claimType ?? undefined),
      };
    } catch (err) {
      console.error('managerGetClaim error:', err);
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('Failed to fetch claim');
    }
  }


  /** Dashboard */
  async managerDashboard() {
    try {
      const [rawCounts, recent] = await Promise.all([
        this.prisma.claim.groupBy({
          by: ['status'],
          _count: { _all: true },
          orderBy: { status: 'asc' },
        }) as unknown as Promise<CountRow[]>,
        this.prisma.claim.findMany({
          orderBy: { submissionDate: 'desc' },
          take: 5,
          select: {
            claimId: true,
            ClaimTitle: true,
            status: true,
            submissionDate: true,
            submittedBy: { select: { id: true, name: true, email: true } },
            evaluator: { select: { id: true, name: true, email: true } },
            company: { select: { companyId: true, name: true } },
          },
        }),
      ]);

      const countsByStatus = (Object.values(ClaimStatus) as $Enums.ClaimStatus[]).reduce(
        (acc, s) => ((acc[s] = 0), acc),
        {} as Record<$Enums.ClaimStatus, number>,
      );
      for (const row of rawCounts) countsByStatus[row.status] = row._count._all;

      const totalClaims = Object.values(countsByStatus).reduce((a, b) => a + b, 0);

      return {
        summary: {
          totalClaims,
          submitted: countsByStatus.SUBMITTED ?? 0,
          approved: countsByStatus.APPROVED ?? 0,
          rejected: countsByStatus.REJECTED ?? 0,
          inEvaluation: countsByStatus.IN_EVALUATION ?? 0,
          resolved: countsByStatus.RESOLVED ?? 0,
          inCourt: countsByStatus.RESOLVED_IN_COURT ?? 0,
        },
        recent,
      };
    } catch (err) {
      console.error('managerDashboard error:', err);
      throw new InternalServerErrorException('Failed to build manager dashboard');
    }
  }

  async assignEvaluatorToClaim(
    managerUserId: string,
    claimId: string,
    dto: AssignEvaluatorDto,
  ) {
    try {
      const { updated, oldStatus } = await this.prisma.$transaction(async (tx) => {
        const claim = await tx.claim.findUnique({
          where: { claimId },
          select: { claimId: true, status: true, evaluatorId: true },
        });
        if (!claim) throw new NotFoundException('Claim not found');

        // Allow assigning only from specific statuses; block terminal statuses
        const allowed: $Enums.ClaimStatus[] = [
          $Enums.ClaimStatus.APPROVED,
          $Enums.ClaimStatus.IN_EVALUATION,
        ];
        const terminal: $Enums.ClaimStatus[] = [
          $Enums.ClaimStatus.SUBMITTED,
          $Enums.ClaimStatus.REJECTED,
          $Enums.ClaimStatus.RESOLVED,
          $Enums.ClaimStatus.RESOLVED_IN_COURT,
        ];
        if (terminal.includes(claim.status) || !allowed.includes(claim.status)) {
          throw new BadRequestException(`Claim in status ${claim.status} cannot be assigned`);
        }

        // Role-only check; no company scope check
        const evaluator = await tx.user.findUnique({
          where: { id: dto.evaluatorId },
          select: { id: true, role: { select: { name: true } }, status: true },
        });
        if (!evaluator) throw new NotFoundException('Evaluator not found');
        if ((evaluator.role?.name ?? '').toLowerCase() !== 'evaluator') {
          throw new BadRequestException('User is not an Evaluator');
        }
        // If you want to enforce ACTIVE, uncomment:
        // if (evaluator.status !== $Enums.UserStatus.ACTIVE) throw new BadRequestException('Evaluator is not active');

        const toStatus = $Enums.ClaimStatus.IN_EVALUATION;
        const reassignment = !!(claim.evaluatorId && claim.evaluatorId !== dto.evaluatorId);

        // Idempotent fast return
        if (claim.evaluatorId === dto.evaluatorId && claim.status === toStatus) {
          const current = await tx.claim.findUnique({
            where: { claimId },
            select: {
              claimId: true,
              status: true,
              evaluatorId: true,
              updatedAt: true,
            },
          });
          return { updated: current!, oldStatus: claim.status };
        }

        const updated = await tx.claim.update({
          where: { claimId },
          data: { evaluatorId: dto.evaluatorId, status: toStatus },
          select: {
            claimId: true,
            status: true,
            evaluatorId: true,
            updatedAt: true,
          },
        });

        await tx.claimActivity.create({
          data: {
            claim: { connect: { claimId: claim.claimId } },
            performedBy: { connect: { id: managerUserId } },
            action: reassignment ? 'REASSIGNED_EVALUATOR' : 'ASSIGNED_EVALUATOR',
            fromStatus: claim.status,
            toStatus,
            reason: dto.reason ?? null,
          },
        });

        return { updated, oldStatus: claim.status };
      });

      // 🔔 Fire-and-forget notifications (same pattern as managerAssignEvaluator)
      this.notifications
        .createClaimStatusNotification(
          claimId,
          oldStatus,
          $Enums.ClaimStatus.IN_EVALUATION,
          managerUserId,
        )
        .catch((e) => console.error('notify status-change failed:', e));

      this.notifications
        .createEvaluatorAssignmentNotification(
          claimId,
          updated.evaluatorId!, // safe due to update above
          managerUserId,
        )
        .catch((e) => console.error('notify evaluator-assigned failed:', e));

      // Return the updated claim (kept your prior behavior)
      return updated;
    } catch (err) {
      console.error('assignEvaluatorToClaim error:', err);
      if (err instanceof BadRequestException || err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('Failed to assign evaluator');
    }
  }

  async listEvaluatorsWithAssignedCount(dto: ListEvaluatorsDto) {
    const {
      search,
      companyId,
      onlyActive = true,
      page = 1,
      pageSize = 50,
    } = dto;

    const whereUser: Prisma.UserWhereInput = {
      role: { name: 'Evaluator' },
      ...(onlyActive ? { status: $Enums.UserStatus.ACTIVE } : {}),
      ...(companyId ? { insuranceCompanyId: companyId } : {}),
      ...(search
        ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phoneNumber: { contains: search, mode: 'insensitive' } },
          ],
        }
        : {}),
    };

    const skip = (page - 1) * pageSize;

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where: whereUser,
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          insuranceCompany: { select: { companyId: true, name: true } },
          _count: {
            select: {
              // Count all assigned claims; add `{ where: { status: ... } }` if you want a status filter.
              assignedClaims: true,
            },
          },
        },
        orderBy: { name: 'asc' }, // or sort by load, see note below
        skip,
        take: pageSize,
      }),
      this.prisma.user.count({ where: whereUser }),
    ]);

    const data = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phoneNumber: u.phoneNumber,
      insuranceCompany: u.insuranceCompany,
      assignedCount: (u._count.assignedClaims as number) ?? 0,
    }));

    return { data, page, pageSize, total };
  }

}



