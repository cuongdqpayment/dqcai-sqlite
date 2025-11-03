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

  // serviceManager.registerService({
  //   schemaName: "core",
  //   entityName: "users",
  //   serviceClass: UserService,
  //   autoInit: true,
  // });

  // serviceManager.registerService({
  //   schemaName: "core",
  //   entityName: "posts",
  //   serviceClass: PostService,
  //   autoInit: true,
  // });

  // serviceManager.registerService({
  //   schemaName: "core",
  //   entityName: "comments",
  //   serviceClass: CommentService,
  //   autoInit: true,
  // });

  // serviceManager.registerService({
  //   schemaName: "core",
  //   entityName: "tags",
  //   serviceClass: TagService,
  //   autoInit: true,
  // });

  // serviceManager.registerService({
  //   schemaName: "core",
  //   entityName: "post_tags",
  //   serviceClass: PostTagService,
  //   autoInit: true,
  // });

  // console.log("✓ All services registered\n");

  // // 8. Test that services use the same adapter
  // console.log("🔍 Verifying adapter sharing...");
  // const userService = await serviceManager.getService<UserService>(
  //   "core",
  //   "users"
  // );

  // // Try to create a test user to verify database access
  // try {
  //   await userService.create({
  //     username: "test_init",
  //     email: "test@init.com",
  //     password_hash: "test_hash",
  //     full_name: "Test Init User",
  //   });
  //   console.log("✓ Services can access the same database\n");
  // } catch (error) {
  //   console.log("ℹ Test user creation:", (error as Error).message, "\n");
  // }
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

    // Run examples
    // await example1_BasicCRUD();
    // await example2_AdvancedQueries();
    // await example3_Relationships();
    // await example4_Tags();
    // await example5_Comments();
    // await example6_Statistics();

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
