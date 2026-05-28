import React from 'react';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import { getEnv } from '@common/utils';

export const paypalClientId = getEnv('VITE_PAYPAL_CLIENT_ID', {
  env: import.meta.env,
}) as string;

if (!paypalClientId) {
  console.error('Missing VITE_PAYPAL_CLIENT_ID');
}

const PayPalProvider = ({ children }: { children: React.ReactNode }) => {
  if (!paypalClientId) return <>{children}</>;
  return (
    <PayPalScriptProvider
      options={{ clientId: paypalClientId, currency: 'USD' }}
    >
      {children}
    </PayPalScriptProvider>
  );
};

export default PayPalProvider;
