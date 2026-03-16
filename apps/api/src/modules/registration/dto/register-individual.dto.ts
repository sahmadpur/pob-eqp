import { IsEmail, IsOptional, IsString, IsStrongPassword, IsDateString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterIndividualDto {
  @ApiPropertyOptional({ example: 'ali.mammadov@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+994501234567' })
  @IsOptional()
  @Matches(/^\+[1-9]\d{6,14}$/, { message: 'Phone must be in E.164 format' })
  phone?: string;

  @ApiProperty({ minLength: 8 })
  @IsStrongPassword({ minLength: 8, minUppercase: 1, minNumbers: 1, minSymbols: 1 })
  password: string;

  @ApiProperty({ example: 'Ali' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Mammadov' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastName: string;

  @ApiPropertyOptional({ example: 'Huseyn' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fathersName?: string;

  @ApiProperty({ example: '1990-05-15' })
  @IsDateString()
  dateOfBirth: Date;

  @ApiProperty({ example: 'AZE1234567' })
  @IsString()
  @MinLength(6)
  @MaxLength(30)
  nationalIdOrPassport: string;

  @ApiPropertyOptional({ enum: ['AZ', 'EN', 'RU', 'TR'], default: 'AZ' })
  @IsOptional()
  @IsString()
  preferredLanguage?: string;
}
