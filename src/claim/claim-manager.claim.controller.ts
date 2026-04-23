
import {
    Body, Controller, Get, Param, Patch, Query,
    Req,
    UseGuards, UsePipes, ValidationPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/middlewares/jwt-auth.guard';
import { RolesGuard } from 'src/auth/middlewares/roles.guard';
import { Roles } from 'src/auth/middlewares/roles.decorator';
import { ClaimManagerService } from './claim-manager.service';
import { AssignEvaluatorDto } from './dtos/assign-evaluator.dto';
import { QueryClaimsDto } from './dtos/query-claims.dto';
import { ListEvaluatorsDto } from './dtos/list-evaluators.dto';

@Controller('claim-manager/claims')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class ClaimManagerClaimController {
    constructor(private readonly service: ClaimManagerService) { }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Claim Manager')
  list(@Query() q: QueryClaimsDto) {
    return this.service.managerListClaims(q);
  }

  @Get('metrics/summary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Claim Manager')
  dashboard() {
    return this.service.managerDashboard();
  }

  @Get('evaluators')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Claim Manager')
  listEvaluators(@Query() q: ListEvaluatorsDto) {
    return this.service.listEvaluatorsWithAssignedCount(q);
  }

  @Patch(':claimId/assign-evaluator')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Claim Manager')
  assign(
    @Param('claimId') claimId: string,  
    @Body() dto: AssignEvaluatorDto,
    @Req() req: any,
  ) {
    const managerUserId = req.user?.id ?? req.user?.sub;
    return this.service.assignEvaluatorToClaim(managerUserId, claimId, dto);
  }

  @Get(':claimId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Claim Manager')
  getOne(@Param('claimId') claimId: string) {
    return this.service.managerGetClaim(claimId);
  }
}
