import { IsIn, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class ReviewRefundRequestDto {
  @IsIn(['approve', 'reject'])
  decision: 'approve' | 'reject';

  @IsString()
  @IsOptional()
  comment?: string;
}
