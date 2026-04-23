import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ParkingSlotStatus, OrderStatus } from '@pob-eqp/shared';

@Injectable()
export class ParkingService {
  constructor(private readonly prisma: PrismaService) {}

  async assignParkingSlot(orderId: string, zoneId: string, slotId: string, assignedById: string) {
    const order = await this.prisma.order.findUnique({ where: { orderId } });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    if (order.status !== OrderStatus.IN_SHIPMENT) {
      throw new BadRequestException('Order must be IN_SHIPMENT (gate-checked-in) before parking assignment');
    }
    if (order.parkingBayId) throw new ConflictException('Order already has a parking slot');

    const slot = await this.prisma.parkingSlot.findUnique({
      where: { id: slotId },
      include: { zone: true },
    });
    if (!slot) throw new NotFoundException(`Parking slot ${slotId} not found`);
    if (slot.zoneId !== zoneId) {
      throw new BadRequestException('Selected slot does not belong to the chosen zone');
    }
    if (!slot.isActive) throw new BadRequestException('Selected slot is not active');
    if (slot.status !== ParkingSlotStatus.AVAILABLE) {
      throw new ConflictException(`Slot ${slot.slotLabel} is not available (current status: ${slot.status})`);
    }

    await this.prisma.$transaction([
      this.prisma.parkingSlot.update({
        where: { id: slot.id },
        data: { status: ParkingSlotStatus.OCCUPIED },
      }),
      this.prisma.order.update({
        where: { orderId },
        data: {
          parkingBayId: slot.id,
          parkingConfirmedAt: new Date(),
        },
      }),
      this.prisma.orderEvent.create({
        data: {
          orderId: order.id,
          actor: 'Parking',
          actorId: assignedById,
          event: 'PARKING_ASSIGNED',
          note: `Assigned to zone ${slot.zone.name}, slot ${slot.slotLabel}`,
        },
      }),
    ]);

    return { ...slot, status: ParkingSlotStatus.OCCUPIED };
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
      include: { slots: { orderBy: { slotLabel: 'asc' } } },
    });
  }

  async getSlotsForZone(zoneId: string, status?: ParkingSlotStatus) {
    const zone = await this.prisma.parkingZone.findUnique({ where: { id: zoneId } });
    if (!zone) throw new NotFoundException(`Parking zone ${zoneId} not found`);

    return this.prisma.parkingSlot.findMany({
      where: {
        zoneId,
        isActive: true,
        ...(status ? { status } : {}),
      },
      orderBy: { slotLabel: 'asc' },
      select: { id: true, slotLabel: true, status: true },
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
