import { Module } from '@nestjs/common';
import { DocumentService } from './document.service';
import { DocumentController } from './document.controller';
import { DatabaseModule } from 'src/database/database.module';
import { RoleModule } from 'src/role/role.module';

@Module({
  imports: [DatabaseModule, RoleModule],
  controllers: [DocumentController],
  providers: [DocumentService],
})
export class DocumentModule {}
