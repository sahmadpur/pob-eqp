import { Controller, Get, Post, Patch, Param, Body, UseGuards, Request, Query, Delete, UseInterceptors, UploadedFile, BadRequestException, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody, ApiProduces } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { OrdersService } from './orders.service';
import { QrService } from './qr.service';
import { DocumentService } from '../registration/document.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { UserRole, DocumentType } from '@pob-eqp/shared';

@ApiTags('orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly qrService: QrService,
    private readonly documentService: DocumentService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  async createOrder(
    @Body() dto: Parameters<OrdersService['createOrder']>[0],
    @Request() req: { user: { id: string; role: string; accountStatus: string } },
  ) {
    return this.ordersService.createOrder({ ...dto, userId: req.user.id, userRole: req.user.role });
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.FINANCE_OFFICER, UserRole.ADMINISTRATOR)
  @ApiOperation({ summary: 'Get all orders (staff only)' })
  async getAllOrders(
    @Query('status') status?: string,
    @Query('paymentMethod') paymentMethod?: string,
  ) {
    return this.ordersService.findAll({ status, paymentMethod });
  }

  @Get('me')
  @ApiOperation({ summary: 'Get my orders' })
  async getMyOrders(@Request() req: { user: { id: string; role: string; accountStatus: string } }) {
    return this.ordersService.findByUser(req.user.id);
  }

  // Static routes MUST come before dynamic :orderId to avoid NestJS shadowing them

  @Post(':orderId/documents')
  @ApiOperation({ summary: 'Upload a document for an order (vehicle, driver, or cargo)' })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'documentType'],
      properties: {
        file: { type: 'string', format: 'binary' },
        documentType: { type: 'string', enum: Object.values(DocumentType) },
      },
    },
  })
  async uploadOrderDocument(
    @Param('orderId') orderId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { documentType: string },
    @Request() req: { user: { id: string } },
  ) {
    if (!file) throw new BadRequestException('No file provided');
    const order = await this.ordersService.findByOrderId(orderId);
    const document = await this.documentService.saveUploadedFile({
      uploadedById: req.user.id,
      documentType: body.documentType as DocumentType,
      contentType: file.mimetype,
      fileSize: file.size,
      originalFileName: file.originalname,
      fileBuffer: file.buffer,
      orderId: order.id,
    });
    return document;
  }

  @Get('availability/:planId/:queueTypeId')
  @ApiOperation({ summary: 'Get daily slot availability' })
  async getAvailability(
    @Param('planId') planId: string,
    @Param('queueTypeId') queueTypeId: string,
    @Query('date') date: string,
  ) {
    return this.ordersService.getDailyAvailability(planId, queueTypeId, date);
  }

  @Get(':orderId/qr')
  @ApiOperation({ summary: 'Get QR code PNG for an order (generates on demand if missing)' })
  @ApiProduces('image/png')
  async getOrderQr(
    @Param('orderId') orderId: string,
    @Res() res: Response,
  ): Promise<void> {
    const fileKey = await this.ordersService.getOrGenerateQrKey(orderId);
    const fullPath = this.qrService.getFullPath(fileKey);
    res.set({
      'Content-Type': 'image/png',
      'Content-Disposition': `inline; filename="${orderId}-qr.png"`,
      'Cache-Control': 'public, max-age=86400',
    });
    res.sendFile(fullPath);
  }

  @Get(':orderId')
  @ApiOperation({ summary: 'Get order details by orderId' })
  async getOrder(@Param('orderId') orderId: string) {
    return this.ordersService.findByOrderId(orderId);
  }

  @Patch(':orderId')
  @ApiOperation({ summary: 'Edit an order (customer, PENDING_PAYMENT only)' })
  async editOrder(
    @Param('orderId') orderId: string,
    @Body() dto: Parameters<OrdersService['editOrder']>[2],
    @Request() req: { user: { id: string; role: string; accountStatus: string } },
  ) {
    return this.ordersService.editOrder(orderId, req.user.id, dto);
  }

  @Post(':orderId/cancel')
  @ApiOperation({ summary: 'Cancel an order (customer, PENDING_PAYMENT only)' })
  async cancelOrder(
    @Param('orderId') orderId: string,
    @Request() req: { user: { id: string; role: string; accountStatus: string } },
  ) {
    const [order] = await this.ordersService.cancelOrder(orderId, req.user.id);
    return order;
  }

  @Patch(':orderId/status')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.ADMINISTRATOR,
    UserRole.FINANCE_OFFICER,
    UserRole.CONTROL_TOWER_OPERATOR,
    UserRole.GATE_OFFICER,
    UserRole.TERMINAL_OPERATOR,
  )
  @ApiOperation({ summary: 'Update order status (staff only)' })
  async updateStatus(
    @Param('orderId') orderId: string,
    @Body() dto: { status: string; note?: string },
    @Request() req: { user: { id: string; role: string; accountStatus: string } },
  ) {
    const [, event] = await this.ordersService.updateStatus(
      orderId,
      dto.status as Parameters<OrdersService['updateStatus']>[1],
      req.user.id,
      dto.note,
    );
    return event;
  }

  @Post(':orderId/verify')
  @UseGuards(RolesGuard)
  @Roles(UserRole.FINANCE_OFFICER, UserRole.ADMINISTRATOR)
  @ApiOperation({ summary: 'Finance Officer: verify order after payment' })
  async verifyOrder(
    @Param('orderId') orderId: string,
    @Body() dto: Parameters<OrdersService['verifyOrder']>[2],
    @Request() req: { user: { id: string; role: string; accountStatus: string } },
  ) {
    return this.ordersService.verifyOrder(orderId, req.user.id, dto);
  }

  @Post(':orderId/clarify/respond')
  @ApiOperation({ summary: 'Customer: respond to clarification request' })
  async respondToClarification(
    @Param('orderId') orderId: string,
    @Body() dto: { customerNote: string; customerDocIds?: string[] },
    @Request() req: { user: { id: string; role: string; accountStatus: string } },
  ) {
    return this.ordersService.respondToClarification(orderId, req.user.id, dto);
  }

  @Post(':orderId/clarify')
  @UseGuards(RolesGuard)
  @Roles(UserRole.FINANCE_OFFICER, UserRole.ADMINISTRATOR)
  @ApiOperation({ summary: 'Finance Officer: request clarification from customer' })
  async requestClarification(
    @Param('orderId') orderId: string,
    @Body() dto: { requestNote: string },
    @Request() req: { user: { id: string; role: string; accountStatus: string } },
  ) {
    return this.ordersService.requestClarification(orderId, req.user.id, dto.requestNote);
  }
}
