## Các bổ sung và sửa đổi chính:

### 1. **Hệ thống quản lý Schema động**
- Thêm `SchemaManager` interface để hỗ trợ schema từ bên ngoài
- Thêm các phương thức để đăng ký và quản lý schema động:
  ```typescript
  registerSchema(key: string, schema: DatabaseSchema)
  registerSchemas(schemas: Record<string, DatabaseSchema>)
  setSchemaManager(manager: SchemaManager)
  ```

### 2. **Hệ thống Role-based Access Control**
- Giữ nguyên toàn bộ logic phân quyền từ file gốc
- `RoleConfig`, `RoleRegistry` để quản lý vai trò người dùng
- Các phương thức `setCurrentUserRoles()`, `hasAccessToDatabase()` cho kiểm soát truy cập

### 3. **Event System**
- Hệ thống `onDatabaseReconnect()` để thông báo khi database kết nối lại
- Quan trọng cho việc đồng bộ với các service khác

### 4. **Connection Management**
- Lazy loading với `getLazyLoading()`
- Connection pooling với giới hạn `maxConnections`
- Cleanup tự động cho unused connections
- `activeDatabases` Set để theo dõi database đang sử dụng

### 5. **Data Import/Export Features**
- Giữ nguyên tất cả tính năng import: `importDataToTable()`, `bulkImport()`, `importFromCSV()`
- Column mapping support
- Validation và error handling

### 6. **Transaction Management**
- Cross-schema transactions với `executeCrossSchemaTransaction()`
- Rollback tự động khi có lỗi

## Hướng dẫn sử dụng Schema động:

### Cách 1: Đăng ký schema trực tiếp
```typescript
// Schema được tạo động trong runtime
const myDynamicSchema: DatabaseSchema = {
  version: "1.0.0",
  database_name: "my_dynamic_db",
  schemas: {
    users: {
      cols: [
        { name: "id", type: "integer", constraints: "PRIMARY KEY AUTOINCREMENT" },
        { name: "name", type: "string", constraints: "NOT NULL" },
        { name: "email", type: "string", constraints: "UNIQUE" }
      ]
    }
  }
};

// Đăng ký schema
DatabaseManager.registerSchema("my_dynamic_db", myDynamicSchema);

// Sử dụng
const dao = await DatabaseManager.getLazyLoading("my_dynamic_db");
```

### Cách 2: Sử dụng Schema Manager
```typescript
// Tạo Schema Manager tùy chỉnh
class MySchemaManager implements SchemaManager {
  private schemas = new Map<string, DatabaseSchema>();
  
  getSchema(key: string): DatabaseSchema | undefined {
    return this.schemas.get(key);
  }
  
  registerSchema(key: string, schema: DatabaseSchema): void {
    this.schemas.set(key, schema);
  }
  
  getAllSchemaKeys(): string[] {
    return Array.from(this.schemas.keys());
  }
  
  hasSchema(key: string): boolean {
    return this.schemas.has(key);
  }
}

// Thiết lập Schema Manager
const schemaManager = new MySchemaManager();
DatabaseManager.setSchemaManager(schemaManager);

// Thêm schema động qua manager
schemaManager.registerSchema("runtime_db", myDynamicSchema);

// Sử dụng
const dao = await DatabaseManager.getLazyLoading("runtime_db");
```

### Cách 3: Load schema từ JSON file hoặc API
```typescript
// Load từ JSON file
async function loadSchemaFromJSON(jsonPath: string) {
  try {
    // Trong môi trường Node.js
    const fs = require('fs').promises;
    const schemaData = await fs.readFile(jsonPath, 'utf8');
    const schema: DatabaseSchema = JSON.parse(schemaData);
    
    // Đăng ký schema
    DatabaseManager.registerSchema(schema.database_name, schema);
    
    return schema;
  } catch (error) {
    throw new Error(`Failed to load schema from ${jsonPath}: ${error}`);
  }
}

// Load từ API
async function loadSchemaFromAPI(apiUrl: string) {
  try {
    const response = await fetch(apiUrl);
    const schema: DatabaseSchema = await response.json();
    
    DatabaseManager.registerSchema(schema.database_name, schema);
    
    return schema;
  } catch (error) {
    throw new Error(`Failed to load schema from API: ${error}`);
  }
}

// Sử dụng
const schema = await loadSchemaFromJSON('./my-schema.json');
const dao = await DatabaseManager.getLazyLoading(schema.database_name);
```

### Cách 4: Tạo schema programmatically
```typescript
// Helper function để tạo schema động
function createDynamicSchema(
  dbName: string, 
  tables: Record<string, any[]>
): DatabaseSchema {
  const schemas: Record<string, any> = {};
  
  Object.entries(tables).forEach(([tableName, fields]) => {
    schemas[tableName] = {
      cols: fields.map(field => ({
        name: field.name,
        type: field.type,
        constraints: field.constraints || ""
      }))
    };
  });

  return {
    version: "1.0.0",
    database_name: dbName,
    schemas
  };
}

// Ví dụ sử dụng
const userTables = {
  customers: [
    { name: "id", type: "integer", constraints: "PRIMARY KEY AUTOINCREMENT" },
    { name: "name", type: "string", constraints: "NOT NULL" },
    { name: "phone", type: "string" }
  ],
  orders: [
    { name: "id", type: "integer", constraints: "PRIMARY KEY AUTOINCREMENT" },
    { name: "customer_id", type: "integer", constraints: "NOT NULL" },
    { name: "total", type: "decimal" }
  ]
};

const dynamicSchema = createDynamicSchema("customer_db", userTables);
DatabaseManager.registerSchema("customer_db", dynamicSchema);
```

## Ví dụ workflow hoàn chỉnh:

```typescript
// 1. Khởi tạo DatabaseManager
import { DatabaseManager } from './database-manager';
import { DatabaseFactory } from './database-factory';

// 2. Đăng ký adapter cho môi trường cụ thể
// (ví dụ: NodeSQLiteAdapter, BrowserSQLiteAdapter, etc.)
DatabaseFactory.registerAdapter(myAdapter);

// 3. Tạo và đăng ký schema động
const mySchema: DatabaseSchema = {
  version: "1.0.0",
  database_name: "runtime_created_db",
  schemas: {
    products: {
      cols: [
        { name: "id", type: "integer", constraints: "PRIMARY KEY AUTOINCREMENT" },
        { name: "name", type: "string", constraints: "NOT NULL" },
        { name: "price", type: "decimal", constraints: "DEFAULT 0" },
        { name: "created_at", type: "timestamp", constraints: "DEFAULT CURRENT_TIMESTAMP" }
      ],
      indexes: [
        { name: "idx_product_name", columns: ["name"], unique: false }
      ]
    }
  }
};

// 4. Đăng ký schema
DatabaseManager.registerSchema("runtime_created_db", mySchema);

// 5. Thiết lập roles (nếu cần)
DatabaseManager.registerRole({
  roleName: "admin",
  requiredDatabases: ["core", "runtime_created_db"],
  optionalDatabases: ["analytics"]
});

// 6. Thiết lập user roles
await DatabaseManager.setCurrentUserRoles(["admin"]);

// 7. Sử dụng database
const dao = await DatabaseManager.getLazyLoading("runtime_created_db");

// 8. Thực hiện operations
await dao.insert({
  name: "products",
  cols: [
    { name: "name", value: "iPhone 15" },
    { name: "price", value: 999.99 }
  ]
});

const products = await dao.selectAll({
  name: "products",
  cols: []
});
```

## Các cải tiến chính so với version gốc:

1. **Loại bỏ dependencies môi trường cụ thể**: Không còn phụ thuộc vào React Native, RNFS
2. **Schema management linh hoạt**: Hỗ trợ schema từ nhiều nguồn khác nhau
3. **Improved error handling**: Xử lý lỗi nhất quán và chi tiết hơn
4. **Universal compatibility**: Có thể hoạt động trên Node.js, Browser, Deno, Bun
5. **Simplified logging**: Loại bỏ logger dependency, để lại interface sạch sẽ hơn
6. **Enhanced type safety**: Better TypeScript support với generic types

Version này duy trì tất cả tính năng nghiệp vụ quan trọng từ file gốc nhưng được thiết kế để hoạt động universally across different environments.