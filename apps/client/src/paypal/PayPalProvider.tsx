import React from 'react';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import { getEnv } from '@common/utils';

const clientId = getEnv('VITE_PAYPAL_CLIENT_ID', {
  env: import.meta.env,
}) as string;

if (!clientId) {
  console.error('Missing VITE_PAYPAL_CLIENT_ID');
}

const PayPalProvider = ({ children }: { children: React.ReactNode }) => (
  <PayPalScriptProvider options={{ clientId: clientId ?? '', currency: 'USD' }}>
    {children}
  </PayPalScriptProvider>
);

export default PayPalProvider;
