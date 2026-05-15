export interface SyncUpdate {
  collectionName: string;
  update: Uint8Array;
  origin: string | null;
}

export interface SyncState {
  synced: boolean;
  pendingUpdates: number;
  connectedPeers: number;
}

export interface AwarenessState {
  peerId: string;
  did: string;
  cursor?: { line: number; column: number };
  [key: string]: unknown;
}

/**
 * Defines how sync updates are encoded and decoded for network transmission.
 * Swapping the protocol allows for hot-reloading different wire formats
 * (e.g. binary, JSON, encrypted) without restarting the sync engine.
 */
export interface SyncProtocol {
  readonly name: string;
  readonly version: string;
  encode(collectionName: string, update: Uint8Array): string | Uint8Array;
  decode(data: string | Uint8Array): { collectionName: string; update: Uint8Array } | null;
}
