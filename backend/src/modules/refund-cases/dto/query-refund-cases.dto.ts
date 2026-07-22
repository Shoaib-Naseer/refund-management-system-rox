import { IsString, IsOptional, IsEnum } from 'class-validator';
import {
  RefundCaseStatus,
  VerificationResult,
  RefundStatus,
  PaymentMethod,
} from '../../../entities/refund-case.entity';

export class QueryRefundCasesDto {
  @IsString()
  @IsOptional()
  page?: string;

  @IsString()
  @IsOptional()
  limit?: string;

  @IsEnum(RefundCaseStatus)
  @IsOptional()
  status?: RefundCaseStatus;

  @IsEnum(VerificationResult)
  @IsOptional()
  verificationResult?: VerificationResult;

  @IsEnum(RefundStatus)
  @IsOptional()
  refundStatus?: RefundStatus;

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  msisdn?: string;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;
}
