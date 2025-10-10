// src/notifications/notification.service.ts
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { NotificationType, ClaimStatus, UserStatus } from '@prisma/client';
import { AdminListNotificationsDto } from './dtos/admin-list.dto';

type StatusNotifOpts = {
  reason?: string | null;
  exposeReasonInBody?: boolean;   // default true: append "Reason: ..." to body
  directContractorCard?: boolean; // optional extra card to contractor (kept for UX)
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: DatabaseService) { }

  // 🔔 New claim submitted (notifies insurer reps; optionally the submitter)
  async createNewClaimSubmittedNotification(claimId: string, actorId: string) {
    const claim = await this.prisma.claim.findUnique({
      where: { claimId },
      include: {
        company: {
          include: {
            representatives: {
              where: { status: UserStatus.ACTIVE },
              select: { id: true },
            },
          },
        },
        submittedBy: { select: { id: true } },
      },
    });
    if (!claim) throw new Error('Claim not found');

    const recipients = new Set<string>();
    claim.company.representatives.forEach((u) => recipients.add(u.id));
    // If you also want to notify the submitter, uncomment:
    // recipients.add(claim.submittedBy.id);

    const title = 'New Claim Submitted';
    const body = `New claim "${claim.ClaimTitle}" has been submitted.`;

    await Promise.all(
      Array.from(recipients).map((userId) =>
        this.prisma.notification.create({
          data: {
            userId,
            // If you have NEW_CLAIM_SUBMITTED in your enum, use it here
            type: NotificationType.CLAIM_STATUS_CHANGED,
            title,
            body,
            data: { claimId, status: ClaimStatus.SUBMITTED },
            actorId,
            claimId,
          },
        }),
      ),
    );
  }

  // 🔔 Claim edited while SUBMITTED (notifies insurer reps and existing evaluator)
  async createClaimEditedNotification(claimId: string, actorId: string) {
    const claim = await this.prisma.claim.findUnique({
      where: { claimId },
      include: {
        evaluator: { select: { id: true } },
        company: {
          include: {
            representatives: {
              where: { status: UserStatus.ACTIVE },
              select: { id: true },
            },
          },
        },
      },
    });
    if (!claim) throw new Error('Claim not found');

    const recipients = new Set<string>();
    claim.company.representatives.forEach((u) => recipients.add(u.id));
    if (claim.evaluator?.id) recipients.add(claim.evaluator.id);

    const title = 'Claim Updated';
    const body = `Claim "${claim.ClaimTitle}" was updated by the submitter.`;

    await Promise.all(
      Array.from(recipients).map((userId) =>
        this.prisma.notification.create({
          data: {
            userId,
            // If you have CLAIM_UPDATED in your enum, use it here
            type: NotificationType.CLAIM_STATUS_CHANGED,
            title,
            body,
            data: { claimId },
            actorId,
            claimId,
          },
        }),
      ),
    );
  }


  async createInsurerStatusUpdateNotifications(
    claimId: string,
    actorId: string,
    oldStatus: ClaimStatus,
    newStatus: ClaimStatus,
    opts?: {
      reason?: string | null;
      notifyClaimManagers?: boolean;            // default: true
      scopeManagersToSameCompany?: boolean;     // default: true (safer in multi-tenant)
    },
  ): Promise<void> {
    const {
      reason = null,
      notifyClaimManagers = true,
      scopeManagersToSameCompany = true,
    } = opts ?? {};

    // Load claim + participants
    const claim = await this.prisma.claim.findUnique({
      where: { claimId },
      include: {
        submittedBy: { select: { id: true } },
        evaluator: { select: { id: true } },
        company: {
          select: {
            companyId: true,
            representatives: {
              where: { status: UserStatus.ACTIVE },
              select: { id: true },
            },
          },
        },
      },
    });
    if (!claim) throw new NotFoundException('Claim not found');

    // -------- determine recipients (exclude actor) ----------
    const recipientIds = new Set<string>();

    if (claim.submittedBy?.id && claim.submittedBy.id !== actorId) {
      recipientIds.add(claim.submittedBy.id);
    }
    if (claim.evaluator?.id && claim.evaluator.id !== actorId) {
      recipientIds.add(claim.evaluator.id);
    }
    for (const rep of claim.company.representatives) {
      if (rep.id !== actorId) recipientIds.add(rep.id);
    }

    // Optionally notify Claim Managers
    if (notifyClaimManagers) {
      const managerWhere: any = {
        status: UserStatus.ACTIVE,
        role: { name: 'Claim Manager' },
      };
      if (scopeManagersToSameCompany) {
        // Only managers from the same insurer/company
        managerWhere.insuranceCompanyId = claim.company.companyId;
      }
      const managers = await this.prisma.user.findMany({
        where: managerWhere,
        select: { id: true },
      });
      for (const m of managers) {
        if (m.id !== actorId) recipientIds.add(m.id);
      }
    }

    // -------- craft message ----------
    const title =
      newStatus === ClaimStatus.APPROVED
        ? 'Claim Approved'
        : newStatus === ClaimStatus.REJECTED
          ? 'Claim Rejected'
          : 'Claim Status Updated';

    const baseBody = `Claim "${/* keep safe if nullable */ String(
      (claim as any).ClaimTitle ?? '—',
    )}" status changed from ${oldStatus} to ${newStatus}`;
    const body = reason ? `${baseBody}. Reason: ${reason}` : baseBody;

    // Choose a type (swap to specific enums if you have them)
    const type =
      newStatus === ClaimStatus.APPROVED
        ? NotificationType.CLAIM_STATUS_CHANGED /* NotificationType.CLAIM_APPROVED */
        : newStatus === ClaimStatus.REJECTED
          ? NotificationType.CLAIM_STATUS_CHANGED /* NotificationType.CLAIM_REJECTED */
          : NotificationType.CLAIM_STATUS_CHANGED;

    // -------- persist notifications ----------
    const recipients = Array.from(recipientIds);
    if (recipients.length === 0) return;

    await Promise.all(
      recipients.map((userId) =>
        this.prisma.notification.create({
          data: {
            userId,
            type,
            title,
            body,
            data: { claimId, oldStatus, newStatus, reason: reason ?? undefined },
            actorId,
            claimId,
          },
        }),
      ),
    );

    // If you have a WebSocket gateway, emit here (optional):
    // for (const userId of recipients) {
    //   this.gateway.emitToUser(userId, 'notification:new', { claimId, title, body, type });
    // }
  }



  /* -------------------- PARTICIPATION HELPERS -------------------- */

  /** Return participant userIds for a claim (submitter, evaluator, active insurer reps). */
  async getClaimParticipantIds(claimId: string): Promise<Set<string>> {
    const claim = await this.prisma.claim.findUnique({
      where: { claimId },
      select: {
        claimId: true,
        submittedById: true,
        evaluatorId: true,
        company: {
          select: {
            representatives: {
              where: { status: UserStatus.ACTIVE },
              select: { id: true },
            },
          },
        },
      },
    });
    if (!claim) throw new NotFoundException('Claim not found');

    const ids = new Set<string>();
    if (claim.submittedById) ids.add(claim.submittedById);
    if (claim.evaluatorId) ids.add(claim.evaluatorId);
    claim.company.representatives.forEach((u) => ids.add(u.id));
    return ids;
  }

  /**
   * Check if a user participates in the claim.
   * Optionally allow privileged roles (Admin/Claim Manager) to pass even if not listed.
   */
  async isClaimParticipant(
    userId: string,
    claimId: string,
    { allowPrivileged = true }: { allowPrivileged?: boolean } = {},
  ): Promise<boolean> {
    const [participants, user] = await Promise.all([
      this.getClaimParticipantIds(claimId),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: { select: { name: true } } },
      }),
    ]);

    if (!user) return false;

    if (participants.has(userId)) return true;

    if (allowPrivileged) {
      const roleName = user.role?.name ?? '';
      if (roleName === 'Admin' || roleName === 'Claim Manager') return true;
    }

    return false;
  }

  /** Throw if user is not allowed to view the claim’s notifications. */
  async assertClaimParticipant(userId: string, claimId: string, opts?: { allowPrivileged?: boolean }) {
    const ok = await this.isClaimParticipant(userId, claimId, opts);
    if (!ok) throw new ForbiddenException('You are not a participant on this claim.');
  }

  /* -------------- PARTICIPANT-FILTERED READ API ------------------ */

  /**
   * Return notifications for a specific claim, but only if the requester participates.
   * By default we return ONLY notifications addressed to the user (userId),
   * which is safest. If you want all participant-visible records, set `addressedOnly=false`.
   */
  async getClaimNotificationsForUser(
    claimId: string,
    userId: string,
    opts: {
      page?: number;
      limit?: number;
      addressedOnly?: boolean; // default true
      unreadOnly?: boolean;
      include?: any;
    } = {},
  ) {
    const {
      page = 1,
      limit = 20,
      addressedOnly = true,
      unreadOnly = false,
      include = {
        actor: { select: { id: true, name: true, email: true } },
        claim: { select: { claimId: true, ClaimTitle: true } },
        message: { select: { messageId: true, content: true } },
      },
    } = opts;

    // gate: only participants can read claim notifications
    await this.assertClaimParticipant(userId, claimId);

    const where: any = { claimId };
    if (unreadOnly) where.readAt = null;

    // safest default: only notifications addressed to the requester
    if (addressedOnly) where.userId = userId;

    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        include,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      notifications,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  // CREATE: status change notification (submitter, evaluator, active insurer reps)
  async createClaimStatusNotification(
    claimId: string,
    oldStatus: ClaimStatus,
    newStatus: ClaimStatus,
    actorId?: string,
    opts: StatusNotifOpts = {},
  ) {
    const {
      reason = null,
      exposeReasonInBody = true,
      directContractorCard = false,
    } = opts;

    const claim = await this.prisma.claim.findUnique({
      where: { claimId },
      include: {
        submittedBy: { select: { id: true } },
        evaluator: { select: { id: true } },
        company: {
          include: {
            representatives: {
              where: { status: UserStatus.ACTIVE },
              select: { id: true },
            },
          },
        },
      },
    });
    if (!claim) throw new NotFoundException('Claim not found');

    const title =
      newStatus === ClaimStatus.APPROVED
        ? 'Claim Approved'
        : newStatus === ClaimStatus.REJECTED
          ? 'Claim Rejected'
          : newStatus === ClaimStatus.RESOLVED
            ? 'Claim Resolved'
            : newStatus === ClaimStatus.RESOLVED_IN_COURT
              ? 'Claim Resolved in Court'
              : 'Claim Status Updated';

    const baseBody = `Claim "${String((claim as any).ClaimTitle ?? '—')}" status changed from ${oldStatus} to ${newStatus}`;
    const bodyWithReason =
      exposeReasonInBody && reason && reason.trim()
        ? `${baseBody}. Reason: ${reason.trim()}`
        : baseBody;

    // Build recipients set (excluding actor)
    const recipientIds = new Set<string>();
    if (claim.submittedBy?.id && claim.submittedBy.id !== actorId) recipientIds.add(claim.submittedBy.id);
    if (claim.evaluator?.id && claim.evaluator.id !== actorId) recipientIds.add(claim.evaluator.id);
    for (const rep of claim.company.representatives) {
      if (rep.id !== actorId) recipientIds.add(rep.id);
    }

    // 1) Generic fan-out with reason in data (and in body if opted)
    await Promise.all(
      Array.from(recipientIds).map((userId) =>
        this.prisma.notification.create({
          data: {
            userId,
            type: NotificationType.CLAIM_STATUS_CHANGED,
            title,
            body: bodyWithReason,
            data: { claimId, oldStatus, newStatus, reason: reason ?? undefined },
            actorId,
            claimId,
          },
        }),
      ),
    );

    // 2) Optional extra contractor-only card (kept for UX parity, includes reason too)
    if (directContractorCard && claim.submittedBy?.id && claim.submittedBy.id !== actorId) {
      await this.prisma.notification.create({
        data: {
          userId: claim.submittedBy.id,
          type: NotificationType.CLAIM_STATUS_CHANGED,
          title,
          body: bodyWithReason, // reason included as above
          data: { claimId, oldStatus, newStatus, reason: reason ?? undefined },
          actorId,
          claimId,
        },
      });
    }
  }


  // CREATE: evaluator assignment notification (to evaluator + submitter)
  async createEvaluatorAssignmentNotification(
    claimId: string,
    evaluatorId: string,
    actorId?: string,
  ) {
    const claim = await this.prisma.claim.findUnique({
      where: { claimId },
      include: { submittedBy: true },
    });
    if (!claim) throw new NotFoundException('Claim not found');

    const notifs: Promise<any>[] = [];

    // evaluator
    if (evaluatorId && evaluatorId !== actorId) {
      notifs.push(
        this.prisma.notification.create({
          data: {
            userId: evaluatorId,
            type: NotificationType.EVALUATOR_ASSIGNED,
            title: 'New Claim Assignment',
            body: `You have been assigned to evaluate claim "${String(
              (claim as any).ClaimTitle ?? '—',
            )}"`,
            data: { claimId },
            actorId,
            claimId,
          },
        }),
      );
    }

    // contractor/submitter
    if (claim.submittedById && claim.submittedById !== actorId) {
      notifs.push(
        this.prisma.notification.create({
          data: {
            userId: claim.submittedById,
            type: NotificationType.EVALUATOR_ASSIGNED,
            title: 'Evaluator Assigned',
            body: `An evaluator has been assigned to your claim "${String(
              (claim as any).ClaimTitle ?? '—',
            )}"`,
            data: { claimId, evaluatorId },
            actorId,
            claimId,
          },
        }),
      );
    }

    await Promise.all(notifs);
  }

  // count unread (fast on @@index([userId, readAt]))
  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, readAt: null, archivedAt: null },
    });
  }

  // precise one
  async markOneAsRead(userId: string, id: string) {
    const res = await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return res.count > 0;
  }

  // bulk with accurate "updated" ids
  async markManyAsRead(userId: string, ids: string[]) {
    if (!ids?.length) return [] as string[];
    return this.prisma.$transaction(async (tx) => {
      const toUpdate = await tx.notification.findMany({
        where: { id: { in: ids }, userId, readAt: null },
        select: { id: true },
      });
      if (toUpdate.length > 0) {
        await tx.notification.updateMany({
          where: { id: { in: toUpdate.map((r) => r.id) }, userId, readAt: null },
          data: { readAt: new Date() },
        });
      }
      return toUpdate.map((r) => r.id);
    });
  }

  async markAllAsRead(userId: string) {
    const res = await this.prisma.notification.updateMany({
      where: { userId, readAt: null }, // include archived too, or add "archivedAt: null" if you prefer
      data: { readAt: new Date() },
    });
    return res.count; // number
  }

  async archiveOne(userId: string, id: string) {
    const res = await this.prisma.notification.updateMany({
      where: { id, userId, archivedAt: null },
      data: { archivedAt: new Date() },
    });
    return res.count > 0;
  }

  async archiveMany(userId: string, ids: string[]) {
    if (!ids?.length) return [] as string[];
    return this.prisma.$transaction(async (tx) => {
      const toArchive = await tx.notification.findMany({
        where: { id: { in: ids }, userId, archivedAt: null },
        select: { id: true },
      });
      if (toArchive.length > 0) {
        await tx.notification.updateMany({
          where: { id: { in: toArchive.map((r) => r.id) }, userId, archivedAt: null },
          data: { archivedAt: new Date() },
        });
      }
      return toArchive.map((r) => r.id);
    });
  }

  async getNotificationsByUser(
    userId: string,
    opts: {
      page?: number;
      limit?: number;
      unreadOnly?: boolean;
      includeArchived?: boolean; // default false
      claimId?: string;          // optional scope to a claim
      types?: NotificationType[]; // optional filter by types
      include?: any;             // Prisma include override
    } = {},
  ) {
    const {
      page = 1,
      limit = 20,
      unreadOnly = false,
      includeArchived = false,
      claimId,
      types,
      include = {
        actor: { select: { id: true, name: true, email: true } },
        claim: { select: { claimId: true, ClaimTitle: true } },
        message: { select: { messageId: true, content: true } },
      },
    } = opts;

    const where: any = { userId };

    // filter by claim if passed
    if (claimId) where.claimId = claimId;

    // unread filter
    if (unreadOnly) where.readAt = null;

    // archived filter (default exclude archived)
    if (!includeArchived) where.archivedAt = null;

    // types filter
    if (types?.length) where.type = { in: types };

    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        include,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getAllNotificationsAdmin(
    viewerId: string,
    dto: AdminListNotificationsDto,
  ) {
    // authorize viewer (Admin or Claim Manager)
    const viewer = await this.prisma.user.findUnique({
      where: { id: viewerId },
      select: { role: { select: { name: true } } },
    });
    const roleName = viewer?.role?.name ?? '';
    if (!['Admin', 'Claim Manager'].includes(roleName)) {
      throw new ForbiddenException('Admin access required.');
    }

    const {
      page = 1,
      limit = 20,
      unreadOnly,
      includeArchived,
      userId,
      actorId,
      claimId,
      messageId,
      q,
      dateFrom,
      dateTo,
      types,
      sortDir = 'desc',
    } = dto;

    const where: any = {};

    if (unreadOnly === 'true') where.readAt = null;
    if (includeArchived !== 'true') where.archivedAt = null;
    if (userId) where.userId = userId;
    if (actorId) where.actorId = actorId;
    if (claimId) where.claimId = claimId;
    if (messageId) where.messageId = messageId;
    if (types?.length) where.type = { in: types };
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }
    if (q && q.trim()) {
      const qq = q.trim();
      where.OR = [
        { title: { contains: qq, mode: 'insensitive' } },
        { body: { contains: qq, mode: 'insensitive' } },
        { claim: { ClaimTitle: { contains: qq, mode: 'insensitive' } } },
        { user: { name: { contains: qq, mode: 'insensitive' } } },
        { user: { email: { contains: qq, mode: 'insensitive' } } },
        { actor: { name: { contains: qq, mode: 'insensitive' } } },
        { actor: { email: { contains: qq, mode: 'insensitive' } } },
      ];
    }

    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        include: {
          user:   { select: { id: true, name: true, email: true } }, // recipient
          actor:  { select: { id: true, name: true, email: true } },
          claim:  { select: { claimId: true, ClaimTitle: true } },
          message:{ select: { messageId: true, content: true } },
        },
        orderBy: { createdAt: sortDir },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      notifications,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

}
