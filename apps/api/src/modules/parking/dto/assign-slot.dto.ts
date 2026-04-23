import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignSlotDto {
  @ApiProperty({ example: 'POB-ORD-XYZ123' })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({ example: 'cuid_of_zone' })
  @IsString()
  @IsNotEmpty()
  zoneId: string;

  @ApiProperty({ example: 'cuid_of_slot' })
  @IsString()
  @IsNotEmpty()
  slotId: string;
}
