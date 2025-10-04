import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { OrdersRepository } from '../repositories/orders.repository';
import { OrderNotificationsService } from './order-notifications.service';
import { nowIso, stripUndefinedDeep } from '../utils/orders.helpers';

export type OrderStatus = 'open' | 'paid' | 'refunded' | 'canceled';

@Injectable()
export class OrdersLifecycleService {
  private readonly logger = new Logger(OrdersLifecycleService.name);

  constructor(
    @Inject(OrdersRepository) private readonly repo: OrdersRepository,
    @Optional()
    @Inject(OrderNotificationsService)
    private readonly notify?: OrderNotificationsService,
  ) {}

  async createOrder(dto: any) {
    const orderId =
      dto.id ?? dto.paymentIntentId ?? this.repo.ordersCol().doc().id;

    const payload = stripUndefinedDeep({
      id: orderId,
      userId: dto.userId,
      items: dto.items ?? [],
      total: dto.total ?? dto.totalMajor ?? 0,
      totalMajor: dto.totalMajor ?? dto.total ?? 0,
      totalMinor:
        dto.totalMinor ??
        (typeof dto.total === 'number' ? Math.round(dto.total * 100) : 0),
      currency: (dto.currency ?? 'ils').toLowerCase(),
      status: (dto.status ?? 'open') as OrderStatus,
      paymentIntentId: dto.paymentIntentId ?? null,
      payment: dto.payment,
      shippingAddress: dto.shippingAddress,
      customer: dto.customer,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      ...dto,
    });

    await this.repo.saveOrderMerge(orderId, payload);
    this.logger.log(`createOrder ${orderId} → ${payload.status}`);

    if (payload.status === 'paid') {
      await this.repo.decrementStockForOrder(orderId, payload.items || []);
      await this.notify?.sendManualReceiptIfNeeded({ id: orderId, ...payload });
    }

    return payload;
  }

  async updateOrder(id: string, dto: any, byUserId?: string) {
    const curr = await this.repo.getOrder(id);
    if (!curr) throw new NotFoundException('Order not found');
    if (byUserId && curr.userId && curr.userId !== byUserId)
      throw new ForbiddenException();

    const prevStatus = curr.status as OrderStatus;
    const nextStatus = (dto.status ?? prevStatus) as OrderStatus;

    await this.repo.saveOrderMerge(
      id,
      stripUndefinedDeep({ ...dto, updatedAt: nowIso() }),
    );
    const after = await this.repo.getOrder(id);

    if (prevStatus !== 'paid' && nextStatus === 'paid') {
      await this.repo.decrementStockForOrder(id, after?.items || []);
      await this.notify?.sendManualReceiptIfNeeded(after);
    }

    const shouldNotify =
      Object.prototype.hasOwnProperty.call(dto, 'status') ||
      Object.prototype.hasOwnProperty.call(dto, 'delivery') ||
      Object.prototype.hasOwnProperty.call(dto, 'shippingAddress');

    if (shouldNotify) await this.notify?.notifyCustomer(after, dto);

    return after;
  }

  async updateStatus(orderId: string, status: OrderStatus) {
    const before = await this.repo.getOrder(orderId);
    await this.repo.saveOrderMerge(orderId, { status, updatedAt: nowIso() });

    if ((before?.status as OrderStatus) !== 'paid' && status === 'paid') {
      const after = await this.repo.getOrder(orderId);
      await this.repo.decrementStockForOrder(orderId, after?.items || []);
    }
  }

  async markPaidByPaymentIntentId(paymentIntentId: string) {
    const byId = await this.repo.getOrder(paymentIntentId);
    if (byId) return this.repo.markPaid(paymentIntentId);

    const maybe = await this.repo.findPublicByPaymentIntentId(paymentIntentId);
    if (maybe) return this.repo.markPaid(maybe.id);
  }
}
