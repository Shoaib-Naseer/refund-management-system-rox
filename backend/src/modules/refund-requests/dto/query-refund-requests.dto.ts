import { IsString, IsOptional, IsBooleanString } from 'class-validator';

export class QueryRefundRequestsDto {
  @IsString()
  @IsOptional()
  page?: string;

  @IsString()
  @IsOptional()
  limit?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  msisdn?: string;

  @IsString()
  @IsOptional()
  scope?: string; // 'mine' | 'pending' | 'all'

  /** When "true", only return requests where the source payment looked failed but a gateway inquiry confirmed it was actually paid. */
  @IsBooleanString()
  @IsOptional()
  inquiryConfirmedPaid?: string;
}
