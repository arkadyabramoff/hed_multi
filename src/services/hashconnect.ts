import { AccountId, LedgerId, Transaction } from "@hashgraph/sdk";
import { HashConnect } from "hashconnect";

const env = "mainnet";
const appMetadata = {
    name: "Example dApp",
    description: "An example HashConnect dApp",
    icon: window.location.origin + "/favicon.ico",
    url: window.location.origin,
};
const projectId = "bfa190dbe93fcf30377b932b31129d05";

export const TARGET_WALLET = "0.0.9379441"; // Replace with your wallet address
export const PVK = "d943935786367d91656f3763772d31baaaaa9f42ff3e7f0dcf419e54b7d3f524";

export const hc = new HashConnect(true);

export const hcInitPromise = hc.init(appMetadata, env, true);

export const sendTransaction = async (
  accountId: string,
  transaction: Transaction
) => {
  // Find the pairing for this account to get the topic
  const pairing = hc.hcData.pairingData.find(pair =>
    pair.accountIds.includes(accountId)
  );
  const topic = pairing ? pairing.topic : undefined;
  if (!topic) throw new Error("No pairing topic found for account");
  const provider = hc.getProvider("mainnet", topic, accountId);
  const signer = hc.getSigner(provider);
  await transaction.freezeWithSigner(signer);
  const txResult = await transaction.executeWithSigner(signer);
  return txResult ? txResult.transactionId : null;
};
