import { Controller, Get, Query, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
import { ReportsService } from "./reports.service";
import { JwtAuthGuard } from "src/auth/middlewares/jwt-auth.guard";
import { RolesGuard } from "src/auth/middlewares/roles.guard";
import { Roles } from "src/auth/middlewares/roles.decorator";
import { ContractorClaimsQueryDto } from "./dtos/contractor-claims.dto";

@Controller("reports")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get("contractors-claims")
  @Roles("Admin", "Claim Manager")
  async contractorsClaims(
    @Query() q: ContractorClaimsQueryDto,
    @Res() res: Response
  ) {
    const rows = await this.reports.contractorClaimsReport(q);

    // if ((q.format ?? "json") === "pdf") {
    //   const pdf = await this.reports.buildContractorClaimsPdf(rows, {
    //     title: "Contractor Claims Report",
    //     filters: q,
    //   });
    //   const filename = `contractor-claims-${new Date()
    //     .toISOString()
    //     .slice(0, 10)}.pdf`;
    //   res.setHeader("Content-Type", "application/pdf");
    //   res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    //   return res.send(pdf);
    // }

    return res.json({ data: rows, count: rows.length });
  }
}
