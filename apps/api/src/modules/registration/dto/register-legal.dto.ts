import { IsEmail, IsOptional, IsString, IsStrongPassword, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterLegalDto {
  @ApiPropertyOptional({ example: 'info@company.az' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+994121234567' })
  @IsOptional()
  @Matches(/^\+[1-9]\d{6,14}$/, { message: 'Phone must be in E.164 format' })
  phone?: string;

  @ApiProperty({ minLength: 8 })
  @IsStrongPassword({ minLength: 8, minUppercase: 1, minNumbers: 1, minSymbols: 1 })
  password: string;

  @ApiProperty({ example: 'ABC Logistics LLC' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  companyName: string;

  @ApiProperty({ example: '1234567890' })
  @IsString()
  @MinLength(5)
  @MaxLength(30)
  taxRegistrationId: string;

  @ApiProperty({ example: 'Kamran Aliyev' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  contactPersonName: string;

  @ApiPropertyOptional({ example: '+994501234567' })
  @IsOptional()
  @Matches(/^\+[1-9]\d{6,14}$/, { message: 'Phone must be in E.164 format' })
  contactPersonPhone?: string;

  @ApiPropertyOptional({ enum: ['AZ', 'EN', 'RU', 'TR'], default: 'AZ' })
  @IsOptional()
  @IsString()
  preferredLanguage?: string;
}
