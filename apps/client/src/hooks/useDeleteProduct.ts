import axiosInstance from '../api/axiosInstance';

export async function deleteProduct(productId: string): Promise<void> {
  await axiosInstance.delete(`/products/${productId}`);
}
