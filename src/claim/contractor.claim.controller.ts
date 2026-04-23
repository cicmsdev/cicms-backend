import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CreateClaimDto } from './dtos/create-claim.dto';
import { UpdateClaimDto } from './dtos/update-claim.dto';
import { QueryClaimsDto } from './dtos/query-claims.dto';
import { JwtAuthGuard } from '../auth/middlewares/jwt-auth.guard';
import { RolesGuard } from '../auth/middlewares/roles.guard';
import { Roles } from '../auth/middlewares/roles.decorator';
import { CurrentUser } from 'src/auth/middlewares/current-user.decorator'; 
import { ContractorClaimService } from './contractor-claim.service';

@Controller('contractor/claims')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class ContractorClaimController {
  constructor(private readonly service: ContractorClaimService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Contractor')
  create(@CurrentUser() user: { sub: string }, @Body() dto: CreateClaimDto) {
    return this.service.createForContractor(user.sub, dto);
  }

  @Patch(':claimId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Contractor', 'Evaluator')
  updateMyClaim(
    @CurrentUser() user: { sub: string },
    @Param('claimId') claimId: string,
    @Body() dto: UpdateClaimDto,
  ) {
    return this.service.updateMyClaim(claimId, user.sub, dto);
  }

  @Get(':claimId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Contractor')
  getMyClaim(@CurrentUser() user: { sub: string }, @Param('claimId') claimId: string) {
    return this.service.getMyClaim(claimId, user.sub);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Contractor')
  listMyClaims(@CurrentUser() user: { sub: string }, @Query() q: QueryClaimsDto) {
    return this.service.listMyClaims(user.sub, q);
  }

  @Get('metrics/summary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Contractor')
  myDashboard(@CurrentUser() user: { sub: string }) {
    return this.service.myDashboard(user.sub);
  }

  
}

