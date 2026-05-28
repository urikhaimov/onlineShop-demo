import React from 'react';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import { getEnv } from '@common/utils';

const clientId = getEnv('VITE_PAYPAL_CLIENT_ID', {
  env: import.meta.env,
}) as string;

if (!clientId) {
  console.error('Missing VITE_PAYPAL_CLIENT_ID');
}

const PayPalProvider = ({ children }: { children: React.ReactNode }) => {
  if (!clientId) return <>{children}</>;
  return (
    <PayPalScriptProvider options={{ clientId, currency: 'USD' }}>
      {children}
    </PayPalScriptProvider>
  );
};

export default PayPalProvider;
