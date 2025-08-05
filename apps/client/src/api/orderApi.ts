import { TOrder as Order } from '@common/types';
import api from '../api/axiosInstance'; // ✅ With auth interceptors

export function fetchMyOrders() {
  return api.get<Order[]>('/orders/mine');
}

export function fetchAllOrders() {
  return api.get<Order[]>('/orders');
}

export function fetchOrderById(id: string) {
  return api.get<Order>(`/orders/${id}`);
}

export function updateOrderById(id: string, data: Partial<Order>) {
  return api.patch<Order>(`/orders/${id}`, data);
}
