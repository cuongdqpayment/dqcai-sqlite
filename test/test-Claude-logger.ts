// ./test/test-Claude-logger.ts

// ========== BƯỚC 4: SAU ĐÓ mới import SQLite library ==========
import {
  DatabaseFactory,
  ServiceManager,
  BaseService,
  DatabaseManager,
  NodeJSAdapter,
} from "../src/index";

import { core as coreSchema } from "./schemas.sqlite";

// ========== BƯỚC 1: Import logger utilities ==========
import { createModuleLogger, APPModules, CommonLoggerConfig } from "./logger";
console.log("Initial config:", CommonLoggerConfig.getCurrentConfig());
// ========== BƯỚC 3: Tạo logger instance cho test ==========
const logger = createModuleLogger(APPModules.TEST_ORM);

// ========== BƯỚC 5: Verify config ==========
console.log("After SQLite import:", CommonLoggerConfig.getCurrentConfig());

logger.trace("🔍 Test file started with trace level");

// ========== Define Services ==========
class UserService extends BaseService {
  constructor() {
    super("core", "users");
  }

  async findByStoreId(storeId: string) {
    return await this.findAll({ store_id: storeId });
  }
}

class StoreService extends BaseService {
  constructor() {
    super("core", "stores");
  }

  async findByEnterpriseId(enterpriseId: string) {
    return await this.findAll({ enterprise_id: enterpriseId });
  }

  async getActiveStores(enterpriseId: string) {
    return await this.findAll(
      { enterprise_id: enterpriseId, status: "active" },
      { orderBy: [{ name: "name", direction: "ASC" }] }
    );
  }
}

// ========== Register Services ==========
logger.debug("\n🔌 1.Registering services...");
const serviceManager = ServiceManager.getInstance();

serviceManager.registerServices([
  {
    schemaName: "core",
    tableName: "enterprises",
  },
  {
    schemaName: "core",
    tableName: "stores",
    serviceClass: StoreService,
  },
  {
    schemaName: "core",
    tableName: "users",
    serviceClass: UserService,
  },
]);

// ========== Main Function ==========
async function main() {
  try {
    logger.debug("🔌 2.Registering Adapters...");
    DatabaseFactory.registerAdapter(new NodeJSAdapter());

    logger.debug("📋 3.Registering Schemas...");
    DatabaseManager.registerSchema("core", coreSchema);

    logger.debug("🔧 4.Initializing database...\n");

    // Verify config one more time
    console.log("Final config check:", CommonLoggerConfig.getCurrentConfig());

    // Initialize core database
    await DatabaseManager.initializeCoreConnection();

    // Get services
    const enterpriseService = await serviceManager.getService(
      "core",
      "enterprises"
    );
    const storeService = (await serviceManager.getService(
      "core",
      "stores"
    )) as StoreService;
    const userService = (await serviceManager.getService(
      "core",
      "users"
    )) as UserService;

    // ========== TEST CRUD Operations ==========
    logger.info("🧪 Starting CRUD operations...");

    // 1. Create Enterprise
    const enterprise = await enterpriseService.upsert(
      {
        id: crypto.randomUUID(),
        name: "My Company",
        business_type: "ltd",
        email: "contact@mycompany.com",
        status: "active",
        subscription_plan: "premium",
      },
      ["email"]
    );
    console.log("✅ Enterprise created:", enterprise?.name);

    // 2. Create Store
    const store = await storeService.upsert({
      id: crypto.randomUUID(),
      enterprise_id: enterprise!.id,
      name: "Main Store",
      store_type: "retail",
      address: "123 Main St",
      status: "active",
    });
    console.log("✅ Store created:", store?.name);

    // 3. Create Users
    const users = [
      {
        id: crypto.randomUUID(),
        store_id: store!.id,
        username: "admin",
        password_hash: "hashed_password",
        full_name: "Admin User",
        email: "admin@mycompany.com",
        role: "admin",
        is_active: true,
      },
      {
        id: crypto.randomUUID(),
        store_id: store!.id,
        username: "staff1",
        password_hash: "hashed_password",
        full_name: "Staff One",
        email: "staff1@mycompany.com",
        role: "staff",
        is_active: true,
      },
    ];

    const importResult = await userService.bulkUpsert(users, ["email"]);
    console.log(`✅ Users imported: ${importResult.total} successful`);

    // 4. Query data
    const allUsers = await userService.findByStoreId(store!.id);
    console.log(`✅ Users in store: ${allUsers.length}`);

    const activeStores = await storeService.getActiveStores(enterprise!.id);
    console.log(`✅ Active stores: ${activeStores.length}`);

    // 5. Update
    await userService.update(users[0].id, {
      last_login: new Date().toISOString(),
    });
    console.log("✅ User login updated");

    // 6. Transaction example
    await serviceManager.executeSchemaTransaction("core", async (services) => {
      const [entSvc, storeSvc, userSvc] = services;

      const newStore = await storeSvc.upsert({
        id: crypto.randomUUID(),
        enterprise_id: enterprise!.id,
        name: "Branch Store",
        status: "active",
      });

      // ✅ KIỂM TRA newStore trước khi dùng
      if (!newStore || !newStore.id) {
        throw new Error("Failed to create store");
      }

      await userSvc.upsert(
        {
          id: crypto.randomUUID(),
          store_id: newStore.id,
          username: "branch_manager",
          password_hash: "hashed_password",
          full_name: "Branch Manager",
          email: "manager@branch.com",
          role: "manager",
          is_active: true,
        },
        ["email"]
      );
    });
    console.log("✅ Transaction completed");

    // 7. Health check
    const health = await serviceManager.healthCheck();
    console.log("✅ System health:", health.overallHealth);
    console.log(
      `   Healthy services: ${health.healthyServices}/${health.totalServices}`
    );

    // 8. Statistics
    const enterpriseCount = await enterpriseService.count();
    const storeCount = await storeService.count();
    const userCount = await userService.count();

    console.log("\n📊 Statistics:");
    console.log(`   Enterprises: ${enterpriseCount}`);
    console.log(`   Stores: ${storeCount}`);
    console.log(`   Users: ${userCount}`);
  } catch (error) {
    logger.error("❌ Test failed:", error);
    console.error("❌ Error:", error);
  } finally {
    await DatabaseManager.closeAll();
    logger.info("✅ Database connections closed");
  }
}

// Run test
// Run the application
main()
  .then(() => {
    console.log("✅ All examples completed successfully!\n");
    process.exit(1);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
