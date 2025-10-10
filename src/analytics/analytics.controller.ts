
import { AnalyticsService } from './analytics.service';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/middlewares/jwt-auth.guard';
import { RolesGuard } from 'src/auth/middlewares/roles.guard';
import { Roles } from 'src/auth/middlewares/roles.decorator';

import { AnalyticsQueryDto } from './dtos/analytics.dto';
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) { }

  // Allow Admin + Claim Manager to view analytics
  @Get('overview')
  @Roles('Admin', 'Claim Manager')
  async getOverview(@Query() q: AnalyticsQueryDto) {
    return this.analyticsService.overview(q);
  }
  @Get('claim-type-breakdown')
  @Roles('Admin', 'Claim Manager')
  claimTypeBreakdown(@Query() q: AnalyticsQueryDto) {
    return this.analyticsService.claimTypeBreakdown(q);
  }
}
