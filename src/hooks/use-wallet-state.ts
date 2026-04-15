import { useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

export function useWalletState() {
  const { publicKey, connected, connecting, disconnect, signMessage: adapterSignMessage, wallet } = useWallet();
  const { setVisible } = useWalletModal();

  const address = publicKey?.toString() ?? null;

  const connect = useCallback(() => {
    setVisible(true);
  }, [setVisible]);

  const handleDisconnect = useCallback(async () => {
    await disconnect();
  }, [disconnect]);

  const signMessage = useCallback(async (message: string): Promise<Uint8Array | null> => {
    if (!adapterSignMessage) return null;
    try {
      const encoded = new TextEncoder().encode(message);
      return await adapterSignMessage(encoded);
    } catch {
      return null;
    }
  }, [adapterSignMessage]);

  return {
    address,
    connected,
    connecting,
    connect,
    disconnect: handleDisconnect,
    signMessage,
    walletName: wallet?.adapter?.name ?? null,
    walletIcon: wallet?.adapter?.icon ?? null,
  };
}
