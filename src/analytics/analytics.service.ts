import { Injectable } from '@nestjs/common';
import { Prisma, ClaimStatus, ClaimType } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';

import {
  AnalyticsOverview,
  AnalyticsQueryDto,
  CompanyCount,
  EvaluatorWork,
  TrendPoint,
} from '../analytics/dtos/analytics.dto';

type ClaimTypeCount = { type: ClaimType | 'OTHERS'; count: number }; // NEW

@Injectable()
export class AnalyticsService {
  constructor(private prisma: DatabaseService) { }

  /** Canonical list based on your enum definition */
  private readonly ALL_STATUSES: ClaimStatus[] = [
    'SUBMITTED',
    'APPROVED',
    'REJECTED',
    'IN_EVALUATION',
    'RESOLVED',
    'RESOLVED_IN_COURT',
    'PAYED',
  ];

  private buildWhere(q: AnalyticsQueryDto): Prisma.ClaimWhereInput {
  const where: Prisma.ClaimWhereInput = {};

  // Date range
  if (q.from || q.to) {
    where.submissionDate = {
      gte: q.from ? new Date(q.from) : undefined,
      lte: q.to ? new Date(q.to) : undefined,
    };
  }

  // Company & evaluator
  if (q.companyId) where.companyId = q.companyId;
  if (q.evaluatorId) where.evaluatorId = q.evaluatorId;

  // ✅ APPLY FILTERS HERE
  if (q.status) {
    where.status = q.status;
  }

  if (q.claimType) {
    where.claimType = q.claimType;
  }

  return where;
}


  /** Return zero-filled map for every status, plus total `all` */
  async statusCounts(where: Prisma.ClaimWhereInput): Promise<{ map: Record<string, number>; all: number }> {
    const rows = await this.prisma.claim.groupBy({
      by: ['status'],
      _count: { _all: true },
      where,
    });

    const map: Record<string, number> = Object.fromEntries(this.ALL_STATUSES.map(s => [s, 0]));
    let all = 0;
    for (const r of rows) {
      map[r.status] = r._count._all;
      all += r._count._all;
    }
    return { map, all };
  }


  /** Display-friendly breakdown of claims by ClaimType */
  async claimTypeBreakdown(q: AnalyticsQueryDto) {
    const where = this.buildWhere(q);

    //  Group and count (no orderBy here)
    const groups = await this.prisma.claim.groupBy({
      by: ['claimType'],
      _count: { _all: true },
      where,
    });

    // Count NULLs (OTHERS bucket)
    const nulls = await this.prisma.claim.count({
      // cast is fine – Prisma allows null filter on nullable enum
      where: { ...where, claimType: null as any },
    });

    // 3) Map → { type, count }, guard optional _count in TS
    const rows = groups.map(g => ({
      type: (g.claimType as any) ?? 'OTHERS',
      count: g._count?._all ?? 0,
    }));

    if (nulls > 0) rows.push({ type: 'OTHERS', count: nulls });

    // 4) Sort in JS (desc), put OTHERS last
    rows.sort((a, b) => {
      if (a.type === 'OTHERS') return 1;
      if (b.type === 'OTHERS') return -1;
      return b.count - a.count;
    });

    return rows;
  }


  /** Submissions trend (PostgreSQL). */
  async submissionsTrend(q: AnalyticsQueryDto): Promise<TrendPoint[]> {
    const granularity: 'day' | 'week' | 'month' = q.granularity ?? 'day';

    const params: any[] = [granularity];
    const conds: string[] = [];

    if (q.from) { params.push(new Date(q.from)); conds.push(`"submissionDate" >= $${params.length}`); }
    if (q.to) { params.push(new Date(q.to)); conds.push(`"submissionDate" <= $${params.length}`); }
    if (q.companyId) { params.push(q.companyId); conds.push(`"companyId" = $${params.length}`); }
    if (q.evaluatorId) { params.push(q.evaluatorId); conds.push(`"evaluatorId" = $${params.length}`); }

    const whereSql = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    const sql = `
      SELECT
        to_char(
          date_trunc($1, "submissionDate"),
          CASE
            WHEN $1 = 'day'  THEN 'YYYY-MM-DD'
            WHEN $1 = 'week' THEN 'IYYY-IW'
            ELSE 'YYYY-MM'
          END
        ) AS period,
        COUNT(*)::int AS count
      FROM "claims"
      ${whereSql}
      GROUP BY 1
      ORDER BY 1;
    `;

    const rows = await this.prisma.$queryRawUnsafe<TrendPoint[]>(sql, ...params);
    return rows;
  }

  async byCompany(where: Prisma.ClaimWhereInput): Promise<CompanyCount[]> {
    const rows = await this.prisma.claim.groupBy({
      by: ['companyId'],
      _count: { _all: true },
      where,
    });

    if (!rows.length) return [];

    const ids = rows.map(r => r.companyId);
    const companies = await this.prisma.insuranceCompany.findMany({
      where: { companyId: { in: ids } },
      select: { companyId: true, name: true },
    });

    const nameById = new Map(companies.map(c => [c.companyId, c.name]));

    return rows.map(r => ({
      companyId: r.companyId,
      name: nameById.get(r.companyId) ?? 'OTHERS',
      count: r._count._all,
    }));
  }

  /** Evaluator workload: SUBMITTED = open; IN_EVALUATION (+ alias IN_REVIEW) = inEvaluation */
  async evaluatorWorkload(q: AnalyticsQueryDto): Promise<EvaluatorWork[]> {
    const params: any[] = [];
    const conds: string[] = [];

    if (q.from) { params.push(new Date(q.from)); conds.push(`c."submissionDate" >= $${params.length}`); }
    if (q.to) { params.push(new Date(q.to)); conds.push(`c."submissionDate" <= $${params.length}`); }
    if (q.companyId) { params.push(q.companyId); conds.push(`c."companyId" = $${params.length}`); }
    if (q.evaluatorId) { params.push(q.evaluatorId); conds.push(`c."evaluatorId" = $${params.length}`); }

    const whereSql = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    const sql = `
    SELECT
      c."evaluatorId",
      COALESCE(u.name, 'Unassigned') AS name,
      -- cast enum -> text for safe comparisons
      SUM(CASE WHEN c.status::text = 'APPROVED' THEN 1 ELSE 0 END)::int AS open,
      SUM(CASE WHEN c.status::text IN ('IN_EVALUATION','IN_REVIEW') THEN 1 ELSE 0 END)::int AS "inEvaluation"
    FROM "claims" c
    LEFT JOIN "users" u ON u.id = c."evaluatorId"
    ${whereSql}
    GROUP BY c."evaluatorId", u.name
    ORDER BY open DESC, "inEvaluation" DESC
    LIMIT 15;
  `;

    return this.prisma.$queryRawUnsafe<EvaluatorWork[]>(sql, ...params);
  }

  async overview(q: AnalyticsQueryDto): Promise<AnalyticsOverview & { claimTypeBreakdown: ClaimTypeCount[] }> {
    const where = this.buildWhere(q);

    const [status, trend, company, workload, typeBreak] = await Promise.all([
      this.statusCounts(where),
      this.submissionsTrend(q),
      this.byCompany(where),
      this.evaluatorWorkload(q),
      this.claimTypeBreakdown(q), 
    ]);

    return {
      totals: { ...status.map, all: status.all },
      submissionsTrend: trend,
      byCompany: company,
      evaluatorWorkload: workload,
      claimTypeBreakdown: typeBreak, 
    };
  }
}
