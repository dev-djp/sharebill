import { IsString, Length, Matches } from 'class-validator';

export class LoginDto {
  @IsString()
  @Length(11, 11, { message: '手机号必须是11位' })
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone: string;

  @IsString()
  @Length(6, 6, { message: '验证码必须是6位' })
  code: string;
}
