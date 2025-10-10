import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
    InternalServerErrorException,
} from '@nestjs/common';

import { DatabaseService } from 'src/database/database.service';
import { Prisma, ClaimStatus, $Enums } from '@prisma/client';
import { CreateClaimDto } from './dtos/create-claim.dto';
import { UpdateClaimDto } from './dtos/update-claim.dto';
import { QueryClaimsDto } from './dtos/query-claims.dto';
import { NotificationsService } from 'src/notifications/notifications.service';
import { ClaimType } from '@prisma/client';

type CountRow = { status: $Enums.ClaimStatus; _count: { _all: number } };

@Injectable()
export class ContractorClaimService {
    constructor(
        private readonly prisma: DatabaseService,
        private readonly notifications: NotificationsService,
    ) { }

    /** Contractor creates a claim (defaults to SUBMITTED) */
    async createForContractor(submitterId: string, dto: CreateClaimDto) {
        try {
            const company = await this.prisma.insuranceCompany.findUnique({
                where: { companyId: dto.companyId },
                select: { companyId: true },
            });
            if (!company) throw new BadRequestException('Insurance company not found');

            const claim = await this.prisma.claim.create({
                data: {
                    submittedById: submitterId,
                    companyId: dto.companyId,
                    ClaimTitle: dto.claimTitle,
                    claimType: dto.claimType,
                },
                include: {
                    company: { select: { companyId: true, name: true } },
                    submittedBy: { select: { id: true, name: true, email: true } },
                },
            });

            // Send "new claim submitted" notification
            await this.notifications.createNewClaimSubmittedNotification(
                claim.claimId,
                submitterId,
            );

            return { message: 'Claim submitted', data: claim };
        } catch (error) {
            console.error('Error creating claim:', error);
            throw new InternalServerErrorException('Failed to create claim');
        }
    }


    /** Contractor can update ONLY while SUBMITTED */
    async updateMyClaim(claimId: string, submitterId: string, dto: UpdateClaimDto) {
        try {
            const existing = await this.prisma.claim.findUnique({
                where: { claimId },
                select: { claimId: true, submittedById: true, status: true, ClaimTitle: true },
            });
            if (!existing) throw new NotFoundException('Claim not found');
            if (existing.submittedById !== submitterId) {
                throw new ForbiddenException('You can only update your own claim');
            }
            if (existing.status !== ClaimStatus.SUBMITTED) {
                throw new BadRequestException('Claim can only be edited while SUBMITTED');
            }

            if (dto.companyId) {
                const company = await this.prisma.insuranceCompany.findUnique({
                    where: { companyId: dto.companyId },
                    select: { companyId: true },
                });
                if (!company) throw new BadRequestException('Insurance company not found');
            }

            const updated = await this.prisma.claim.update({
                where: { claimId },
                data: {
                    ...(dto.claimTitle ? { ClaimTitle: dto.claimTitle } : {}),
                    ...(dto.companyId ? { companyId: dto.companyId } : {}),
                    ...(dto.claimType ? { claimType: dto.claimType } : {}),
                },
                include: { company: true },
            });

            // "claim edited" notification
            await this.notifications.createClaimEditedNotification(
                updated.claimId,
                submitterId,
            );

            return { message: 'Claim updated', data: updated };
        } catch (error) {
            console.error('Error updating claim:', error);
            if (
                error instanceof BadRequestException ||
                error instanceof ForbiddenException ||
                error instanceof NotFoundException
            ) throw error;
            throw new InternalServerErrorException('Failed to update claim');
        }
    }


    /** Single claim, owned by contractor */
    async getMyClaim(claimId: string, submitterId: string) {
        try {
            const claim = await this.prisma.claim.findUnique({
                where: { claimId },
                include: {
                    // company + (optional) main contacts
                    company: {
                        select: {
                            companyId: true,
                            name: true,
                            email: true,
                            // pull any company users you consider representatives
                            representatives: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true,
                                    phoneNumber: true,
                                },
                            },
                        },
                    },

                    // documents + who uploaded each document
                    documents: {
                        select: {
                            documentId: true,
                            documentType: true,
                            filePath: true,
                            createdAt: true,
                            updatedAt: true,
                            uploader: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true,
                                    phoneNumber: true,
                                },
                            },
                        },
                    },

                    // evaluator/user assigned to evaluate the claim
                    evaluator: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phoneNumber: true,
                        },
                    },

                    // submitter/contractor (the person who created the claim)
                    submittedBy: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phoneNumber: true,
                        },
                    },
                    // activities log
                    activities: {
                        orderBy: { createdAt: 'desc' },
                        select: {
                            id: true, createdAt: true, action: true,
                            fromStatus: true, toStatus: true,
                            reason: true,                                 // <-- keep reason
                            performedBy: { select: { id: true, name: true, email: true } },
                        },
                    },
                },
            });

            if (!claim) throw new NotFoundException('Claim not found');
            if (claim.submittedById !== submitterId) {
                throw new ForbiddenException('You can only view your own claim');
            }

            return claim;
        } catch (error) {
            console.error('Error fetching claim:', error);
            if (error instanceof ForbiddenException || error instanceof NotFoundException) throw error;
            throw new InternalServerErrorException('Failed to fetch claim');
        }
    }

    /** List my claims (filters + pagination) */
    async listMyClaims(submitterId: string, q: QueryClaimsDto) {
        try {
            const {
                status,
                companyId,
                submittedFrom,
                submittedTo,
                search,
                page = 1,
                pageSize = 10,
            } = q ?? {};

            const where: Prisma.ClaimWhereInput = { submittedById: submitterId };

            if (companyId) where.companyId = companyId;

            // status can be single or array (from query param parsing)
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
                    include: { company: true, documents: true },
                    orderBy: { submissionDate: 'desc' },
                    skip,
                    take: pageSize,
                }),
                this.prisma.claim.count({ where }),
            ]);

            const message =
                total === 0
                    ? 'No claims found for the selected filters.'
                    : 'Claims retrieved successfully.';

            return {
                message,
                data: items,
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize),
            };
        } catch (error) {
            console.error('Error listing claims:', error);
            if (error instanceof BadRequestException) throw error;
            throw new InternalServerErrorException('Failed to list claims');
        }
    }



    /** Dashboard summary for contractor */
    async myDashboard(submitterId: string) {
        try {
            const [rawCounts, recent] = await Promise.all([
                this.prisma.claim.groupBy({
                    by: ['status'],
                    where: { submittedById: submitterId },
                    _count: { _all: true },
                    orderBy: { status: 'asc' },
                }) as unknown as Promise<CountRow[]>,
                this.prisma.claim.findMany({
                    where: { submittedById: submitterId },
                    orderBy: { submissionDate: 'desc' },
                    take: 5,
                    select: {
                        claimId: true,
                        ClaimTitle: true,
                        status: true,
                        submissionDate: true,
                        company: { select: { companyId: true, name: true } },
                    },
                }),
            ]);

            // zero-map from CURRENT enum so future edits don’t break counts
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
                    inReview: countsByStatus.IN_EVALUATION ?? 0,
                    resolved: countsByStatus.RESOLVED ?? 0,
                    inCourt: countsByStatus.RESOLVED_IN_COURT ?? 0,
                },
                recent,
            };
        } catch (error) {
            console.error('Error building dashboard:', error);
            throw new InternalServerErrorException('Failed to build dashboard');
        }
    }

}
