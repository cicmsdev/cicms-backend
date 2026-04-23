import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/middlewares/jwt-auth.guard';
import { RolesGuard } from 'src/auth/middlewares/roles.guard';
import { Roles } from 'src/auth/middlewares/roles.decorator';
import { CurrentUser } from 'src/auth/middlewares/current-user.decorator';
import { EvaluatorClaimService } from './evaluator-claim.service';
import { QueryClaimsDto } from './dtos/query-claims.dto';
import { UpdateEvaluatorClaimStatusDto } from './dtos/update-claim-status.dto';

@Controller('evaluator/claims')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Evaluator')
export class EvaluatorClaimController {
  constructor(private readonly service: EvaluatorClaimService) {}

  /** List all claims assigned to me */
  @Get()
  list(@CurrentUser() user: { sub: string }, @Query() q: QueryClaimsDto) {
    return this.service.listMyAssignedClaims(user.sub, q);
  }

  /** Get one claim assigned to me */
  @Get(':claimId')
  getOne(@CurrentUser() user: { sub: string }, @Param('claimId') claimId: string) {
    return this.service.getMyAssignedClaim(user.sub, claimId);
  }

  /** Start evaluation (idempotent) */
  @Patch(':claimId/start')
  start(@CurrentUser() user: { sub: string }, @Param('claimId') claimId: string) {
    return this.service.startEvaluation(user.sub, claimId);
  }

  /** Update status within evaluator-allowed transitions */
  @Patch(':claimId/status')
  updateStatus(
    @CurrentUser() user: { sub: string },
    @Param('claimId') claimId: string,
    @Body() dto: UpdateEvaluatorClaimStatusDto,
  ) {
    return this.service.updateStatus(user.sub, claimId, dto);
  }

  /** Dashboard (my assigned stats) */
  @Get('metrics/summary/me')
  dashboard(@CurrentUser() user: { sub: string }) {
    return this.service.myDashboard(user.sub);
  }
}
