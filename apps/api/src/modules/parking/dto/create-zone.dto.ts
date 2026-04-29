import { IsString, IsNotEmpty, IsEnum, IsInt, Min, Max, IsOptional, Matches, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ParkingZoneType } from '@pob-eqp/shared';

export class CreateZoneDto {
  @ApiProperty({ example: 'Zone E — Refrigerated Cargo' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiProperty({ enum: ParkingZoneType, example: ParkingZoneType.REGULAR })
  @IsEnum(ParkingZoneType)
  type: ParkingZoneType;

  @ApiProperty({ example: 50, minimum: 1, maximum: 9999 })
  @IsInt()
  @Min(1)
  @Max(9999)
  capacity: number;

  @ApiProperty({ example: 'E', description: 'Slot label prefix (1-4 alphanumeric chars). Used to generate labels like E-001, E-002.' })
  @IsString()
  @Matches(/^[A-Za-z0-9]{1,4}$/, { message: 'slotPrefix must be 1-4 alphanumeric characters' })
  slotPrefix: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
