import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  HttpException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { $Enums, ClaimStatus, NotificationType, Prisma, UserStatus } from '@prisma/client';
import { QueryClaimsDto } from './dtos/query-claims.dto';
import { EvaluatorAllowedStatus, UpdateEvaluatorClaimStatusDto } from './dtos/update-claim-status.dto';
import { NotificationsService } from 'src/notifications/notifications.service';

type CountRow = { status: $Enums.ClaimStatus; _count: { _all: number } };

@Injectable()
export class EvaluatorClaimService {
  constructor(
    private readonly prisma: DatabaseService,
    private readonly notifications: NotificationsService,
  ) { }

  /** List all claims assigned to me (with filters/pagination) */
  // listMyAssignedClaims method in evaluator-claim.service.ts
  async listMyAssignedClaims(evaluatorId: string, q?: QueryClaimsDto) {
    try {
      const {
        status,
        submittedFrom,
        submittedTo,
        search,
        page = 1,
        pageSize = 10,
      } = q ?? {};

      const where: Prisma.ClaimWhereInput = { evaluatorId };

      // --- status: array or single (with validation like findAllForInsurance) ---
      if (Array.isArray(status) && status.length) {
        const allowed = new Set(Object.values(ClaimStatus));
        const statuses = (status as ClaimStatus[]).filter(Boolean);
        if (!statuses.every(s => allowed.has(s))) {
          throw new BadRequestException('Invalid status filter');
        }
        where.status = { in: statuses };
      } else if (status && !Array.isArray(status)) {
        const s = status as ClaimStatus;
        if (!(Object.values(ClaimStatus) as ClaimStatus[]).includes(s)) {
          throw new BadRequestException('Invalid status filter');
        }
        where.status = s;
      }

      // --- date range ---
      if (submittedFrom || submittedTo) {
        where.submissionDate = {};
        if (submittedFrom) (where.submissionDate as any).gte = new Date(submittedFrom);
        if (submittedTo) (where.submissionDate as any).lte = new Date(submittedTo);
      }

      // --- search ---
      if (search) {
        where.OR = [{ ClaimTitle: { contains: search, mode: 'insensitive' } }];
      }

      const skip = (page - 1) * pageSize;

      const [items, total] = await this.prisma.$transaction([
        this.prisma.claim.findMany({
          where,
          select: {
            claimId: true,
            ClaimTitle: true,
            status: true,
            submissionDate: true,
            claimType: true,
            company: { select: { companyId: true, name: true } },
            submittedBy: { select: { id: true, name: true, email: true } },
            evaluator: { select: { id: true, name: true, email: true } },
            _count: { select: { documents: true } },
          },
          orderBy: { submissionDate: 'asc' },
          skip,
          take: pageSize,
        }),
        this.prisma.claim.count({ where }),
      ]);

      // match findAllForInsurance: expose documentsCount and strip _count
      const data = items.map(it => ({
        ...it,
        documentsCount: it._count.documents,
        _count: undefined as unknown as undefined,
      }));

      return {
        data,
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      };
    } catch (err) {
      console.error('listMyAssignedClaims error:', err);
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to list assigned claims');
    }
  }

  /** Get a single claim assigned to me */
  async getMyAssignedClaim(evaluatorId: string, claimId: string) {
    try {
      const claim = await this.prisma.claim.findUnique({
        where: { claimId },
        include: {
          company: {
            select: {
              companyId: true,
              name: true,
              email: true // Include company email as well
            }
          },
          submittedBy: { select: { id: true, name: true, email: true } },
          evaluator: { select: { id: true, name: true, email: true } },
          documents: {
            select: {
              documentId: true,
              documentType: true,
              filePath: true,
              uploadDate: true,
              uploader: { select: { id: true, name: true, email: true } },
            },
            orderBy: { uploadDate: 'desc' },
          },
          activities: {
            include: {
              performedBy: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!claim) throw new NotFoundException('Claim not found');
      if (claim.evaluatorId !== evaluatorId) {
        throw new ForbiddenException('You can only access claims assigned to you');
      }

      return claim;
    } catch (err) {
      console.error('getMyAssignedClaim error:', err);

      // If it's already an HttpException, re-throw it
      if (err instanceof HttpException) {
        throw err;
      }

      throw new InternalServerErrorException('Failed to fetch assigned claim');
    }
  }


  async startEvaluation(evaluatorId: string, claimId: string) {
    try {
      // Atomically try promote APPROVED → IN_EVALUATION
      const { count } = await this.prisma.claim.updateMany({
        where: {
          claimId,
          evaluatorId,
          status: ClaimStatus.APPROVED,
        },
        data: { status: ClaimStatus.IN_EVALUATION },
      });

      if (count === 0) {
        // Not promoted; check current state
        const check = await this.prisma.claim.findUnique({
          where: { claimId },
          select: { evaluatorId: true, status: true },
        });
        if (!check) throw new NotFoundException('Claim not found');
        if (check.evaluatorId !== evaluatorId) {
          throw new ForbiddenException('Not assigned to you');
        }
        if (check.status !== ClaimStatus.IN_EVALUATION) {
          throw new BadRequestException(`Cannot start evaluation from ${check.status}`);
        }
      }

      return { message: 'Evaluation started' };
    } catch (err) {
      console.error('startEvaluation error:', err);

      // If it's already an HttpException, re-throw it
      if (err instanceof HttpException) {
        throw err;
      }

      throw new InternalServerErrorException('Failed to start evaluation');
    }
  }


  async updateStatus(
    evaluatorId: string,
    claimId: string,
    dto: UpdateEvaluatorClaimStatusDto,
  ) {
    try {
      let target: ClaimStatus;
      switch (dto.status) {
        case EvaluatorAllowedStatus.IN_EVALUATION:
          target = ClaimStatus.IN_EVALUATION;
          break;
        case EvaluatorAllowedStatus.RESOLVED:
          target = ClaimStatus.RESOLVED;
          break;
        case EvaluatorAllowedStatus.RESOLVED_IN_COURT:
          target = ClaimStatus.RESOLVED_IN_COURT;
          break;
        default:
          throw new BadRequestException('Invalid evaluator status');
      }

      // Define allowed transitions
      let allowedFrom: ClaimStatus[];
      if (target === ClaimStatus.IN_EVALUATION) {
        allowedFrom = [ClaimStatus.APPROVED, ClaimStatus.IN_EVALUATION];
      } else if (target === ClaimStatus.RESOLVED) {
        allowedFrom = [
          ClaimStatus.IN_EVALUATION,
          ClaimStatus.RESOLVED,
          ClaimStatus.RESOLVED_IN_COURT,
        ];
      } else if (target === ClaimStatus.RESOLVED_IN_COURT) {
        allowedFrom = [
          ClaimStatus.IN_EVALUATION,
          ClaimStatus.RESOLVED_IN_COURT,
          ClaimStatus.RESOLVED,
        ];
      } else {
        allowedFrom = [];
      }

      // Transaction: verify, update, log, and return both updated + oldStatus
      const { updated, oldStatus, companyId } = await this.prisma.$transaction(async (tx) => {
        const currentClaim = await tx.claim.findUnique({
          where: { claimId },
          select: {
            status: true,
            evaluatorId: true,
            claimId: true,
            updatedAt: true,
            companyId: true,
          },
        });

        if (!currentClaim) throw new NotFoundException('Claim not found');
        if (currentClaim.evaluatorId !== evaluatorId) {
          throw new ForbiddenException('Not assigned to you');
        }

        if (!(allowedFrom as ClaimStatus[]).includes(currentClaim.status)) {
          throw new BadRequestException(
            `Cannot change status from ${currentClaim.status} to ${target}`,
          );
        }

        const updated = await tx.claim.update({
          where: {
            claimId,
            evaluatorId,
            status: { in: allowedFrom },
          },
          data: { status: target },
          select: { claimId: true, status: true, updatedAt: true },
        });

        await tx.claimActivity.create({
          data: {
            claimId,
            performedById: evaluatorId,
            action: 'STATUS_UPDATE',
            fromStatus: currentClaim.status,
            toStatus: target,
            reason: dto.reason ?? null,
          },
        });

        return { updated, oldStatus: currentClaim.status, companyId: currentClaim.companyId };
      });

      // Notifications (only if it actually changed)
      const changed = oldStatus !== updated.status;
      if (changed) {
        // Participant fan-out (contractor, insurer reps, other evaluator if any; excludes actor)
        await this.notifications.createClaimStatusNotification(
          claimId,
          oldStatus,
          updated.status,
          evaluatorId,
          {
            reason: dto.reason ?? null,
            exposeReasonInBody: true,
            directContractorCard: false,
          },
        );

        // Optional: ping Claim Managers when resolved (scoped to same insurer)
        if (
          updated.status === ClaimStatus.RESOLVED ||
          updated.status === ClaimStatus.RESOLVED_IN_COURT
        ) {
          const managers = await this.prisma.user.findMany({
            where: {
              status: UserStatus.ACTIVE,
              role: { name: 'Claim Manager' },
              insuranceCompanyId: companyId, // keep it tenant-scoped
            },
            select: { id: true },
          });

          if (managers.length) {
            const title =
              updated.status === ClaimStatus.RESOLVED
                ? 'Claim Resolved'
                : 'Claim Resolved in Court';
            const body =
              updated.status === ClaimStatus.RESOLVED
                ? 'The claim has been resolved by the evaluator.'
                : 'The claim has been marked as resolved in court by the evaluator.';

            await Promise.all(
              managers.map((m) =>
                this.prisma.notification.create({
                  data: {
                    userId: m.id,
                    type: NotificationType.CLAIM_STATUS_CHANGED, // swap to a more specific enum if you have one
                    title,
                    body,
                    data: { claimId, status: updated.status },
                    actorId: evaluatorId,
                    claimId,
                  },
                }),
              ),
            );
          }
        }
      }

      return {
        message: 'Status updated',
        data: {
          claimId: updated.claimId,
          status: updated.status,
          updatedAt: updated.updatedAt,
        },
      };
    } catch (err) {
      console.error('updateStatus (evaluator) error:', err);
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to update status');
    }
  }


  /** Evaluator dashboard: counts + recent assigned */
  async myDashboard(evaluatorId: string) {
    try {
      const [rawCounts, recent] = await Promise.all([
        this.prisma.claim.groupBy({
          by: ['status'],
          where: { evaluatorId },
          _count: { _all: true },
          orderBy: { status: 'asc' },
        }) as unknown as Promise<CountRow[]>,
        this.prisma.claim.findMany({
          where: { evaluatorId },
          orderBy: { submissionDate: 'desc' },
          take: 5,
          select: {
            claimId: true,
            ClaimTitle: true,
            status: true,
            submissionDate: true,
            submittedBy: { select: { id: true, name: true, email: true } },
            company: { select: { companyId: true, name: true } },
          },
        }),
      ]);

      const countsByStatus = Object.values(ClaimStatus).reduce(
        (acc, s) => ((acc[s as ClaimStatus] = 0), acc),
        {} as Record<ClaimStatus, number>,
      );
      for (const row of rawCounts) countsByStatus[row.status] = row._count._all;

      const totalClaims = Object.values(countsByStatus).reduce((a, b) => a + b, 0);

      return {
        summary: {
          totalClaims,
          approved: countsByStatus.APPROVED ?? 0,
          inEvaluation: countsByStatus.IN_EVALUATION ?? 0,
          resolved: countsByStatus.RESOLVED ?? 0,
          inCourt: countsByStatus.RESOLVED_IN_COURT ?? 0,
          submitted: countsByStatus.SUBMITTED ?? 0, // rare but visible if pre-assigned in your flow
          rejected: countsByStatus.REJECTED ?? 0,   // usually 0 for evaluators
        },
        recent,
      };
    } catch (err) {
      console.error('evaluator dashboard error:', err);

      // If it's already an HttpException, re-throw it
      if (err instanceof HttpException) {
        throw err;
      }

      throw new InternalServerErrorException('Failed to build evaluator dashboard');
    }
  }
}