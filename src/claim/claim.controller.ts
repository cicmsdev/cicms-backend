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
import { CurrentUser } from 'src/auth//middlewares/current-user.decorator';
//import { UpdateClaimStatusDto } from './dtos/update-claim-status.dto';

// @Controller('claims')
// @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class ClaimController {
  // constructor(private readonly service: ClaimService) {}

  // //Create a new claim (SUBMITTED) 
  // @Post()
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('Contractor')
  // async create(@CurrentUser() user: { sub: string }, @Body() dto: CreateClaimDto) {
  //   return this.service.createForContractor(user.sub, dto);
  // }

  // // Update my claim (only while SUBMITTED) 
  // @Patch(':claimId')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('Contractor')
  // async updateMyClaim(
  //   @CurrentUser() user: { sub: string },
  //   @Param('claimId') claimId: string,
  //   @Body() dto: UpdateClaimDto,
  // ) {
  //   return this.service.updateMyClaim(claimId, user.sub, dto);
  // }

  // // Get a single claim I submitted */
  // @Get(':claimId')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('Contractor')
  // async getMyClaim(@CurrentUser() user: { sub: string }, @Param('claimId') claimId: string) {
  //   return this.service.getMyClaim(claimId, user.sub);
  // }

  // // List my claims with filters + pagination 
  // @Get()
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('Contractor')
  // async listMyClaims(@CurrentUser() user: { sub: string }, @Query() q: QueryClaimsDto) {
  //   return this.service.listMyClaims(user.sub, q);
  // }

  // // Dashboard metrics (counts + recent 5) 
  // @Get('metrics/summary')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('Contractor')
  // async myDashboard(@CurrentUser() user: { sub: string }) {
  //   return this.service.myDashboard(user.sub);
  // }
  // /**
  //  * ======================== Insurance company routes ==================================
  //  */
  // @Get()
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('Insurance Representative')
  // list(@CurrentUser() user: { sub: string }, @Query() q: QueryClaimsDto) {
  //   return this.service.findAllForInsurance(user.sub, q);
  // }

  // @Get(':claimId')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('Insurance Representative')
  // getOne(@CurrentUser() user: { sub: string }, @Param('claimId') claimId: string) {
  //   return this.service.findOneForInsurance(user.sub, claimId);
  // }

  // @Patch(':claimId/status')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('Insurance Representative')
  // updateStatus(
  //   @CurrentUser() user: { sub: string },
  //   @Param('claimId') claimId: string,
  //   @Body() dto: UpdateClaimStatusDto,
  // ) {
  //   return this.service.updateStatusAsInsurance(user.sub, claimId, dto);
  // }

  // @Get('metrics/summary/company')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('Insurance Representative')
  // dashboard(@CurrentUser() user: { sub: string }) {
  //   return this.service.insuranceDashboard(user.sub);
  // }
}
