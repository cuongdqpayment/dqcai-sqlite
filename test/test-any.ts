import {
  DatabaseSchema,
  NodeJSAdapter,
  DatabaseManager,
  BaseService,
  DatabaseFactory,
  ServiceManager,
} from "@dqcai/sqlite";
// ============================================
// 1. SCHEMA DEFINITION
// ============================================
import { core } from "./schemas.sqlite";

import { createModuleLogger, APPModules } from "./logger";
const logger = createModuleLogger(APPModules.TEST_ORM);

// ============================================
// 5. INITIALIZATION (FIXED)
// ============================================
async function initializeDatabase() {
  console.log("🔧 Initializing database...\n");

  // 1. Register schema FIRST
  DatabaseManager.registerSchema("core", core);
  console.log("✓ Schema registered");

  // 2. registerAdapter
  const nodeJSAdapter = new NodeJSAdapter();
  DatabaseFactory.registerAdapter(nodeJSAdapter);
  DatabaseManager.registerSchema("core", core);
  console.log("✓ Database connected");
  
  
  console.log("Core init");
  DatabaseManager.initializeCoreConnection();

  // 7. Register services
  console.log("\n🔌 Registering services...");
  const serviceManager = ServiceManager.getInstance();

}

// ============================================
// 6. USAGE EXAMPLES (Same as before)
// ============================================


// ============================================
// 7. MAIN EXECUTION
// ============================================
async function main() {
  try {
    console.log("╔═══════════════════════════════════════════════════════╗");
    console.log("║     @dqcai/orm SQLite Blog Application Demo          ║");
    console.log("║     (Fixed Adapter Sharing Version)                   ║");
    console.log("╚═══════════════════════════════════════════════════════╝\n");

    // Initialize
    await initializeDatabase();

    console.log("✅ All examples completed successfully!\n");
  } catch (error) {
    console.error("\n❌ Error:", error);
    throw error;
  } finally {
    // Cleanup
    console.log("🧹 Cleaning up...");
    await ServiceManager.getInstance().destroy();
    await DatabaseManager.closeAll();
    console.log("✓ Cleanup complete\n");
  }
}

// Run the application
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
