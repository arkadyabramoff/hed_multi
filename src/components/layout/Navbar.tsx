import { HashConnectConnectButton } from "../hashconnect/hashconnect-client";
import {HashConnectClient} from "../hashconnect/hashconnect-client";

export const Navbar = () => {
  return (
    <>
      <HashConnectClient />
      <HashConnectConnectButton />
    </>
  );
};
