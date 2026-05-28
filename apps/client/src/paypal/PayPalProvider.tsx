import React, { useEffect, useState } from 'react';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import { getEnv } from '@common/utils';
import axiosInstance from '../api/axiosInstance';

// Build-time fallback (used if API call fails or env var is set directly)
const envClientId = getEnv('VITE_PAYPAL_CLIENT_ID', {
  env: import.meta.env,
}) as string;

// Exported so CheckoutPage can guard rendering PayPalCheckoutForm
export let paypalClientId = envClientId;

const PayPalProvider = ({ children }: { children: React.ReactNode }) => {
  const [clientId, setClientId] = useState<string>(envClientId);
  const [ready, setReady] = useState(!!envClientId);

  useEffect(() => {
    axiosInstance
      .get<{ clientId: string; sandbox: boolean }>('/settings/paypal-client-id')
      .then(({ data }) => {
        if (data.clientId) {
          paypalClientId = data.clientId;
          setClientId(data.clientId);
        }
      })
      .catch(() => {
        // silently fall back to env var
      })
      .finally(() => setReady(true));
  }, []);

  if (!ready) return <>{children}</>;
  if (!clientId) return <>{children}</>;

  return (
    <PayPalScriptProvider options={{ clientId, currency: 'ILS' }}>
      {children}
    </PayPalScriptProvider>
  );
};

export default PayPalProvider;
