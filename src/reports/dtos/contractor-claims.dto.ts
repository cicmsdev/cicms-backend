import { IsIn, IsISO8601, IsOptional, IsString } from "class-validator";
import { Transform } from "class-transformer";

export class ContractorClaimsQueryDto {
  @IsOptional()
  @Transform(({ value }) => (value === "" ? undefined : value))
  @IsISO8601({}, { message: "dateFrom must be ISO date (YYYY-MM-DD)" })
  dateFrom?: string;

  @IsOptional()
  @Transform(({ value }) => (value === "" ? undefined : value))
  @IsISO8601({}, { message: "dateTo must be ISO date (YYYY-MM-DD)" })
  dateTo?: string; // exclusive (your service already treats it that way)

  @IsOptional()
  @Transform(({ value }) => (value === "" ? undefined : value))
  @IsString()
  companyId?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === "string" ? value.toLowerCase() : undefined
  )
  @IsIn(["json", "pdf"])
  format?: "json" | "pdf";
}
