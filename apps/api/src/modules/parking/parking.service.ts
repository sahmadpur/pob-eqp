import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ParkingSlotStatus, OrderStatus, ParkingZoneType } from '@pob-eqp/shared';

interface CreateZoneInput {
  name: string;
  type: ParkingZoneType;
  capacity: number;
  slotPrefix: string;
  description?: string;
}

interface UpdateZoneInput {
  name?: string;
  type?: ParkingZoneType;
  capacity?: number;
  description?: string;
  isActive?: boolean;
}

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

  // ── Admin: zone CRUD + capacity management ────────────────────────────────

  async listZonesForAdmin() {
    const zones = await this.prisma.parkingZone.findMany({
      orderBy: { name: 'asc' },
      include: { slots: { select: { id: true, slotLabel: true, status: true, isActive: true } } },
    });

    return zones.map((z) => {
      const occupied = z.slots.filter((s) => s.status === ParkingSlotStatus.OCCUPIED).length;
      const reserved = z.slots.filter((s) => s.status === ParkingSlotStatus.RESERVED).length;
      const available = z.slots.filter((s) => s.status === ParkingSlotStatus.AVAILABLE).length;
      const slotPrefix = z.slots[0]?.slotLabel.split('-')[0] ?? '';
      return {
        id: z.id,
        name: z.name,
        type: z.type,
        capacity: z.capacity,
        description: z.description,
        isActive: z.isActive,
        slotPrefix,
        slotCount: z.slots.length,
        occupied,
        reserved,
        available,
      };
    });
  }

  async createZone(input: CreateZoneInput) {
    const existing = await this.prisma.parkingZone.findUnique({ where: { name: input.name } });
    if (existing) throw new ConflictException(`A zone named "${input.name}" already exists`);

    // Ensure prefix is unique among existing zones to avoid label collisions across zones (e.g., 'A-001').
    const allZones = await this.prisma.parkingZone.findMany({
      include: { slots: { select: { slotLabel: true }, take: 1 } },
    });
    const prefixUpper = input.slotPrefix.toUpperCase();
    const prefixTaken = allZones.some((z) => {
      const existingPrefix = z.slots[0]?.slotLabel.split('-')[0]?.toUpperCase();
      return existingPrefix === prefixUpper;
    });
    if (prefixTaken) {
      throw new ConflictException(`Slot prefix "${prefixUpper}" is already used by another zone`);
    }

    const zone = await this.prisma.parkingZone.create({
      data: {
        name: input.name,
        type: input.type,
        capacity: input.capacity,
        description: input.description,
      },
    });

    const slots = Array.from({ length: input.capacity }, (_, i) => ({
      zoneId: zone.id,
      slotLabel: `${prefixUpper}-${String(i + 1).padStart(3, '0')}`,
      status: ParkingSlotStatus.AVAILABLE,
    }));
    await this.prisma.parkingSlot.createMany({ data: slots });

    return this.getZoneAdminView(zone.id);
  }

  async updateZone(zoneId: string, input: UpdateZoneInput) {
    const zone = await this.prisma.parkingZone.findUnique({
      where: { id: zoneId },
      include: { slots: true },
    });
    if (!zone) throw new NotFoundException(`Parking zone ${zoneId} not found`);

    if (input.name && input.name !== zone.name) {
      const dup = await this.prisma.parkingZone.findUnique({ where: { name: input.name } });
      if (dup) throw new ConflictException(`A zone named "${input.name}" already exists`);
    }

    if (typeof input.capacity === 'number' && input.capacity !== zone.capacity) {
      await this.adjustCapacity(zone.id, input.capacity, zone.slots);
    }

    await this.prisma.parkingZone.update({
      where: { id: zoneId },
      data: {
        name: input.name ?? undefined,
        type: input.type ?? undefined,
        capacity: input.capacity ?? undefined,
        description: input.description ?? undefined,
        isActive: typeof input.isActive === 'boolean' ? input.isActive : undefined,
      },
    });

    return this.getZoneAdminView(zoneId);
  }

  async deleteZone(zoneId: string) {
    const zone = await this.prisma.parkingZone.findUnique({
      where: { id: zoneId },
      include: { slots: { include: { orders: { select: { id: true } } } } },
    });
    if (!zone) throw new NotFoundException(`Parking zone ${zoneId} not found`);

    const inUse = zone.slots.some(
      (s) => s.status !== ParkingSlotStatus.AVAILABLE || s.orders.length > 0,
    );
    if (inUse) {
      throw new ConflictException(
        'Cannot delete zone — slots are occupied/reserved or have linked orders. Deactivate the zone instead.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.parkingSlot.deleteMany({ where: { zoneId } }),
      this.prisma.parkingZone.delete({ where: { id: zoneId } }),
    ]);

    return { id: zoneId, deleted: true };
  }

  private async adjustCapacity(
    zoneId: string,
    newCapacity: number,
    currentSlots: { id: string; slotLabel: string; status: string; isActive: boolean }[],
  ) {
    const currentCount = currentSlots.length;
    if (newCapacity === currentCount) return;

    const prefix = currentSlots[0]?.slotLabel.split('-')[0];
    if (!prefix) {
      throw new BadRequestException('Cannot adjust capacity — existing slot prefix could not be determined');
    }

    if (newCapacity > currentCount) {
      // Expand: append new slots after the highest existing numeric suffix.
      const maxNum = currentSlots.reduce((max, s) => {
        const n = parseInt(s.slotLabel.split('-')[1] ?? '0', 10);
        return Number.isFinite(n) && n > max ? n : max;
      }, 0);
      const toCreate = newCapacity - currentCount;
      const newSlots = Array.from({ length: toCreate }, (_, i) => ({
        zoneId,
        slotLabel: `${prefix}-${String(maxNum + i + 1).padStart(3, '0')}`,
        status: ParkingSlotStatus.AVAILABLE,
      }));
      await this.prisma.parkingSlot.createMany({ data: newSlots, skipDuplicates: true });
      return;
    }

    // Shrink: remove from the highest-numbered AVAILABLE slots first.
    const toRemove = currentCount - newCapacity;
    const removable = currentSlots
      .filter((s) => s.status === ParkingSlotStatus.AVAILABLE)
      .sort((a, b) => {
        const an = parseInt(a.slotLabel.split('-')[1] ?? '0', 10);
        const bn = parseInt(b.slotLabel.split('-')[1] ?? '0', 10);
        return bn - an;
      })
      .slice(0, toRemove);

    if (removable.length < toRemove) {
      throw new ConflictException(
        `Cannot shrink capacity to ${newCapacity}: only ${removable.length} of ${toRemove} required slots are available (others are occupied or reserved).`,
      );
    }

    await this.prisma.parkingSlot.deleteMany({
      where: { id: { in: removable.map((s) => s.id) } },
    });
  }

  private async getZoneAdminView(zoneId: string) {
    const all = await this.listZonesForAdmin();
    const z = all.find((x) => x.id === zoneId);
    if (!z) throw new NotFoundException(`Parking zone ${zoneId} not found`);
    return z;
  }
}
