import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { OrdersRepository } from '../repositories/orders.repository';

@Injectable()
export class OrdersQueriesService {
  constructor(
    @Inject(OrdersRepository)
    private readonly repo: OrdersRepository,
  ) {}

  async getPublicStatusByPaymentIntent(piId: string) {
    const rec = await this.repo.findPublicByPaymentIntentId(piId);
    return rec
      ? { state: String(rec.status ?? ''), orderId: rec.id }
      : { state: '', orderId: null };
  }

  getOrdersByUserId(userId: string) {
    return this.repo.listByUser(userId);
  }

  getAllOrders() {
    return this.repo.listAll();
  }

  async getOrderById(
    userId: string,
    orderId: string,
    role: 'admin' | 'user' | string = 'user',
  ) {
    const rec = await this.repo.getOrder(orderId);
    if (!rec) throw new NotFoundException('Order not found');
    if (role !== 'admin' && rec.userId !== userId)
      throw new ForbiddenException();
    return rec;
  }

  getOrderDoc(orderId: string) {
    return this.repo.getOrderRaw(orderId);
  }
}
