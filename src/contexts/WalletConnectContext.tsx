import { createContext, useState, ReactNode, useEffect } from "react";

const defaultValue = {
  accountId: '',
  setAccountId: (newValue: string) => { },
  isConnected: false,
  setIsConnected: (newValue: boolean) => { },
}

export const WalletConnectContext = createContext(defaultValue);

export const WalletConnectContextProvider = (props: { children: ReactNode | undefined }) => {
  const [accountId, setAccountId] = useState(defaultValue.accountId);
  const [isConnected, setIsConnected] = useState(defaultValue.isConnected);

  useEffect(() => { console.log('accountId', accountId);
   }, [accountId]);
  return (
    <WalletConnectContext.Provider
      value={{
        accountId,
        setAccountId,
        isConnected,
        setIsConnected
      }}
    >
      {props.children}
    </WalletConnectContext.Provider>
  )
}
