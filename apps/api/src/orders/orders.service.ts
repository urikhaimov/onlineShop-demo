import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { CreateOrderDto } from './dto/create-order.dto';
import { adminDb } from '@common/firebase';

@Injectable()
export class OrdersService {
  private stripe: Stripe;

  constructor(private readonly config: ConfigService) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      throw new Error('Missing STRIPE_SECRET_KEY in environment');
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-06-30.basil',
    });
  }

  // ✅ Used on frontend direct checkout (e.g. cash, testing, etc.)
  async createOrder(dto: CreateOrderDto) {
    const plainItems = dto.items.map((item) => ({
      productId: item.productId,
      name: item.name,
      price: item.price,
      image: item.image,
      quantity: item.quantity,
    }));

    const order = {
      ...dto,
      items: plainItems, // <-- pass plain objects, not class instances
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const ref = await adminDb.collection('orders').add(order);
    return { id: ref.id, ...order };
  }

  async getOrdersByUserId(uid: string) {
    const snapshot = await adminDb
      .collection('orders')
      .where('userId', '==', uid)
      .get();

    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async getOrderById(uid: string, id: string, role: string) {
    const doc = await adminDb.collection('orders').doc(id).get();
    const data = doc.data();

    if (!doc.exists || !data) throw new Error('Order not found');

    if (role === 'admin' || role === 'superadmin' || data.userId === uid) {
      return { id: doc.id, ...data };
    }

    throw new Error('Unauthorized');
  }

  async getAllOrders() {
    const snapshot = await adminDb.collection('orders').get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  // ✅ Create a PaymentIntent from frontend

  async createPaymentIntent(
    amount: number,
    ownerName: string,
    passportId: string,
    uid: string,
    cart: any[],
    shipping: number,
    taxRate: number,
    discount: number,
  ) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount, // already in cents
        currency: 'usd',
        automatic_payment_methods: { enabled: true },
        metadata: {
          uid,
          ownerName,
          passportId,
          shipping: shipping.toString(),
          taxRate: taxRate.toString(),
          discount: discount.toString(),
          items: JSON.stringify(cart),
        },
      });

      return {
        clientSecret: paymentIntent.client_secret,
      };
    } catch (error) {
      console.error('❌ Stripe error:', error);
      throw new InternalServerErrorException('Failed to create payment intent');
    }
  }

  // ✅ Stripe webhook entry point
  async handleStripeWebhook(rawBody: Buffer, signature: string) {
    try {
      const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
      if (!webhookSecret) throw new Error('Missing STRIPE_WEBHOOK_SECRET');

      const event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );

      if (event.type === 'payment_intent.succeeded') {
        const intent = event.data.object as Stripe.PaymentIntent;
        await this.createOrderFromIntent(intent);
      }

      return { received: true };
    } catch (err) {
      console.error('❌ Stripe webhook error:', err);
      throw new InternalServerErrorException('Webhook handling failed');
    }
  }

  // ✅ Called by webhook
  async createOrderFromIntent(intent: Stripe.PaymentIntent) {
    const uid = intent.metadata?.uid;
    const ownerName = intent.metadata?.ownerName;
    const passportId = intent.metadata?.passportId;
    const itemsRaw = intent.metadata?.items;

    if (!uid) throw new Error('Missing user ID in intent metadata');

    let items: any[] = [];
    try {
      if (itemsRaw) {
        items = JSON.parse(itemsRaw);
        if (!Array.isArray(items)) throw new Error();
      }
    } catch {
      console.warn('⚠️ Invalid or missing items in metadata');
    }

    const order = {
      userId: uid,
      items,
      totalAmount: intent.amount,
      paymentIntentId: intent.id,
      payment: {
        method: 'card',
        status: 'paid',
        transactionId: intent.id,
      },
      status: 'confirmed',
      ownerName,
      passportId,
      statusHistory: [
        {
          status: 'confirmed',
          timestamp: new Date().toISOString(),
          changedBy: 'system',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const ref = await adminDb.collection('orders').add(order);
    console.log('✅ Order created in Firestore from Stripe intent:', ref.id);
    return { id: ref.id, ...order };
  }
}
