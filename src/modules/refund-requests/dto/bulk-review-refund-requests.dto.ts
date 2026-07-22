import { IsArray, IsString, IsOptional, IsIn } from 'class-validator';

export class BulkReviewRefundRequestsDto {
  @IsArray()
  ids: number[];

  @IsString()
  @IsIn(['approve', 'reject'])
  decision: 'approve' | 'reject';

  @IsString()
  @IsOptional()
  comment?: string;
}
