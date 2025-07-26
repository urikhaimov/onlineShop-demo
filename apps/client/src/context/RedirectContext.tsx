// ✅ Fixed RedirectContext to auto-clear redirect after use
import React, { createContext, useContext, useState } from 'react';

interface RedirectContextProps {
  redirectTo: string | null;
  setRedirectTo: (path: string | null) => void;
  message: string | null;
  setMessage: (msg: string | null) => void;
  consumeRedirect: () => string | null;
}

const RedirectContext = createContext<RedirectContextProps | undefined>(
  undefined,
);

export const RedirectProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [redirectTo, setRedirectTo] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const consumeRedirect = () => {
    const target = redirectTo;
    setRedirectTo(null);
    return target;
  };

  return (
    <RedirectContext.Provider
      value={{
        redirectTo,
        setRedirectTo,
        message,
        setMessage,
        consumeRedirect,
      }}
    >
      {children}
    </RedirectContext.Provider>
  );
};

export const useRedirect = (): RedirectContextProps => {
  const context = useContext(RedirectContext);
  if (!context) {
    throw new Error('useRedirect must be used within a RedirectProvider');
  }
  return context;
};
