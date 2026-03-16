import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email or phone (E.164)' })
  @IsString()
  @IsNotEmpty()
  identifier: string;
}
