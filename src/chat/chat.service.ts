// src/chat/chat.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  HttpException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { ChatAuth, AppUser } from './auth-helpers';
import { Prisma } from '@prisma/client';
import { Roles } from 'src/common/role';

type Contact = { id: string; name: string; email: string; role: string | null };


type RecentConversation = {
  conversationKey: string; // "claim:<id>" or "dm:<a>:<b>"
  type: 'claim' | 'dm';
  latest: {
    messageId: string;
    content: string;
    createdDate: Date;
    sender: { id: string; name: string | null; email: string | null };
  } | null;
  unread: number;
  label: string;
  meta?: { claimId?: string; otherUserId?: string };
};

// ✅ Single, consistent dmKey helper (with "dm:" prefix)
const dmKeyOf = (a: string, b: string) => {
  const [x, y] = [a, b].sort();
  return `dm:${x}:${y}`;
};

@Injectable()
export class ChatService {
  private auth: ChatAuth;

  constructor(private readonly prisma: DatabaseService) {
    this.auth = new ChatAuth(prisma);
  }

  // Centralized error mapper
  private handleError(e: any): never {
    if (e instanceof HttpException) throw e;

    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      switch (e.code) {
        case 'P2002':
          throw new BadRequestException('A record with those values already exists.');
        case 'P2003':
          throw new BadRequestException('Related record not found or constraint failed.');
        case 'P2025':
          throw new NotFoundException('Requested record not found.');
        default:
          throw new InternalServerErrorException('Database error.');
      }
    }

    if (e instanceof Prisma.PrismaClientValidationError) {
      throw new BadRequestException('Invalid data.');
    }

    throw new InternalServerErrorException('Unexpected server error.');
  }

  // ----------------------------
  // Room join helpers
  // ----------------------------
  async joinClaimRoom(user: AppUser, claimId: string) {
    try {
      await this.auth.assertClaimAccess(user, claimId);
      return {
        room: `claim:${claimId}`,
        conversationKey: `claim:${claimId}`,
      };
    } catch (e) {
      this.handleError(e);
    }
  }

  async joinDmRoom(user: AppUser, otherUserId: string) {
    try {
      this.auth.assertDmAccess(user, user.id, otherUserId);
      if (user.id === otherUserId) {
        throw new BadRequestException('Cannot DM yourself');
      }
      const key = dmKeyOf(user.id, otherUserId);
      return { room: key, conversationKey: key };
    } catch (e) {
      this.handleError(e);
    }
  }

  // ----------------------------
  // History
  // ----------------------------
  async listClaimMessages(user: AppUser, claimId: string, take = 50) {
    try {
      await this.auth.assertClaimAccess(user, claimId);
      const items = await this.prisma.message.findMany({
        where: { claimId },
        orderBy: { createdDate: 'desc' },
        take: Math.min(take, 200),
        include: { sender: { select: { id: true, name: true, email: true } } },
      });
      return items.reverse();
    } catch (e) {
      this.handleError(e);
    }
  }

  async listDmMessages(user: AppUser, otherUserId: string, take = 50) {
    try {
      this.auth.assertDmAccess(user, user.id, otherUserId);
      if (user.id === otherUserId) throw new BadRequestException('Cannot DM yourself');

      const key = dmKeyOf(user.id, otherUserId);
      const items = await this.prisma.message.findMany({
        where: { dmKey: key },
        orderBy: { createdDate: 'desc' },
        take: Math.min(take, 200),
        include: {
          sender: { select: { id: true, name: true, email: true } },
          receiver: { select: { id: true, name: true, email: true } },
        },
      });
      return items.reverse();
    } catch (e) {
      this.handleError(e);
    }
  }

  async listRecentConversations(user: AppUser, limit = 20): Promise<RecentConversation[]> {
    try {
      limit = Math.min(Math.max(limit, 1), 100);

      // 1) DMs (latest per dmKey that includes me)
      const dmGroups = await this.prisma.message.groupBy({
        by: ['dmKey'],
        where: { dmKey: { not: null } },
        _max: { createdDate: true },
        orderBy: { _max: { createdDate: 'desc' } },
        take: limit * 3,
      });

      const myDmKeys = dmGroups
        .map(g => g.dmKey!)
        .filter(k => k.startsWith('dm:') && k.includes(user.id));

      const dmLatest = await Promise.all(
        myDmKeys.map(async (key) => {
          const msg = await this.prisma.message.findFirst({
            where: { dmKey: key },
            orderBy: { createdDate: 'desc' },
            include: { sender: { select: { id: true, name: true, email: true } } },
          });
          return { key, msg };
        })
      );

      const dmConvos: RecentConversation[] = [];
      for (const { key, msg } of dmLatest) {
        if (!msg) continue;
        const [a, b] = key.slice(3).split(':');
        const otherId = a === user.id ? b : b === user.id ? a : null;
        if (!otherId) continue;

        const other = await this.prisma.user.findUnique({
          where: { id: otherId },
          select: { id: true, name: true, email: true },
        });

        const unread = await this.unreadCount(user.id, key);

        dmConvos.push({
          conversationKey: key,
          type: 'dm',
          latest: {
            messageId: msg.messageId,
            content: msg.content,
            createdDate: msg.createdDate,
            sender: { id: msg.sender.id, name: msg.sender.name, email: msg.sender.email },
          },
          unread,
          label: other?.name ?? other?.email ?? 'Direct Message',
          meta: { otherUserId: otherId },
        });
      }

      // 2) Claims (latest per claim I can access)
      const me = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, insuranceCompanyId: true, role: { select: { name: true } } },
      });
      const myRole = me?.role?.name ?? user.role ?? null;

      let claimWhere: any;
      if (myRole === 'Admin' || myRole === 'Claim Manager') {
        claimWhere = {};
      } else if (myRole === 'Insurance Representative') {
        claimWhere = { companyId: me?.insuranceCompanyId ?? '__none__' };
      } else {
        claimWhere = { OR: [{ submittedById: user.id }, { evaluatorId: user.id }] };
      }

      const myClaims = await this.prisma.claim.findMany({
        where: claimWhere,
        select: { claimId: true, ClaimTitle: true },
        take: limit * 50,
      });
      const myClaimIdSet = new Set(myClaims.map(c => c.claimId));
      const claimTitleById = new Map(myClaims.map(c => [c.claimId, c.ClaimTitle]));

      const claimGroups = await this.prisma.message.groupBy({
        by: ['claimId'],
        where: { claimId: { not: null } },
        _max: { createdDate: true },
        orderBy: { _max: { createdDate: 'desc' } },
        take: limit * 50,
      });

      const allowedClaimIds = claimGroups
        .map(g => g.claimId!)
        .filter(id => myClaimIdSet.has(id));

      const claimLatest = await Promise.all(
        allowedClaimIds.map(async (claimId) => {
          const msg = await this.prisma.message.findFirst({
            where: { claimId },
            orderBy: { createdDate: 'desc' },
            include: { sender: { select: { id: true, name: true, email: true } } },
          });
          return { claimId, msg };
        })
      );

      const claimConvos: RecentConversation[] = [];
      for (const { claimId, msg } of claimLatest) {
        if (!msg) continue;
        const key = `claim:${claimId}`;
        const unread = await this.unreadCount(user.id, key);

        claimConvos.push({
          conversationKey: key,
          type: 'claim',
          latest: {
            messageId: msg.messageId,
            content: msg.content,
            createdDate: msg.createdDate,
            sender: { id: msg.sender.id, name: msg.sender.name, email: msg.sender.email },
          },
          unread,
          label: claimTitleById.get(claimId) ?? 'Claim',
          meta: { claimId },
        });
      }

      return [...dmConvos, ...claimConvos]
        .sort((a, b) => {
          const ta = a.latest?.createdDate?.getTime() ?? 0;
          const tb = b.latest?.createdDate?.getTime() ?? 0;
          return tb - ta;
        })
        .slice(0, limit);
    } catch (e) {
      this.handleError(e);
    }
  }

  // ----------------------------
  // Send
  // ----------------------------
  async sendToClaim(user: AppUser, claimId: string, content: string) {
    try {
      if (!content?.trim()) throw new BadRequestException('Message content is required');
      await this.auth.assertClaimAccess(user, claimId);

      return await this.prisma.message.create({
        data: {
          content: content.trim(),
          senderId: user.id,
          claimId,
          receiverId: null,
          dmKey: null,
        },
        include: { sender: { select: { id: true, name: true, email: true } } },
      });
    } catch (e) {
      this.handleError(e);
    }
  }

  async sendDm(user: AppUser, otherUserId: string, content: string) {
    try {
      if (!content?.trim()) throw new BadRequestException('Message content is required');
      this.auth.assertDmAccess(user, user.id, otherUserId);
      if (user.id === otherUserId) throw new BadRequestException('Cannot DM yourself');

      const key = dmKeyOf(user.id, otherUserId);
      return await this.prisma.message.create({
        data: {
          content: content.trim(),
          senderId: user.id,
          receiverId: otherUserId,
          dmKey: key,
          claimId: null,
        },
        include: {
          sender: { select: { id: true, name: true, email: true } },
          receiver: { select: { id: true, name: true, email: true } },
        },
      });
    } catch (e) {
      this.handleError(e);
    }
  }

  // ----------------------------
  // Read / Unread
  // ----------------------------
  private parseConversationKey(
    key: string,
  ): { kind: 'claim'; claimId: string } | { kind: 'dm'; dmKey: string } {
    if (key.startsWith('claim:')) {
      const claimId = key.slice('claim:'.length);
      if (!claimId) throw new BadRequestException('Invalid conversationKey');
      return { kind: 'claim', claimId };
    }
    if (key.startsWith('dm:')) {
      return { kind: 'dm', dmKey: key };
    }
    throw new BadRequestException('Invalid conversationKey');
  }

  async markRead(userId: string, conversationKey: string) {
    try {
      await this.prisma.conversationRead.upsert({
        where: { userId_conversationKey: { userId, conversationKey } },
        update: { lastReadAt: new Date() },
        create: { userId, conversationKey, lastReadAt: new Date() },
      });
    } catch (e) {
      this.handleError(e);
    }
  }

  async unreadCount(userId: string, conversationKey: string) {
    try {
      const cursor = await this.prisma.conversationRead.findUnique({
        where: { userId_conversationKey: { userId, conversationKey } },
      });
      const since = cursor?.lastReadAt ?? new Date(0);

      const parsed = this.parseConversationKey(conversationKey);
      if (parsed.kind === 'claim') {
        return await this.prisma.message.count({
          where: {
            claimId: parsed.claimId,
            createdDate: { gt: since },
            senderId: { not: userId },
          },
        });
      }

      return await this.prisma.message.count({
        where: {
          dmKey: parsed.dmKey,
          createdDate: { gt: since },
          senderId: { not: userId },
        },
      });
    } catch (e) {
      this.handleError(e);
    }
  }

  /** Recent DM partner userIds, newest first (deduped) */
  private async recentDmPartnerIds(meId: string, limit = 200): Promise<string[]> {
    // get latest message per dmKey, newest first
    const groups = await this.prisma.message.groupBy({
      by: ['dmKey'],
      where: { dmKey: { not: null } },
      _max: { createdDate: true },
      orderBy: { _max: { createdDate: 'desc' } },
      take: limit,
    });

    const out: string[] = [];
    const seen = new Set<string>();

    for (const g of groups) {
      const key = g.dmKey!;
      if (!key.startsWith('dm:') || !key.includes(meId)) continue;
      const [a, b] = key.slice(3).split(':'); // strip "dm:"
      const other = a === meId ? b : b === meId ? a : null;
      if (other && !seen.has(other)) {
        seen.add(other);
        out.push(other);
      }
    }
    return out;
  }

  /** Directory-style contacts with role-aware visibility + optional search & recent-first sort */
// src/chat/chat.service.ts (add this method)

  /**
   * Return contacts for DM: recent partners first, then discoverable contacts.
   */
async listDmContacts(
  userId: string,
  opts?: { search?: string; limit?: number }
) {
  const limit = Math.min(Math.max(opts?.limit ?? 20, 1), 100);
  const search = (opts?.search ?? '').trim();

  const ADMIN_LIKE_NAMES = ['Admin', 'Claim Manager'];
  const EVALUATOR_NAME = 'Evaluator';
  const INSURER_REP_NAME = 'Insurance Representative';

  // Load current user (incl. role)
  const me = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, insuranceCompanyId: true, role: { select: { name: true } } },
  });
  if (!me) throw new ForbiddenException('User not found');

  const myRoleName = me.role?.name ?? '';
  const isAdminLike = ADMIN_LIKE_NAMES.includes(myRoleName);
  const isEvaluator = myRoleName === EVALUATOR_NAME;
  const isInsurerRep = myRoleName === INSURER_REP_NAME;

  // A) Recent DM partners
  const recentGroups = await this.prisma.message.groupBy({
    by: ['dmKey'],
    where: { dmKey: { not: null }, OR: [{ senderId: userId }, { receiverId: userId }] },
    _max: { createdDate: true },
    orderBy: { _max: { createdDate: 'desc' } },
    take: 200,
  });

  const recentPartnerIds: string[] = [];
  for (const g of recentGroups) {
    const key = g.dmKey!;
    const [_, a, b] = key.split(':'); // dm:<a>:<b>
    const other = a === userId ? b : b === userId ? a : null;
    if (other && !recentPartnerIds.includes(other)) recentPartnerIds.push(other);
  }

  // B) Discoverable graph per role
  const discoverIds = new Set<string>();

  if (isAdminLike) {
    // Admin-like sees everyone (except self)
    const everyone = await this.prisma.user.findMany({
      where: { id: { not: userId } },
      select: { id: true },
    });
    for (const u of everyone) discoverIds.add(u.id);
  } else {
    // Everyone should see all admin-like users
    const admins = await this.prisma.user.findMany({
      where: { id: { not: userId }, role: { name: { in: ADMIN_LIKE_NAMES } } },
      select: { id: true },
    });
    for (const u of admins) discoverIds.add(u.id);

    if (isInsurerRep && me.insuranceCompanyId) {
      // Insurer rep graph: submitters/evaluators in same company + fellow reps
      const claims = await this.prisma.claim.findMany({
        where: { companyId: me.insuranceCompanyId },
        select: { submittedById: true, evaluatorId: true },
      });
      for (const c of claims) {
        if (c.submittedById && c.submittedById !== userId) discoverIds.add(c.submittedById);
        if (c.evaluatorId && c.evaluatorId !== userId) discoverIds.add(c.evaluatorId);
      }
      const fellowReps = await this.prisma.user.findMany({
        where: { insuranceCompanyId: me.insuranceCompanyId, id: { not: userId } },
        select: { id: true },
      });
      for (const r of fellowReps) discoverIds.add(r.id);
    } else {
      // Contractor/Evaluator graph: insurer reps on my companies + evaluators on my claims
      const myClaims = await this.prisma.claim.findMany({
        where: { OR: [{ submittedById: userId }, { evaluatorId: userId }] },
        select: { companyId: true, evaluatorId: true, submittedById: true },
      });

      const companyIds = Array.from(new Set(myClaims.map(c => c.companyId).filter(Boolean)));
      if (companyIds.length) {
        const reps = await this.prisma.user.findMany({
          where: { insuranceCompanyId: { in: companyIds }, id: { not: userId } },
          select: { id: true },
        });
        for (const r of reps) discoverIds.add(r.id);
      }

      // other evaluators tied to my claims
      for (const c of myClaims) {
        if (c.evaluatorId && c.evaluatorId !== userId) discoverIds.add(c.evaluatorId);
      }

      // Evaluator: include contractors (submitters) for claims assigned to me
      if (isEvaluator) {
        for (const c of myClaims) {
          if (c.evaluatorId === userId && c.submittedById && c.submittedById !== userId) {
            discoverIds.add(c.submittedById);
          }
        }
      }
    }
  }

  // Merge: recent first, then discoverables
  const orderedIds: string[] = [...recentPartnerIds];
  for (const id of discoverIds) if (!orderedIds.includes(id)) orderedIds.push(id);

  // Search (by name/email/phone/role)
  const whereSearch: Prisma.UserWhereInput | undefined = search
    ? {
        OR: [
          { name:  { contains: search, mode: Prisma.QueryMode.insensitive } },
          { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { phoneNumber: { contains: search } },
          { role: { name: { contains: search, mode: Prisma.QueryMode.insensitive } } },
        ],
      }
    : undefined;

  const sliceIds = orderedIds.slice(0, 10_000);
  if (sliceIds.length === 0) return [];

  const candidatesRaw = await this.prisma.user.findMany({
    where: { id: { in: sliceIds, notIn: [userId] }, ...(whereSearch ?? {}) },
    select: { id: true, name: true, email: true, role: { select: { name: true } } },
  });

  // Keep recency order, then name
  const pos = new Map(sliceIds.map((id, i) => [id, i]));
  candidatesRaw.sort((a, b) => {
    const pa = pos.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const pb = pos.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    if (pa !== pb) return pa - pb;
    return a.name.localeCompare(b.name);
  });

  return candidatesRaw.slice(0, limit).map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role?.name ?? 'User',
  }));
}


  // ----------------------------
  // Convenience
  // ----------------------------
  conversationKeyForClaim(claimId: string) {
    return `claim:${claimId}`;
  }

  conversationKeyForDm(userA: string, userB: string) {
    return dmKeyOf(userA, userB);
  }
}
