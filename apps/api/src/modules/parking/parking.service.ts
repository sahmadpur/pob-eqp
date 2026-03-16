import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ParkingSlotStatus, CargoType, ParkingZoneType } from '@pob-eqp/shared';

// Schema CargoType: GENERAL | BULK | REFRIGERATED | HAZARDOUS | OVERSIZED | PERISHABLE
// Schema ParkingZoneType: REGULAR | FAST_TRACK | HAZARDOUS_PRIORITY | OVERSIZED
const CARGO_TO_ZONE_MAP: Partial<Record<CargoType, ParkingZoneType>> = {
  [CargoType.GENERAL]: ParkingZoneType.REGULAR,
  [CargoType.BULK]: ParkingZoneType.REGULAR,
  [CargoType.REFRIGERATED]: ParkingZoneType.REGULAR,
  [CargoType.PERISHABLE]: ParkingZoneType.REGULAR,
  [CargoType.HAZARDOUS]: ParkingZoneType.HAZARDOUS_PRIORITY,
  [CargoType.OVERSIZED]: ParkingZoneType.OVERSIZED,
};

@Injectable()
export class ParkingService {
  constructor(private readonly prisma: PrismaService) {}

  async assignParkingSlot(orderId: string, cargoType: CargoType, assignedById: string) {
    const order = await this.prisma.order.findUnique({ where: { orderId } });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    if (order.parkingBayId) throw new ConflictException('Order already has a parking slot'); // schema: parkingBayId

    const zoneType = CARGO_TO_ZONE_MAP[cargoType] ?? ParkingZoneType.REGULAR;

    const availableSlot = await this.prisma.parkingSlot.findFirst({
      where: {
        zone: { type: zoneType },
        status: ParkingSlotStatus.AVAILABLE,
        isActive: true,
      },
      include: { zone: true },
    });

    if (!availableSlot) {
      throw new NotFoundException(`No available parking slot for cargo type ${cargoType}`);
    }

    await this.prisma.$transaction([
      this.prisma.parkingSlot.update({
        where: { id: availableSlot.id },
        data: { status: ParkingSlotStatus.OCCUPIED },
      }),
      this.prisma.order.update({
        where: { orderId },
        data: {
          parkingBayId: availableSlot.id,       // schema: parkingBayId (FK to ParkingSlot)
          parkingConfirmedAt: new Date(),
        },
      }),
    ]);

    return availableSlot;
  }

  async releaseParkingSlot(slotId: string) {
    const slot = await this.prisma.parkingSlot.findUnique({ where: { id: slotId } });
    if (!slot) throw new NotFoundException(`Parking slot ${slotId} not found`);

    return this.prisma.parkingSlot.update({
      where: { id: slot.id },
      data: { status: ParkingSlotStatus.AVAILABLE },
    });
  }

  async getParkingZones() {
    return this.prisma.parkingZone.findMany({
      include: { slots: { orderBy: { slotLabel: 'asc' } } }, // schema: slotLabel (not slotCode)
    });
  }

  async getParkingOccupancy() {
    const zones = await this.prisma.parkingZone.findMany({ include: { slots: true } });

    return zones.map((z) => ({
      zoneId: z.id,
      zoneName: z.name,
      type: z.type,
      total: z.slots.length,
      occupied: z.slots.filter((s) => s.status === ParkingSlotStatus.OCCUPIED).length,
      available: z.slots.filter((s) => s.status === ParkingSlotStatus.AVAILABLE).length,
    }));
  }
}
