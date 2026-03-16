import { IsEnum, IsString, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DocumentType } from '@pob-eqp/shared';

export class PresignedUrlRequestDto {
  @ApiProperty({ enum: DocumentType })
  @IsEnum(DocumentType)
  documentType: DocumentType;

  @ApiProperty({ example: 'application/pdf' })
  @IsString()
  contentType: string;

  @ApiProperty({ example: 2048576 })
  @IsNumber()
  @Min(1)
  @Max(10 * 1024 * 1024) // 10 MB max
  fileSize: number;
}
