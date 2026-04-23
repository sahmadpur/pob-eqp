import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GateClarifyDto {
  @ApiProperty({ example: 'POB-ORD-XYZ123' })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({
    example: 'CMR document does not match the cargo declared. Please rectify with finance.',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  requestNote: string;
}
