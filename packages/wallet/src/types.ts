import type { Identity, Signature } from "zerithdb-core";

/**
 * Message types for SDK-to-Wallet communication
 */
export type WalletMessageType = 
  | "WALLET_HANDSHAKE"
  | "WALLET_SIGN_IN"
  | "WALLET_SIGN"
  | "WALLET_GET_IDENTITY"
  | "WALLET_PICK_FILE";

/**
 * Request sent from SDK to Wallet Iframe
 */
export interface WalletRequest<T = any> {
  id: string;
  type: WalletMessageType;
  payload?: T;
  appId: string;
}

/**
 * Response sent from Wallet Iframe back to SDK
 */
export interface WalletResponse<T = any> {
  id: string;
  type: WalletMessageType;
  payload?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Payload for WALLET_PICK_FILE
 */
export interface PickFileParams {
  collection: string;
  filter?: any;
  title?: string;
}

/**
 * Result of WALLET_PICK_FILE
 */
export interface PickedFile {
  collection: string;
  id: string;
  data: any;
}
