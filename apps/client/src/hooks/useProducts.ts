import axiosInstance from '../api/axiosInstance';

// No token needed here – it's handled in interceptor
export function fetchAllProducts() {
  return axiosInstance.get('/products');
}

export function fetchProductById(id: string) {
  return axiosInstance.get(`/products/${id}`);
}

export function reorderProducts(orderList: { id: string; order: number }[]) {
  return axiosInstance.post('/products/reorder', { orderList });
}

export function createProduct(productData: Record<string, any>) {
  return axiosInstance.post('/products', productData);
}

export function updateProduct(id: string, productData: Record<string, any>) {
  return axiosInstance.put(`/products/${id}`, productData);
}

export function deleteProduct(id: string) {
  return axiosInstance.delete(`/products/${id}`);
}

export function searchProducts(query: string) {
  return axiosInstance.get('/products/search', {
    params: { q: query },
  });
}

export function fetchProductCategories() {
  return axiosInstance.get('/products/categories');
}

export function fetchProductBrands() {
  return axiosInstance.get('/products/brands');
}
