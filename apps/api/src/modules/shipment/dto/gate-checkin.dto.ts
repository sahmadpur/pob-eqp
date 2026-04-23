import { IsString, IsNotEmpty, IsObject, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GateCheckInDto {
  @ApiProperty({ example: 'POB-ORD-XYZ123' })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({ enum: ['QR_SCAN', 'MANUAL_ENTRY'], example: 'QR_SCAN' })
  @IsString()
  @IsIn(['QR_SCAN', 'MANUAL_ENTRY'])
  method: 'QR_SCAN' | 'MANUAL_ENTRY';

  @ApiProperty({
    description: 'Map of physical-document check labels → boolean (all should be true to pass)',
    example: { documentsOk: true, driverIdOk: true, vehicleOk: true },
  })
  @IsObject()
  checksResult: Record<string, boolean>;

  @ApiPropertyOptional({ example: '10-AB-123' })
  @IsString()
  @IsOptional()
  vehiclePlate?: string;
}
