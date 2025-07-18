import { ReactNode } from "react"
import { WalletConnectContextProvider } from "../contexts/WalletConnectContext"
import {WalletConnectClient} from "./wallets/walletconnect/walletConnectClient";

export const AllWalletsProvider = (props: {
  children: ReactNode | undefined
}) => {
  return (
      <WalletConnectContextProvider>
        <WalletConnectClient/>
        {props.children}
      </WalletConnectContextProvider>
  )
}
