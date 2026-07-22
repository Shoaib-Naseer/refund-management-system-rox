import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { CreateRefundRequestDto } from './create-refund-request.dto';

export class BulkCreateAndRefundDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => CreateRefundRequestDto)
  records: CreateRefundRequestDto[];

  @IsBoolean()
  @IsOptional()
  autoApprove?: boolean;
}
