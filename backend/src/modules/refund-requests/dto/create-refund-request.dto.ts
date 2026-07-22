import { IsString, IsNotEmpty, IsObject, IsOptional, IsBoolean, IsNumber, IsInt } from 'class-validator';

/**
 * `historyRecord` is expected to be exactly one record as returned by
 * GET /api/history/:msisdn (see HistoryRecord in history.service.ts) — the
 * client echoes back the row the user selected, but the server re-derives
 * eligibility from the source DB rather than trusting these fields blindly.
 */
export class CreateRefundRequestDto {
  @IsString()
  @IsNotEmpty()
  msisdn: string;

  @IsObject()
  @IsNotEmpty()
  historyRecord: Record<string, any>;

  /** Optional link back to an existing RefundCase (from the /api/cases flow), if this request originated from one. */
  @IsInt()
  @IsOptional()
  refundCaseId?: number;

  @IsString()
  @IsOptional()
  requestReason?: string;

  @IsBoolean()
  @IsOptional()
  isOverride?: boolean;

  @IsString()
  @IsOptional()
  overrideJustification?: string;

  @IsNumber()
  @IsOptional()
  requestedRefundAmount?: number;
}
