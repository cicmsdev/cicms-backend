// src/claim/claim.module.ts
import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { RoleModule } from 'src/role/role.module';
import { NotificationsModule } from 'src/notifications/notifications.module';

import { ContractorClaimController } from './contractor.claim.controller';
import { InsuranceRepClaimController } from './insurance-rep.claim.controller';
import { EvaluatorClaimController } from './evaluator.claim.controller';
import { ClaimManagerClaimController } from './claim-manager.claim.controller';

import { ContractorClaimService } from './contractor-claim.service';
import { InsuranceRepClaimService } from './insurance-rep-claim.service';
import { EvaluatorClaimService } from './evaluator-claim.service';
import { ClaimManagerService } from './claim-manager.service';

@Module({
  imports: [DatabaseModule, RoleModule, NotificationsModule], // ✅ import module that exports the service
  controllers: [
    ContractorClaimController,
    InsuranceRepClaimController,
    EvaluatorClaimController,
    ClaimManagerClaimController,
  ],
  providers: [
    ContractorClaimService,
    InsuranceRepClaimService,
    EvaluatorClaimService,
    ClaimManagerService,
    
  ],
  exports: [
    ContractorClaimService,
    InsuranceRepClaimService,
    EvaluatorClaimService,
    ClaimManagerService,
    
  ],
})
export class ClaimModule {}
