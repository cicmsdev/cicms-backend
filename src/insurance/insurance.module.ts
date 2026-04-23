import { Module } from '@nestjs/common';
import { InsuranceService } from './insurance.service';
import { InsuranceController } from './insurance.controller';
import { DatabaseModule  } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [InsuranceController],
  providers: [InsuranceService],
})
export class InsuranceModule {}
