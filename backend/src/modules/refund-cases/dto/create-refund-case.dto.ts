import { IsString, IsNotEmpty, IsNumber, IsEnum, IsOptional } from 'class-validator';
import { PaymentMethod } from '../../../entities/refund-case.entity';

export class CreateRefundCaseDto {
  @IsString()
  @IsNotEmpty()
  msisdn: string;

  @IsNumber()
  @IsOptional()
  amount?: number;

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @IsString()
  @IsOptional()
  accountNumber?: string;

  @IsString()
  @IsOptional()
  packageCode?: string;

  @IsString()
  @IsOptional()
  orderId?: string;

  @IsString()
  @IsOptional()
  transactionDatetime?: string;

  @IsString()
  @IsOptional()
  createdBy?: string;
}
