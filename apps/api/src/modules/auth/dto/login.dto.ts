import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email address or phone (E.164)' })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({ example: 'P@ssword1!' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  rememberMe?: boolean;
}
