import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
    InternalServerErrorException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateClaimDto } from './dtos/create-claim.dto';
import { UpdateClaimDto } from './dtos/update-claim.dto';
import { QueryClaimsDto } from './dtos/query-claims.dto';
import { $Enums, ClaimStatus } from '@prisma/client';
import {
    //UpdateClaimStatusDto,
    InsuranceAllowedStatus,
} from './dtos/update-claim-status.dto';

type CountRow = { status: $Enums.ClaimStatus; _count: { _all: number } };

@Injectable()
export class ClaimService {
    constructor(private prisma: DatabaseService) { }

    // /** Contractor creates a claim (defaults to SUBMITTED) */
    // async createForContractor(submitterId: string, dto: CreateClaimDto) {
    //     try {
    //         const company = await this.prisma.insuranceCompany.findUnique({
    //             where: { companyId: dto.companyId },
    //             select: { companyId: true },
    //         });
    //         if (!company) throw new BadRequestException('Insurance company not found');

    //         const claim = await this.prisma.claim.create({
    //             data: {
    //                 submittedById: submitterId,
    //                 companyId: dto.companyId,
    //                 ClaimTitle: dto.claimTitle ?? null,
    //             },
    //             include: {
    //                 company: true,
    //                 submittedBy: true,
    //             },
    //         });

    //         return { message: 'Claim submitted', data: claim };
    //     } catch (error) {
    //         console.error('Error creating claim:', error);
    //         throw new InternalServerErrorException('Failed to create claim');
    //     }
    // }

    // /** Contractor can update ONLY while SUBMITTED */
    // async updateMyClaim(claimId: string, submitterId: string, dto: UpdateClaimDto) {
    //     try {
    //         const existing = await this.prisma.claim.findUnique({
    //             where: { claimId },
    //             select: { claimId: true, submittedById: true, status: true, ClaimTitle: true },
    //         });
    //         if (!existing) throw new NotFoundException('Claim not found');
    //         if (existing.submittedById !== submitterId) {
    //             throw new ForbiddenException('You can only update your own claim');
    //         }
    //         if (existing.status !== ClaimStatus.SUBMITTED) {
    //             throw new BadRequestException('Claim can only be edited while SUBMITTED');
    //         }

    //         const updated = await this.prisma.claim.update({
    //             where: { claimId },
    //             data: {
    //                 ClaimTitle: dto.claimTitle ?? existing.ClaimTitle,
    //             },
    //             include: { company: true },
    //         });

    //         return { message: 'Claim updated', data: updated };
    //     } catch (error) {
    //         console.error('Error updating claim:', error);
    //         throw error instanceof BadRequestException ||
    //             error instanceof ForbiddenException ||
    //             error instanceof NotFoundException
    //             ? error
    //             : new InternalServerErrorException('Failed to update claim');
    //     }
    // }

    // /** Single claim, owned by contractor */
    // async getMyClaim(claimId: string, submitterId: string) {
    //     try {
    //         const claim = await this.prisma.claim.findUnique({
    //             where: { claimId },
    //             include: {
    //                 company: true,
    //                 documents: true,
    //                 evaluator: true,
    //             },
    //         });
    //         if (!claim) throw new NotFoundException('Claim not found');
    //         if (claim.submittedById !== submitterId) {
    //             throw new ForbiddenException('You can only view your own claim');
    //         }
    //         return claim;
    //     } catch (error) {
    //         console.error('Error fetching claim:', error);
    //         throw error instanceof ForbiddenException || error instanceof NotFoundException
    //             ? error
    //             : new InternalServerErrorException('Failed to fetch claim');
    //     }
    // }

    // /** List my claims (filters + pagination) */
    // async listMyClaims(submitterId: string, q: QueryClaimsDto) {
    //     try {
    //         const {
    //             status,
    //             companyId,
    //             submittedFrom,
    //             submittedTo,
    //             search,
    //             page = 1,
    //             pageSize = 10,
    //         } = q;

    //         const where: any = { submittedById: submitterId };
    //         if (status) where.status = status;
    //         if (companyId) where.companyId = companyId;
    //         if (submittedFrom || submittedTo) {
    //             where.submissionDate = {};
    //             if (submittedFrom) where.submissionDate.gte = new Date(submittedFrom);
    //             if (submittedTo) where.submissionDate.lte = new Date(submittedTo);
    //         }
    //         if (search) {
    //             where.OR = [{ ClaimTitle: { contains: search, mode: 'insensitive' } }];
    //         }

    //         const skip = (page - 1) * pageSize;

    //         const [items, total] = await this.prisma.$transaction([
    //             this.prisma.claim.findMany({
    //                 where,
    //                 include: {
    //                     company: true,
    //                     documents: true,
    //                 },
    //                 orderBy: { submissionDate: 'desc' },
    //                 skip,
    //                 take: pageSize,
    //             }),
    //             this.prisma.claim.count({ where }),
    //         ]);

    //         return {
    //             data: items,
    //             page,
    //             pageSize,
    //             total,
    //             totalPages: Math.ceil(total / pageSize),
    //         };
    //     } catch (error) {
    //         console.error('Error listing claims:', error);
    //         throw new InternalServerErrorException('Failed to list claims');
    //     }
    // }

    // /** Dashboard summary for contractor */
    // async myDashboard(submitterId: string) {
    //     try {
    //         const [rawCounts, recent] = await Promise.all([
    //             this.prisma.claim.groupBy({
    //                 by: ['status'],
    //                 where: { submittedById: submitterId },
    //                 _count: { _all: true },
    //                 orderBy: { status: 'asc' },
    //             }) as unknown as Promise<CountRow[]>,
    //             this.prisma.claim.findMany({
    //                 where: { submittedById: submitterId },
    //                 orderBy: { submissionDate: 'desc' },
    //                 take: 5,
    //                 select: {
    //                     claimId: true,
    //                     ClaimTitle: true,
    //                     status: true,
    //                     submissionDate: true,
    //                     company: { select: { companyId: true, name: true } },
    //                 },
    //             }),
    //         ]);

    //         const countsByStatus = (Object.values(ClaimStatus) as $Enums.ClaimStatus[]).reduce(
    //             (acc, status) => {
    //                 acc[status] = 0;
    //                 return acc;
    //             },
    //             {} as Record<$Enums.ClaimStatus, number>,
    //         );

    //         for (const row of rawCounts) countsByStatus[row.status] = row._count._all;

    //         const totalClaims = Object.values(countsByStatus).reduce((a, b) => a + b, 0);

    //         return {
    //             summary: {
    //                 totalClaims,
    //                 submitted: countsByStatus.SUBMITTED ?? 0,
    //                 inReview: countsByStatus.IN_REVIEW ?? 0,
    //                 approved: countsByStatus.APPROVED ?? 0,
    //                 rejected: countsByStatus.REJECTED ?? 0,
    //                 completed: countsByStatus.COMPLETED ?? 0,
    //                 resolved: (countsByStatus as any).RESOLVED ?? 0,
    //                 inCourt:
    //                     countsByStatus.RESOLVED_IN_COURT ??
    //                     (countsByStatus as any).IN_COURT ??
    //                     0,
    //                 assigned:
    //                     (countsByStatus as any).ASSIGNED ??
    //                     (countsByStatus as any).ASSINGED ??
    //                     0,
    //             },
    //             recent,
    //         };
    //     } catch (error) {
    //         console.error('Error building dashboard:', error);
    //         throw new InternalServerErrorException('Failed to build dashboard');
    //     }
    // }

    // /**
    //  * ======================================================================================
    //  * INSURER METHODS 
    //  * ======================================================================================
    //  */

    // // Insurance: list claims for my company (filters + pagination)
    // async findAllForInsurance(userId: string, q?: QueryClaimsDto) {
    //     try {
    //         const rep = await this.prisma.user.findUnique({
    //             where: { id: userId },
    //             select: { insuranceCompanyId: true },
    //         });

    //         if (!rep?.insuranceCompanyId) {
    //             throw new ForbiddenException('User is not linked to an insurance company.');
    //         }

    //         const {
    //             status,
    //             companyId, // ignored; insurer is scoped to their own company
    //             submittedFrom,
    //             submittedTo,
    //             search,
    //             page = 1,
    //             pageSize = 10,
    //         } = q ?? {};

    //         const where: any = { companyId: rep.insuranceCompanyId };

    //         if (status) {
    //             // normalize/validate status
    //             if (!Object.values(ClaimStatus).includes(status as ClaimStatus)) {
    //                 throw new BadRequestException('Invalid status filter');
    //             }
    //             where.status = status as ClaimStatus;
    //         }

    //         if (submittedFrom || submittedTo) {
    //             where.submissionDate = {};
    //             if (submittedFrom) where.submissionDate.gte = new Date(submittedFrom);
    //             if (submittedTo) where.submissionDate.lte = new Date(submittedTo);
    //         }

    //         if (search) {
    //             where.OR = [{ ClaimTitle: { contains: search, mode: 'insensitive' } }];
    //         }

    //         const skip = (page - 1) * pageSize;

    //         const [items, total] = await this.prisma.$transaction([
    //             this.prisma.claim.findMany({
    //                 where,
    //                 include: {
    //                     company: { select: { companyId: true, name: true } },
    //                     submittedBy: { select: { id: true, name: true, email: true } },
    //                     evaluator: { select: { id: true, name: true, email: true } },
    //                     documents: false, // fetch separately if needed; keeps list fast
    //                 },
    //                 orderBy: { submissionDate: 'desc' },
    //                 skip,
    //                 take: pageSize,
    //             }),
    //             this.prisma.claim.count({ where }),
    //         ]);

    //         return {
    //             data: items,
    //             page,
    //             pageSize,
    //             total,
    //             totalPages: Math.ceil(total / pageSize),
    //         };
    //     } catch (error) {
    //         console.error('findAllForInsurance error:', error);
    //         if (error instanceof BadRequestException || error instanceof ForbiddenException) throw error;
    //         throw new InternalServerErrorException('Failed to list claims for insurer');
    //     }
    // }

    // //========================================================================================

    // // Insurance: update claim status to APPROVED or REJECTED only
    // async updateStatusAsInsurance(
    //     userId: string,
    //     claimId: string,
    //     dto: UpdateClaimStatusDto,
    // ) {
    //     try {
    //         const rep = await this.prisma.user.findUnique({
    //             where: { id: userId },
    //             select: { insuranceCompanyId: true },
    //         });
    //         if (!rep?.insuranceCompanyId) {
    //             throw new ForbiddenException('User is not linked to an insurance company.');
    //         }

    //         // Map allowed enum from DTO to Prisma enum
    //         let next: ClaimStatus;
    //         switch (dto.status) {
    //             case InsuranceAllowedStatus.APPROVED:
    //                 next = ClaimStatus.APPROVED;
    //                 break;
    //             case InsuranceAllowedStatus.REJECTED:
    //                 next = ClaimStatus.REJECTED;
    //                 break;
    //             default:
    //                 throw new BadRequestException('Invalid insurer status');
    //         }

    //         // Guarded update to avoid race: update only if claim is in allowed states and belongs to company
    //         const { count } = await this.prisma.claim.updateMany({
    //             where: {
    //                 claimId,
    //                 companyId: rep.insuranceCompanyId,
    //                 status: { in: [ClaimStatus.SUBMITTED, ClaimStatus.IN_REVIEW] },
    //             },
    //             data: { status: next },
    //         });

    //         if (count === 0) {
    //             // figure out why: wrong company, wrong state, or not found
    //             const check = await this.prisma.claim.findUnique({
    //                 where: { claimId },
    //                 select: { companyId: true, status: true },
    //             });
    //             if (!check) throw new NotFoundException('Claim not found.');
    //             if (check.companyId !== rep.insuranceCompanyId) {
    //                 throw new ForbiddenException('You can only act on claims for your company.');
    //             }
    //             throw new BadRequestException(`Cannot change status from ${check.status}.`);
    //         }

    //         // fetch the updated record to return
    //         const updated = await this.prisma.claim.findUnique({
    //             where: { claimId },
    //             select: {
    //                 claimId: true,
    //                 status: true,
    //                 updatedAt: true,
    //             },
    //         });

    //         return { message: 'Status updated', data: updated };
    //     } catch (error) {
    //         console.error('updateStatusAsInsurance error:', error);
    //         if (
    //             error instanceof BadRequestException ||
    //             error instanceof ForbiddenException ||
    //             error instanceof NotFoundException
    //         ) throw error;
    //         throw new InternalServerErrorException('Failed to update status');
    //     }
    // }



    // //========================================================================================

    // // Insurance: get single claim by ID
    // async findOneForInsurance(userId: string, claimId: string) {
    //     try {
    //         const rep = await this.prisma.user.findUnique({
    //             where: { id: userId },
    //             select: { insuranceCompanyId: true },
    //         });
    //         if (!rep?.insuranceCompanyId) {
    //             throw new ForbiddenException('User is not linked to an insurance company.');
    //         }

    //         const claim = await this.prisma.claim.findUnique({
    //             where: { claimId },
    //             select: {
    //                 claimId: true,
    //                 submissionDate: true,
    //                 status: true,
    //                 ClaimTitle: true,
    //                 submittedBy: { select: { id: true, name: true, email: true } },
    //                 evaluator: { select: { id: true, name: true, email: true } },
    //                 company: { select: { companyId: true, name: true } },
    //                 documents: {
    //                     select: {
    //                         documentId: true,
    //                         documentType: true,
    //                         filePath: true,
    //                         uploadDate: true,
    //                         uploader: { select: { id: true, name: true, email: true } },
    //                     },
    //                     orderBy: { uploadDate: 'desc' },
    //                 },
    //                 createdAt: true,
    //                 updatedAt: true,
    //             },
    //         });

    //         if (!claim) throw new NotFoundException('Claim not found.');
    //         if (claim.company.companyId !== rep.insuranceCompanyId) {
    //             throw new ForbiddenException('You can only view claims for your company.');
    //         }

    //         return claim;
    //     } catch (error) {
    //         console.error('findOneForInsurance error:', error);
    //         if (error instanceof NotFoundException || error instanceof ForbiddenException) throw error;
    //         throw new InternalServerErrorException('Failed to fetch claim for insurer');
    //     }
    // }

    // //===============================================================================================

    // // Insurance: dashboard summary
    // async insuranceDashboard(userId: string) {
    //     try {
    //         //  Get the rep's company
    //         const user = await this.prisma.user.findUnique({
    //             where: { id: userId },
    //             select: { insuranceCompanyId: true },
    //         });

    //         if (!user?.insuranceCompanyId) {
    //             throw new ForbiddenException(
    //                 'User is not linked to an insurance company.',
    //             );
    //         }

    //         // Parallel queries: counts by status + recent claims for this company
    //         const [rawCounts, recent] = await Promise.all([
    //             this.prisma.claim.groupBy({
    //                 by: ['status'],
    //                 where: { companyId: user.insuranceCompanyId },
    //                 _count: { _all: true },
    //                 orderBy: { status: 'asc' },
    //             }) as unknown as Promise<CountRow[]>,
    //             this.prisma.claim.findMany({
    //                 where: { companyId: user.insuranceCompanyId },
    //                 orderBy: { submissionDate: 'desc' },
    //                 take: 5,
    //                 select: {
    //                     claimId: true,
    //                     ClaimTitle: true,
    //                     status: true,
    //                     submissionDate: true,
    //                     submittedBy: { select: { id: true, name: true, email: true } },
    //                     evaluator: { select: { id: true, name: true, email: true } },
    //                     company: { select: { companyId: true, name: true } },
    //                 },
    //             }),
    //         ]);

    //         // Build a zeroed map of all statuses, then fill from groupBy
    //         const countsByStatus = (Object.values(
    //             ClaimStatus,
    //         ) as $Enums.ClaimStatus[]).reduce((acc, status) => {
    //             acc[status] = 0;
    //             return acc;
    //         }, {} as Record<$Enums.ClaimStatus, number>);

    //         for (const row of rawCounts) {
    //             countsByStatus[row.status] = row._count._all;
    //         }

    //         const totalClaims = Object.values(countsByStatus).reduce(
    //             (a, b) => a + b,
    //             0,
    //         );

    //         //  Return shape mirrors your contractor dashboard
    //         return {
    //             summary: {
    //                 totalClaims,
    //                 submitted: countsByStatus.SUBMITTED ?? 0,
    //                 inReview: countsByStatus.IN_REVIEW ?? 0,
    //                 approved: countsByStatus.APPROVED ?? 0,
    //                 rejected: countsByStatus.REJECTED ?? 0,
    //                 completed: countsByStatus.COMPLETED ?? 0,
    //                 resolved: (countsByStatus as any).RESOLVED ?? 0,
    //                 inCourt:
    //                     countsByStatus.RESOLVED_IN_COURT ??
    //                     (countsByStatus as any).IN_COURT ??
    //                     0,
    //                 assigned:
    //                     (countsByStatus as any).ASSIGNED ??
    //                     (countsByStatus as any).ASSINGED ??
    //                     0,
    //             },
    //             recent,
    //         };
    //     } catch (error) {
    //         console.error('Error building insurance dashboard:', error);
    //         throw new InternalServerErrorException(
    //             'Failed to build insurance dashboard',
    //         );
    //     }
    // }


}
