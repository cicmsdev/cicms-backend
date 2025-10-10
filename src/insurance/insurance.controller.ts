import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { InsuranceService } from './insurance.service';
import { CreateInsuranceDto } from './dto/create-insurance.dto';
import { UpdateInsuranceDto } from './dto/update-insurance.dto';
import { FindInsuranceQuery } from './dto/find-insurance.query';

@Controller('insurance')
export class InsuranceController {
  constructor(private readonly insuranceService: InsuranceService) {}

  @Post()
  create(@Body() createInsuranceDto: CreateInsuranceDto) {
    return this.insuranceService.createInsurance(createInsuranceDto);
  }

   @Get()  
  findAll(@Query() query: FindInsuranceQuery) {
    return this.insuranceService.findAll(query);
  }

  // 🔐 Minimal list for selects: active only (companyId + name)
  @Get('options')
  
  options() {
    return this.insuranceService.listOptions();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.insuranceService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string, 
    @Body() updateInsuranceDto: UpdateInsuranceDto,
  ) {
    return this.insuranceService.updateInsurance(id, updateInsuranceDto);
  }

  // Soft delete
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.insuranceService.removeInsurance(id);
  }

  // Restore soft-deleted company
  @Patch(':id/restore')
  restore(@Param('id') id: string) {
    return this.insuranceService.restoreInsurance(id);
  }
}
