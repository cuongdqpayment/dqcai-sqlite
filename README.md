# @dqcai/sqlite - Universal SQLite Library for Modern JavaScript

![Universal SQLite](https://img.shields.io/badge/SQLite-Universal-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)
![Cross Platform](https://img.shields.io/badge/Platform-Universal-green)
![NPM Version](https://img.shields.io/npm/v/@dqcai/sqlite)
![NPM Downloads](https://img.shields.io/npm/dm/@dqcai/sqlite)

**One library, all platforms!** The most comprehensive SQLite solution for **Browser**, **Node.js**, **Deno**, **Bun**, and **React Native** applications.

## 🚀 Why Choose @dqcai/sqlite?

- **🌐 Universal**: Works everywhere - Browser, Node.js, Deno, Bun, React Native
- **🛡️ Type-Safe**: Full TypeScript support with complete type definitions
- **⚡ High Performance**: Built-in optimization, connection pooling, and batch operations
- **🗃️ Enterprise-Ready**: Service lifecycle management with ServiceManager
- **📊 Schema Management**: JSON-based schema definitions with migrations
- **🔄 Transaction Support**: Single and cross-schema transaction management
- **📈 Monitoring**: Real-time health monitoring and auto-recovery
- **🎯 DAO Pattern**: Clean separation of data access logic
- **📝 Advanced Logging**: Integrated logger with @dqcai/logger for comprehensive debugging

## 📦 Installation

```bash
npm install @dqcai/sqlite @dqcai/logger
# or
yarn add @dqcai/sqlite @dqcai/logger
# or
pnpm add @dqcai/sqlite @dqcai/logger
```

### Cài đặt dependencies theo môi trường

**React Native:**

```bash
npm install react-native-sqlite-storage
```

**Node.js:**

```bash
npm install better-sqlite3
```

## 2. Lựa chọn Adapter theo môi trường

### React Native Adapter

```typescript
import { ReactNativeAdapter, DatabaseFactory } from "@dqcai/sqlite";

// Đăng ký adapter
DatabaseFactory.registerAdapter(new ReactNativeAdapter());
```

### Node.js Adapter

```typescript
import { NodeJSAdapter, DatabaseFactory } from "@dqcai/sqlite";

// Đăng ký adapter
DatabaseFactory.registerAdapter(new NodeJSAdapter());
```

### Adapter tự động phát hiện

```typescript
import { DatabaseFactory } from "@dqcai/sqlite";
import { ReactNativeAdapter } from "@dqcai/sqlite";
import { NodeJSAdapter } from "@dqcai/sqlite";

// Đăng ký cả hai adapter - thư viện sẽ tự chọn adapter phù hợp
DatabaseFactory.registerAdapter(new ReactNativeAdapter());
DatabaseFactory.registerAdapter(new NodeJSAdapter());

// Kiểm tra môi trường hiện tại
console.log("Environment:", DatabaseFactory.getEnvironmentInfo());
```

## 3. Quản lý Database với DatabaseManager

### Khai báo Schema

```typescript
import { DatabaseSchema, SQLITE_TYPE_MAPPING } from "@dqcai/sqlite";

const coreSchema: DatabaseSchema = {
  version: "v1",
  database_name: "core.db",
  description: "Core database schema",
  type_mapping: SQLITE_TYPE_MAPPING,
  schemas: {
    users: {
      description: "User management table",
      cols: [
        {
          name: "id",
          type: "uuid",
          constraints: "NOT NULL UNIQUE PRIMARY KEY",
        },
        {
          name: "username",
          type: "varchar",
          length: 50,
          constraints: "NOT NULL UNIQUE",
        },
        {
          name: "email",
          type: "email",
          constraints: "UNIQUE",
        },
        {
          name: "created_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP",
        },
      ],
      indexes: [
        {
          name: "idx_users_username",
          columns: ["username"],
          unique: true,
        },
      ],
    },
  },
};
```

### Đăng ký Schema và khởi tạo Database

```typescript
import { DatabaseManager } from "@dqcai/sqlite";

// Đăng ký schema
DatabaseManager.registerSchema("core", coreSchema);

// Khởi tạo kết nối core database
await DatabaseManager.initializeCoreConnection();

// Lazy loading cho database khác
const dao = await DatabaseManager.getLazyLoading("core");
```

### Quản lý kết nối theo Role

```typescript
// Đăng ký role configuration
DatabaseManager.registerRole({
  roleName: "admin",
  requiredDatabases: ["core", "inventory"],
  optionalDatabases: ["reports"],
  priority: 1,
});

// Set user roles - tự động khởi tạo databases cần thiết
await DatabaseManager.setCurrentUserRoles(["admin"]);

// Lấy database đã được khởi tạo
const coreDao = DatabaseManager.get("core");
```

## 4. Định nghĩa Service từ BaseService

### Service đơn giản (sử dụng DefaultService)

```typescript
import { BaseService } from "@dqcai/sqlite";

// Sử dụng BaseService trực tiếp cho CRUD cơ bản
const userService = new BaseService("core", "users");
await userService.init();
```

### Service mở rộng với logic nghiệp vụ

```typescript
import { BaseService } from "@dqcai/sqlite";

export class UserService extends BaseService<User> {
  constructor() {
    super("core", "users");
    this.setPrimaryKeyFields(["id"]);
  }

  // Business logic method
  async findByStoreId(storeId: string): Promise<User[]> {
    await this._ensureInitialized();
    return await this.findAll({ store_id: storeId });
  }

  async findActiveUsers(): Promise<User[]> {
    await this._ensureInitialized();
    return await this.findAll({ is_active: true });
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this._ensureInitialized();
    await this.update(userId, {
      last_login: new Date().toISOString(),
    });
  }

  async lockUser(userId: string, duration: number): Promise<void> {
    await this._ensureInitialized();
    const lockedUntil = new Date(Date.now() + duration);
    await this.update(userId, {
      is_active: false,
      locked_until: lockedUntil.toISOString(),
    });
  }
}
```

### Service với validation và events

```typescript
export class StoreService extends BaseService<Store> {
  constructor() {
    super("core", "stores");
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // Lắng nghe events
    this.on("dataCreated", (event) => {
      console.log("Store created:", event.data);
    });

    this.on("dataUpdated", (event) => {
      console.log("Store updated:", event.id);
    });

    // Custom error handler
    this.setErrorHandler("CREATE_ERROR", (error) => {
      console.error("Failed to create store:", error.message);
    });
  }

  // Override create để thêm validation
  async create(data: Partial<Store>): Promise<Store | null> {
    // Validate
    if (!data.enterprise_id) {
      throw new Error("Enterprise ID is required");
    }
    if (!data.name?.trim()) {
      throw new Error("Store name is required");
    }

    // Set defaults
    data.currency = data.currency || "VND";
    data.timezone = data.timezone || "Asia/Ho_Chi_Minh";
    data.status = data.status || "active";

    return await super.create(data);
  }

  async findByEnterpriseId(enterpriseId: string): Promise<Store[]> {
    return await this.findAll({ enterprise_id: enterpriseId });
  }

  async getActiveStores(enterpriseId: string): Promise<Store[]> {
    return await this.findAll(
      { enterprise_id: enterpriseId, status: "active" },
      { orderBy: [{ name: "name", direction: "ASC" }] }
    );
  }
}
```

## 5. Quản lý Service với ServiceManager

### Đăng ký Services

```typescript
import { ServiceManager } from "@dqcai/sqlite";
import { UserService } from "./services/UserService";
import { StoreService } from "./services/StoreService";

const serviceManager = ServiceManager.getInstance();

// Đăng ký service với custom class
serviceManager.registerService({
  schemaName: "core",
  tableName: "users",
  primaryKeyFields: ["id"],
  serviceClass: UserService,
});

serviceManager.registerService({
  schemaName: "core",
  tableName: "stores",
  serviceClass: StoreService,
});

// Đăng ký nhiều services cùng lúc
serviceManager.registerServices([
  {
    schemaName: "core",
    tableName: "enterprises",
    primaryKeyFields: ["id"],
  },
  {
    schemaName: "core",
    tableName: "settings",
    primaryKeyFields: ["id"],
  },
]);
```

### Lấy và sử dụng Service

```typescript
// Lấy service - tự động khởi tạo nếu chưa tồn tại
const userService = (await serviceManager.getService(
  "core",
  "users"
)) as UserService;

// Khởi tạo service ngay lập tức
const storeService = await serviceManager.initializeService("core", "stores");

// Lấy service đã tồn tại (không tự động tạo)
const existingService = serviceManager.getExistingService("core", "users");
```

### Quản lý lifecycle

```typescript
// Kiểm tra sức khỏe tất cả services
const healthReport = await serviceManager.healthCheck();
console.log("Overall health:", healthReport.overallHealth);
console.log("Healthy services:", healthReport.healthyServices);

// Lấy thông tin services
const allServices = serviceManager.getAllServiceInfo();
console.log("Total services:", allServices.length);

// Destroy service
await serviceManager.destroyService("core", "users");

// Destroy tất cả services trong một schema
await serviceManager.destroyServicesBySchema("core");
```

## 6. Thực thi CRUD và Logic nghiệp vụ

### CRUD cơ bản

```typescript
// Create
const newUser = await userService.create({
  id: crypto.randomUUID(),
  username: "john_doe",
  email: "john@example.com",
  full_name: "John Doe",
  store_id: storeId,
  role: "staff",
});

// Read
const user = await userService.findById(userId);
const allUsers = await userService.findAll();
const activeUsers = await userService.findAll({ is_active: true });

// Update
await userService.update(userId, {
  email: "newemail@example.com",
  updated_at: new Date().toISOString(),
});

// Delete
await userService.delete(userId);

// Count
const userCount = await userService.count({ is_active: true });

// Exists
const exists = await userService.exists(userId);
```

### Query nâng cao

```typescript
// Tìm kiếm với options
const users = await userService.findAll(
  { role: "staff", is_active: true },
  {
    orderBy: [{ name: "created_at", direction: "DESC" }],
    limit: 10,
    offset: 0,
    columns: ["id", "username", "email", "full_name"],
  }
);

// Pagination
const page = 1;
const perPage = 20;
const offset = (page - 1) * perPage;

const paginatedUsers = await userService.findAll(
  {},
  { limit: perPage, offset }
);
```

### Bulk operations

```typescript
// Bulk insert
const users = [
  {
    id: uuid(),
    username: "user1",
    email: "user1@example.com",
    store_id: storeId,
  },
  {
    id: uuid(),
    username: "user2",
    email: "user2@example.com",
    store_id: storeId,
  },
];

const importResult = await userService.bulkInsert(users);
console.log(`Imported ${importResult.successRows} users`);

// Bulk create with transaction
const createdUsers = await userService.bulkCreate(users);
```

### Transaction

```typescript
// Single service transaction
await userService.executeTransaction(async () => {
  await userService.create(user1);
  await userService.create(user2);
  await userService.update(userId, { status: "active" });
});

// Cross-service transaction (same schema)
await serviceManager.executeSchemaTransaction("core", async (services) => {
  const [userSvc, storeSvc] = services;

  const store = await storeSvc.create(storeData);
  await userSvc.create({
    ...userData,
    store_id: store.id,
  });
});
```

### Import/Export

```typescript
// Import from CSV
const csvData = `username,email,role
john,john@example.com,staff
jane,jane@example.com,manager`;

const result = await userService.importFromCSV(csvData, {
  hasHeader: true,
  delimiter: ",",
  skipErrors: false,
});

// Import with column mapping
const columnMappings = [
  { sourceColumn: "user_name", targetColumn: "username" },
  { sourceColumn: "mail", targetColumn: "email" },
  {
    sourceColumn: "created",
    targetColumn: "created_at",
    transform: (value) => new Date(value).toISOString(),
  },
];

await userService.importDataWithMapping(data, columnMappings);
```

## 7. Ví dụ hoàn chỉnh với Core Schema

```typescript
import {
  DatabaseFactory,
  DatabaseManager,
  ServiceManager,
  BaseService,
} from "@dqcai/sqlite";
import { NodeJSAdapter } from "@dqcai/sqlite";
import { coreSchema } from "./schemas/core";

// ========== BƯỚC 1: Setup Adapters ==========
DatabaseFactory.registerAdapter(new NodeJSAdapter());

// ========== BƯỚC 2: Đăng ký Schemas ==========
DatabaseManager.registerSchema("core", coreSchema);

// ========== BƯỚC 3: Định nghĩa Services ==========
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

// ========== BƯỚC 4: Đăng ký Services ==========
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

// ========== BƯỚC 5: Khởi tạo và sử dụng ==========
async function main() {
  try {
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
```

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

✅ Database connections closed
```

## Tổng kết

Thư viện @dqcai/sqlite cung cấp:

- ✅ **Cross-platform**: Hỗ trợ React Native và Node.js
- ✅ **Type-safe**: TypeScript support đầy đủ
- ✅ **Schema-driven**: Quản lý database qua JSON schema
- ✅ **Service-based**: Architecture rõ ràng, dễ mở rộng
- ✅ **Lazy loading**: Tối ưu performance trên mobile
- ✅ **Transaction support**: ACID compliance
- ✅ **Event system**: Lắng nghe và xử lý events
- ✅ **Import/Export**: CSV, JSON, bulk operations
- ✅ **Logging**: Tích hợp @dqcai/logger để trace/debug

## 🤝 Community & Support

- **GitHub**: [https://github.com/cuongdqpayment/dqcai-sqlite](https://github.com/cuongdqpayment/dqcai-sqlite)
- **NPM**: [https://www.npmjs.com/package/@dqcai/sqlite](https://www.npmjs.com/package/@dqcai/sqlite)
- **Logger Package**: [https://www.npmjs.com/package/@dqcai/logger](https://www.npmjs.com/package/@dqcai/logger)
- **Issues**: [GitHub Issues](https://github.com/cuongdqpayment/dqcai-sqlite/issues)
- **Facebook**: [Facebook Page](https://www.facebook.com/share/p/19esHGbaGj/)

## 📄 License

MIT License - see [LICENSE](https://github.com/cuongdqpayment/dqcai-sqlite/blob/main/LICENSE) file for details.

## 🚀 Get Started Now

```bash
npm install @dqcai/sqlite @dqcai/logger
```

Transform your data management with the most powerful universal SQLite library for JavaScript and TypeScript!

---

**@dqcai/sqlite** - One library, all platforms! 🌟
