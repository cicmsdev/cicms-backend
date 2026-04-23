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
import { ClaimService } from './claim.service';
import { JwtAuthGuard } from '../auth/middlewares/jwt-auth.guard';
import { RolesGuard } from '../auth/middlewares/roles.guard';
import { Roles } from '../auth/middlewares/roles.decorator';
import { CurrentUser } from 'src/auth/middlewares/current-user.decorator';
import { QueryClaimsDto } from './dtos/query-claims.dto';
import { UpdateInsuranceClaimStatusDto } from './dtos/update-claim-status.dto';
import { InsuranceRepClaimService } from './insurance-rep-claim.service';

@Controller('insurance-rep/claims')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class InsuranceRepClaimController {
  constructor(private readonly service: InsuranceRepClaimService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Insurance Representative')
  list(@CurrentUser() user: { sub: string }, @Query() q: QueryClaimsDto) {
    return this.service.findAllForInsurance(user.sub, q);
  }

  @Get(':claimId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Insurance Representative')
  getOne(@CurrentUser() user: { sub: string }, @Param('claimId') claimId: string) {
    return this.service.findOneForInsurance(user.sub, claimId);
  }

  @Patch(':claimId/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Insurance Representative')
  updateStatus(
    @CurrentUser() user: { sub: string },
    @Param('claimId') claimId: string,
    @Body() dto: UpdateInsuranceClaimStatusDto,
  ) {
    return this.service.updateStatusAsInsurance(user.sub, claimId, dto);
  }

  @Get('metrics/summary/company')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Insurance Representative')
  dashboard(@CurrentUser() user: { sub: string }) {
    return this.service.insuranceDashboard(user.sub);
  }
}
