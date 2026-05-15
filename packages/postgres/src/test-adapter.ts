import { PostgresSyncAdapter } from "./adapter.js";
import { SyncEngine } from "zerithdb-sync";
import { DbClient } from "zerithdb-db";
import { NetworkManager } from "zerithdb-network";
import { AuthManager } from "zerithdb-auth";

async function testAdapter() {
  console.log("Setting up Postgres Sync test environment...");

  const config = {
    appId: "postgres-test-app",
    logLevel: "debug" as const,
  };

  const auth = new AuthManager(config);
  const db = new DbClient(config);
  const network = new NetworkManager(config, auth);
  const sync = new SyncEngine(config, db, network);

  const pgSync = new PostgresSyncAdapter(sync, {
    // Replace with your actual database connection string
    connectionString: "postgres://user:password@localhost:5432/zerithdb",
    slotName: "zerithdb_test_slot"
  });

  pgSync.on("connected", () => {
    console.log("✅ Postgres logical replication connected successfully!");
    console.log("Listening for WAL changes...");
  });

  pgSync.on("error", (err) => {
    console.error("❌ Postgres adapter error:", err.message);
  });

  try {
    await pgSync.start();
  } catch (err) {
    console.log("Failed to start pgSync. Ensure Postgres is running and logical replication is configured.");
  }
}

// execute if run directly
if (process.argv[1] && process.argv[1].endsWith("test-adapter.ts")) {
  testAdapter().catch(console.error);
}
