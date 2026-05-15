import { LogicalReplicationService, PluginTestDecoding } from "pg-logical-replication";
import type { SyncEngine } from "zerithdb-sync";
import * as Y from "yjs";
import { EventEmitter } from "zerithdb-core";

export interface PostgresAdapterOptions {
  connectionString: string;
  slotName?: string;
  publication?: string;
}

export class PostgresSyncAdapter extends EventEmitter<{
  error: Error;
  connected: void;
  disconnected: void;
}> {
  private replService: LogicalReplicationService;
  private readonly slotName: string;
  private _isConnected = false;
  private watchedCollections = new Set<string>();

  constructor(
    private readonly syncEngine: SyncEngine,
    private readonly options: PostgresAdapterOptions
  ) {
    super();
    this.slotName = options.slotName ?? "zerithdb_sync_slot";

    this.replService = new LogicalReplicationService({
      connectionString: options.connectionString,
      application_name: "zerithdb_sync",
    });
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  async start(): Promise<void> {
    if (this._isConnected) return;

    this.replService.on("data", (lsn: string, log: any) => {
      this.handlePostgresChange(log);
    });

    this.replService.on("error", (err: Error) => {
      this.emit("error", err);
    });

    try {
      const plugin = new PluginTestDecoding();
      await this.replService.subscribe(plugin, this.slotName);
      this._isConnected = true;
      this.emit("connected", undefined);
    } catch (err) {
      this.emit("error", err as Error);
      throw err;
    }
  }

  async stop(): Promise<void> {
    if (!this._isConnected) return;
    await this.replService.stop();
    this._isConnected = false;
    this.emit("disconnected", undefined);
  }

  /**
   * Watch a collection for remote changes to write back to Postgres.
   */
  watchCollection(collectionName: string) {
    if (this.watchedCollections.has(collectionName)) return;

    const doc = this.syncEngine.getDoc(collectionName);
    const map = doc.getMap("data");

    map.observe((event, transaction) => {
      // Ignore local changes made by this adapter
      if (transaction.origin === "postgres") return;

      // Translate Yjs updates to Postgres SQL
      for (const [key, change] of event.changes.keys.entries()) {
        if (change.action === "add" || change.action === "update") {
          const value = map.get(key);
          this.executeUpsert(collectionName, key, value);
        } else if (change.action === "delete") {
          this.executeDelete(collectionName, key);
        }
      }
    });

    this.watchedCollections.add(collectionName);
  }

  private handlePostgresChange(log: any): void {
    const collectionName = log.schema && log.table ? `${log.schema}.${log.table}` : "public.default";
    this.watchCollection(collectionName);
    
    const doc = this.syncEngine.getDoc(collectionName);
    const map = doc.getMap("data");

    doc.transact(() => {
      if (log.action === "insert" || log.action === "update") {
        const id = log.data.id || log.data._id;
        if (id) {
          map.set(id, log.data);
        }
      } else if (log.action === "delete") {
        const id = log.data.id || log.data._id;
        if (id && map.has(id)) {
          map.delete(id);
        }
      }
    }, "postgres");
  }

  private async executeUpsert(collectionName: string, id: string, data: any): Promise<void> {
    // In a real implementation, you'd use pg library to execute an UPSERT:
    // INSERT INTO schema.table (...) VALUES (...) ON CONFLICT (id) DO UPDATE SET ...
    console.log(`[PostgresAdapter] Upserting to ${collectionName} id=${id}`, data);
  }

  private async executeDelete(collectionName: string, id: string): Promise<void> {
    // In a real implementation, you'd use pg library to execute a DELETE:
    // DELETE FROM schema.table WHERE id = $1
    console.log(`[PostgresAdapter] Deleting from ${collectionName} id=${id}`);
  }
}
