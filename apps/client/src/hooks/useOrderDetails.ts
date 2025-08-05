import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import api from '../api/axiosInstance';
import { TOrder as Order } from '@common/types';
export const useOrderDetails = (id?: string, enabled = true) => {
  const [downloading, setDownloading] = useState(false);

  const {
    data: order,
    isLoading: loading,
    error,
  } = useQuery<Order>({
    queryKey: ['orderDetails', id],
    queryFn: async () => {
      if (!id) return Promise.reject(new Error('Missing ID'));
      const res = await api.get(`/orders/${id}`);
      return res.data;
    },
    enabled: !!id && enabled,
    staleTime: 5 * 60 * 1000,
  });

  const downloadInvoice = async () => {
    if (!order) return;
    setDownloading(true);
    try {
      const input = document.getElementById('invoice-content');
      if (!input) return;

      const canvas = await html2canvas(input, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();

      pdf.setFontSize(18);
      pdf.text('My Online Store', pageWidth / 2, 15, { align: 'center' });

      pdf.setFontSize(14);
      pdf.text(`Invoice #${order.id}`, 14, 30);
      pdf.setFontSize(12);
      pdf.text(`Date: ${new Date().toLocaleDateString()}`, 14, 38);
      pdf.text(`Customer: ${order.ownerName}`, 14, 46);

      const imgProps = pdf.getImageProperties(imgData);
      const imgWidth = pageWidth - 20;
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 10, 55, imgWidth, imgHeight);
      pdf.save(`invoice-${order.id}.pdf`);
    } catch (err) {
      console.error('Invoice generation failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  return {
    order,
    loading,
    error,
    downloading,
    downloadInvoice,
  };
};
