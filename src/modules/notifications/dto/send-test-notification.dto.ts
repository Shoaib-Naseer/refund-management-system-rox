import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class SendTestNotificationDto {
  @IsString()
  @IsNotEmpty()
  msisdn: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsIn(['INFO', 'SUCCESS', 'WARNING'])
  @IsOptional()
  type?: 'INFO' | 'SUCCESS' | 'WARNING';
}
