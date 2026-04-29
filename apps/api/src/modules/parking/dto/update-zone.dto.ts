import { IsString, IsEnum, IsInt, Min, Max, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ParkingZoneType } from '@pob-eqp/shared';

export class UpdateZoneDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiProperty({ required: false, enum: ParkingZoneType })
  @IsOptional()
  @IsEnum(ParkingZoneType)
  type?: ParkingZoneType;

  @ApiProperty({ required: false, minimum: 1, maximum: 9999 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9999)
  capacity?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
