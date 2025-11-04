import {
  DatabaseFactory,
  DatabaseManager,
  ServiceManager,
  BaseService,
} from "@dqcai/sqlite";
import { NodeJSAdapter } from "@dqcai/sqlite";
import { core as coreSchema } from "./schemas.sqlite";

import { createModuleLogger, APPModules, CommonLoggerConfig } from "./logger";
const logger = createModuleLogger(APPModules.TEST_ORM);

// ========== BƯỚC 1: Định nghĩa Services ==========
class UserService extends BaseService {
  constructor() {
    super("core", "users");
  }

  async findByStoreId(storeId: string) {
    return await this.findAll({ store_id: storeId });
  }

  async authenticate(username: string, password: string) {
    const user = await this.findFirst({ username });
    if (!user) return null;

    // Verify password (simplified)
    if (user.password_hash === password) {
      await this.update(user.id, {
        last_login: new Date().toISOString(),
        failed_login_attempts: 0,
      });
      return user;
    }

    // Increment failed attempts
    await this.update(user.id, {
      failed_login_attempts: (user.failed_login_attempts || 0) + 1,
    });

    return null;
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

// ========== BƯỚC 2: Đăng ký Services ==========
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

// ========== BƯỚC x: Khởi tạo và sử dụng ==========
async function main() {
  try {
    logger.debug("🔌 2.Registering Adapters...");
    // ========== BƯỚC 1: Setup Adapters ==========
    DatabaseFactory.registerAdapter(new NodeJSAdapter());

    // ========== BƯỚC 2: Đăng ký Schemas ==========
    DatabaseManager.registerSchema("core", coreSchema);

    logger.debug("🔧 3.Initializing database...\n");



    console.log("Test now:", CommonLoggerConfig.getCurrentConfig());
    // Khởi tạo core database
    await DatabaseManager.initializeCoreConnection();



    // Lấy services
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

    // 1. Create Enterprise
    const enterprise = await enterpriseService.create({
      id: crypto.randomUUID(),
      name: "My Company",
      business_type: "ltd",
      email: "contact@mycompany.com",
      status: "active",
      subscription_plan: "premium",
    });
    console.log("✅ Enterprise created:", enterprise?.name);

    // 2. Create Store
    const store = await storeService.create({
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

    const importResult = await userService.bulkInsert(users);
    console.log(`✅ Users imported: ${importResult.successRows} successful`);

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

      // Create another store and user in transaction
      const newStore = await storeSvc.create({
        id: crypto.randomUUID(),
        enterprise_id: enterprise!.id,
        name: "Branch Store",
        status: "active",
      });

      await userSvc.create({
        id: crypto.randomUUID(),
        store_id: newStore.id,
        username: "branch_manager",
        password_hash: "hashed_password",
        full_name: "Branch Manager",
        email: "manager@branch.com",
        role: "manager",
        is_active: true,
      });
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
    console.error("❌ Error:", error);
  } finally {
    // Cleanup
    await DatabaseManager.closeAll();
    console.log("\n✅ Database connections closed");
  }
}

// Run test
main().catch(console.error);
/* ```

### Kết quả mong đợi:
```
✅ Enterprise created: My Company
✅ Store created: Main Store
✅ Users imported: 2 successful
✅ Users in store: 2
✅ Active stores: 1
✅ User login updated
✅ Transaction completed
✅ System health: true
   Healthy services: 3/3

📊 Statistics:
   Enterprises: 1
   Stores: 2
   Users: 3

✅ Database connections closed */
