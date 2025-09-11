import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { Prisma, ClaimStatus, $Enums } from '@prisma/client';

import { QueryClaimsDto } from './dtos/query-claims.dto';
import {
  UpdateInsuranceClaimStatusDto,
  InsuranceAllowedStatus,
} from './dtos/update-claim-status.dto';

type CountRow = { status: $Enums.ClaimStatus; _count: { _all: number } };

@Injectable()
export class InsuranceRepClaimService {
  constructor(private readonly prisma: DatabaseService) { }

  /** Insurance: list claims for my company (filters + pagination) */
async findAllForInsurance(userId: string, q?: QueryClaimsDto) {
  try {
    const rep = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { insuranceCompanyId: true },
    });

    if (!rep?.insuranceCompanyId) {
      throw new ForbiddenException('User is not linked to an insurance company.');
    }

    const {
      status,
      submittedFrom,
      submittedTo,
      search,
      page = 1,
      pageSize = 10,
    } = q ?? {};

    const where: Prisma.ClaimWhereInput = { companyId: rep.insuranceCompanyId };

    // --- status: array or single ---
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
        select: {
          claimId: true,
          ClaimTitle: true,
          status: true,
          submissionDate: true,
          company: { select: { companyId: true, name: true } },
          submittedBy: { select: { id: true, name: true, email: true } },
          evaluator: { select: { id: true, name: true, email: true } },
          _count: { select: { documents: true } },
        },
        orderBy: { submissionDate: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.claim.count({ where }),
    ]);

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
  } catch (error) {
    console.error('findAllForInsurance error:', error);
    if (error instanceof BadRequestException || error instanceof ForbiddenException) throw error;
    throw new InternalServerErrorException('Failed to list claims for insurer');
  }
}



  /** Insurance: get single claim by ID */
// service method: add company.email, company.representatives, and uploader.phoneNumber
async findOneForInsurance(userId: string, claimId: string) {
  try {
    const rep = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { insuranceCompanyId: true },
    });
    if (!rep?.insuranceCompanyId) {
      throw new ForbiddenException('User is not linked to an insurance company.');
    }

    const claim = await this.prisma.claim.findUnique({
      where: { claimId },
      select: {
        claimId: true,
        submissionDate: true,
        status: true,
        ClaimTitle: true,

        submittedBy: {
          select: { id: true, name: true, email: true, phoneNumber: true },
        },

        evaluator: {
          select: { id: true, name: true, email: true, phoneNumber: true },
        },

        company: {
          select: {
            companyId: true,
            name: true,
            email: true, 
            representatives: { 
              select: { id: true, name: true, email: true, phoneNumber: true },
              
            },
          },
        },

        documents: {
          select: {
            documentId: true,
            documentType: true,
            filePath: true,
            uploadDate: true,
            uploader: {
              
              select: { id: true, name: true, email: true, phoneNumber: true },
            },
          },
          orderBy: { uploadDate: 'desc' },
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

        createdAt: true,
        updatedAt: true,
      },
    });

    if (!claim) throw new NotFoundException('Claim not found.');
    if (claim.company.companyId !== rep.insuranceCompanyId) {
      throw new ForbiddenException('You can only view claims for your company.');
    }

    return claim;
  } catch (error) {
    console.error('findOneForInsurance error:', error);
    if (error instanceof NotFoundException || error instanceof ForbiddenException) throw error;
    throw new InternalServerErrorException('Failed to fetch claim for insurer');
  }
}


  /** Insurance: update claim status to APPROVED or REJECTED only */
  async updateStatusAsInsurance(
  userId: string,
  claimId: string,
  dto: UpdateInsuranceClaimStatusDto,
) {
  try {
    const rep = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { insuranceCompanyId: true },
    });
    if (!rep?.insuranceCompanyId) {
      throw new ForbiddenException('User is not linked to an insurance company.');
    }

    // Map incoming insurer-allowed status to ClaimStatus
    let next: ClaimStatus;
    switch (dto.status) {
      case InsuranceAllowedStatus.APPROVED:
        next = ClaimStatus.APPROVED;
        break;
      case InsuranceAllowedStatus.REJECTED:
        next = ClaimStatus.REJECTED;
        break;
      default:
        throw new BadRequestException('Invalid insurer status');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const claim = await tx.claim.findUnique({
        where: { claimId },
        select: { claimId: true, companyId: true, status: true, updatedAt: true },
      });
      if (!claim) throw new NotFoundException('Claim not found.');
      if (claim.companyId !== rep.insuranceCompanyId) {
        throw new ForbiddenException('You can only act on claims for your company.');
      }

      // Allow transitions FROM: SUBMITTED, APPROVED, REJECTED
      const allowedFrom = new Set<ClaimStatus>([
        ClaimStatus.SUBMITTED,
        ClaimStatus.APPROVED,
        ClaimStatus.REJECTED,
      ]);
      if (!allowedFrom.has(claim.status)) {
        throw new BadRequestException(
          `Cannot change status from ${claim.status}. Allowed from: SUBMITTED, APPROVED, REJECTED.`,
        );
      }

      // If no change, return current state without writing/logging
      if (claim.status === next) {
        return { claimId: claim.claimId, status: claim.status, updatedAt: claim.updatedAt };
      }

      const updated = await tx.claim.update({
        where: { claimId },
        data: { status: next },
        select: { claimId: true, status: true, updatedAt: true },
      });

      await tx.claimActivity.create({
        data: {
          claimId,
          performedById: userId,
          action: 'STATUS_UPDATE',
          fromStatus: claim.status,
          toStatus: next,
          reason: dto.reason ?? null,
        },
      });

      return updated;
    });

    // Tailored message depending on whether we actually changed something
    const changed = result.status === next;
    return { message: changed ? 'Status updated' : 'Status unchanged', data: result };
  } catch (error) {
    console.error('updateStatusAsInsurance error:', error);
    if (
      error instanceof BadRequestException ||
      error instanceof ForbiddenException ||
      error instanceof NotFoundException
    ) {
      throw error;
    }
    throw new InternalServerErrorException('Failed to update status');
  }
}


  /** Insurance: dashboard summary */
  async insuranceDashboard(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { insuranceCompanyId: true },
      });
      if (!user?.insuranceCompanyId) {
        throw new ForbiddenException('User is not linked to an insurance company.');
      }

      const [rawCounts, recent] = await Promise.all([
        this.prisma.claim.groupBy({
          by: ['status'],
          where: { companyId: user.insuranceCompanyId },
          _count: { _all: true },
          orderBy: { status: 'asc' },
        }) as unknown as Promise<CountRow[]>,
        this.prisma.claim.findMany({
          where: { companyId: user.insuranceCompanyId },
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

      // zero-map from CURRENT enum values
      const countsByStatus = (Object.values(ClaimStatus) as $Enums.ClaimStatus[]).reduce(
        (acc, s) => {
          acc[s] = 0;
          return acc;
        },
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
          inReview: countsByStatus.IN_EVALUATION ?? 0,
          resolved: countsByStatus.RESOLVED ?? 0,
          inCourt: countsByStatus.RESOLVED_IN_COURT ?? 0,
        },
        recent,
      };
    } catch (error) {
      console.error('Error building insurance dashboard:', error);
      throw new InternalServerErrorException('Failed to build insurance dashboard');
    }
  }

}
