import { Injectable } from "@nestjs/common";
import { DatabaseService } from "src/database/database.service";
import PDFDocument = require("pdfkit");
import { ClaimReportQueryDto } from "./dtos/ClaimReportQueryDto";

type Row = {
  contractorId: string;
  contractorName: string;
  email: string | null;
  phoneNumber: string | null;
  total: number;
  SUBMITTED: number;
  APPROVED: number;
  REJECTED: number;
  IN_EVALUATION: number;
  RESOLVED: number;
  RESOLVED_IN_COURT: number;
  PAYED: number;
};

@Injectable()
export class ReportsService {
  constructor(private prisma: DatabaseService) { }

  async contractorClaimsReport(params?: {
    dateFrom?: string;      // ISO (inclusive)
    dateTo?: string;        // ISO (exclusive)
    companyId?: string;     // filter by InsuranceCompany
  }): Promise<Row[]> {
    const { dateFrom = null, dateTo = null, companyId = null } = params ?? {};

    const rows = await this.prisma.$queryRaw<Row[]>`
  WITH contractors AS (
    SELECT u.id, u.name, u.email, u."phoneNumber"
    FROM "users" u
    JOIN "Role" r ON r.id = u."roleId"
    WHERE r.name = 'Contractor'
  )
  SELECT
    c.id   AS "contractorId",
    c.name AS "contractorName",
    c.email,
    c."phoneNumber",
    COALESCE(COUNT(cl."claimId"), 0)::int                                           AS total,
    COALESCE(COUNT(*) FILTER (WHERE cl.status = 'SUBMITTED'), 0)::int               AS "SUBMITTED",
    COALESCE(COUNT(*) FILTER (WHERE cl.status = 'APPROVED'), 0)::int                AS "APPROVED",
    COALESCE(COUNT(*) FILTER (WHERE cl.status = 'REJECTED'), 0)::int                AS "REJECTED",
    COALESCE(COUNT(*) FILTER (WHERE cl.status = 'IN_EVALUATION'), 0)::int           AS "IN_EVALUATION",
    COALESCE(COUNT(*) FILTER (WHERE cl.status = 'RESOLVED'), 0)::int                AS "RESOLVED",
    COALESCE(COUNT(*) FILTER (WHERE cl.status = 'RESOLVED_IN_COURT'), 0)::int       AS "RESOLVED_IN_COURT",
    COALESCE(COUNT(*) FILTER (WHERE cl.status = 'PAYED'), 0)::int                   AS "PAYED"
  FROM contractors c
  LEFT JOIN "claims" cl
    ON cl."submittedById" = c.id
   AND (${dateFrom}::timestamptz IS NULL OR cl."submissionDate" >= ${dateFrom}::timestamptz)
   AND (${dateTo}::timestamptz   IS NULL OR cl."submissionDate" <  ${dateTo}::timestamptz)
   AND (${companyId}::text       IS NULL OR cl."companyId" = ${companyId})
  GROUP BY c.id, c.name, c.email, c."phoneNumber"
  ORDER BY total DESC, c.name ASC;
`;


    return rows;
  }

  async generateClaimReport(filters: ClaimReportQueryDto) {
    const {
      status,
      claimType,
      companyId,
      startDate,
      endDate,
    } = filters;

    return this.prisma.claim.findMany({
      where: {
        ...(status && { status }),
        ...(claimType && { claimType }),
        ...(companyId && { companyId }),
        ...(startDate || endDate
          ? {
            submissionDate: {
              ...(startDate && { gte: new Date(startDate) }),
              ...(endDate && { lte: new Date(endDate) }),
            },
          }
          : {}),
      },
      include: {
        company: {
          include: {
            representatives: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        submittedBy: {
          select: { id: true, name: true, email: true },
        },
        evaluator: {
          select: { id: true, name: true },
        },
      },
      orderBy: {
        submissionDate: 'desc',
      },
    });
  }


}
