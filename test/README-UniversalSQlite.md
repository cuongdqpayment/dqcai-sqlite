# UniversalSQLite - Thư viện Quản lý SQLite Đa Nền tảng

## Tổng quan

`UniversalSQLite` là một thư viện quản lý cơ sở dữ liệu SQLite toàn diện, được thiết kế để hoạt động trên nhiều nền tảng (Browser, Node.js, Deno, Bun, React Native). Đây là một **Singleton class** cung cấp interface thống nhất để quản lý kết nối, schema, transaction, và các thao tác CRUD với SQLite database.

## Tính năng chính

### 🎯 **Đa nền tảng**
- Hỗ trợ Browser, Node.js, Deno, Bun, React Native
- Tự động phát hiện môi trường và sử dụng adapter phù hợp

### 🔐 **Quản lý Role-Based Access Control (RBAC)**
- Phân quyền người dùng theo vai trò
- Kiểm soát truy cập database dựa trên role
- Hỗ trợ nhiều role và primary role

### 📊 **Schema Management**
- Quản lý nhiều database schemas
- Tự động khởi tạo database từ schema configuration
- Version control cho schema
- Migration system tích hợp

### 🔄 **Transaction Management**
- Transaction đơn database
- Cross-schema transaction (giao dịch xuyên suốt nhiều database)
- Auto rollback khi có lỗi

### 📥 **Import/Export Data**
- Import từ CSV với column mapping
- Import data từ JSON/Object arrays
- Xử lý lỗi chi tiết cho từng row

### 🔧 **Query Builder**
- Fluent API để xây dựng queries
- Type-safe query building
- Hỗ trợ các thao tác SQL phức tạp

### 📡 **Event System**
- Theo dõi các sự kiện: initialized, connected, error, transaction...
- Custom event handlers
- Global error handling

### 🔌 **Connection Pooling**
- Quản lý nhiều kết nối database
- Lazy loading connections
- Health check cho tất cả connections

## Cài đặt

```bash
npm install @dqcai/sqlite
```

## Cách sử dụng

### 1. Khởi tạo cơ bản

```javascript
import { UniversalSQLite } from '@dqcai/sqlite';

// Lấy singleton instance
const sqlite = UniversalSQLite.getInstance();

// Khởi tạo với schemas
await sqlite.initialize({
  mydb: {
    database_name: 'mydb',
    version: '1.0.0',
    tables: [
      {
        table_name: 'users',
        columns: [
          { name: 'id', type: 'INTEGER', primary_key: true },
          { name: 'name', type: 'TEXT', not_null: true },
          { name: 'email', type: 'TEXT', unique: true }
        ]
      }
    ]
  }
});

// Kết nối đến database
const dao = await sqlite.connect('mydb');
```

### 2. Setup nhanh với helper function

```javascript
import { setupUniversalSQLite } from '@dqcai/sqlite';

const sqlite = await setupUniversalSQLite({
  schemas: {
    core: coreSchema,
    users: userSchema,
    products: productSchema
  },
  adapters: [customAdapter], // Optional
  defaultRoles: ['user'], // Optional
  autoConnect: 'core', // Tự động kết nối đến 'core'
  enableDebugLogging: true
});
```

### 3. Tạo single database

```javascript
import { createSingleDatabase } from '@dqcai/sqlite';

const { sqlite, dao } = await createSingleDatabase(mySchema, {
  autoConnect: true,
  enableDebugLogging: true
});
```

### 4. Query cơ bản

```javascript
// Execute SQL trực tiếp
const result = await sqlite.execute(
  'SELECT * FROM users WHERE age > ?',
  [18]
);

// Lấy một row
const user = await sqlite.getRst('SELECT * FROM users WHERE id = ?', [1]);

// Lấy nhiều rows
const users = await sqlite.getRsts('SELECT * FROM users');
```

### 5. Sử dụng Query Builder

```javascript
// Query với fluent API
const users = await sqlite.query('users')
  .select(['id', 'name', 'email'])
  .where('age', '>', 18)
  .orderBy('name', 'ASC')
  .limit(10)
  .execute();

// Insert
await sqlite.table('users')
  .insert({
    name: 'John Doe',
    email: 'john@example.com',
    age: 25
  });

// Update
await sqlite.table('users')
  .where('id', '=', 1)
  .update({ age: 26 });

// Delete
await sqlite.table('users')
  .where('age', '<', 18)
  .delete();
```

### 6. Sử dụng Service Layer

```javascript
// Tạo service cho table
const userService = sqlite.createService('users', 'mydb');

// CRUD operations
const newUser = await userService.create({
  name: 'Jane Doe',
  email: 'jane@example.com'
});

const user = await userService.findById(1);
const allUsers = await userService.findAll();

await userService.update(1, { name: 'Jane Smith' });
await userService.delete(1);

// Tạo nhiều services cùng lúc
const services = sqlite.createServices(['users', 'products', 'orders']);
```

### 7. Transaction Management

```javascript
// Transaction trên connection hiện tại
const result = await sqlite.executeTransactionOnCurrent(async (dao) => {
  await dao.execute('INSERT INTO users (name) VALUES (?)', ['User 1']);
  await dao.execute('INSERT INTO orders (user_id) VALUES (?)', [1]);
  return { success: true };
});

// Cross-schema transaction
await sqlite.executeTransaction(['users_db', 'orders_db'], async (daos) => {
  await daos.users_db.execute('INSERT INTO users ...');
  await daos.orders_db.execute('INSERT INTO orders ...');
});
```

### 8. Import Data

```javascript
// Import từ array
const result = await sqlite.importData(
  'mydb',
  'users',
  [
    { name: 'User 1', email: 'user1@example.com' },
    { name: 'User 2', email: 'user2@example.com' }
  ],
  {
    batchSize: 100,
    onError: 'continue' // hoặc 'stop'
  }
);

console.log(`Imported: ${result.successRows}, Failed: ${result.errorRows}`);

// Import từ CSV
const csvData = `name,email
John Doe,john@example.com
Jane Smith,jane@example.com`;

await sqlite.importFromCSV('mydb', 'users', csvData, {
  delimiter: ',',
  hasHeader: true
});

// Import với column mapping
await sqlite.importDataWithMapping(
  'mydb',
  'users',
  rawData,
  [
    { source: 'full_name', target: 'name' },
    { source: 'email_address', target: 'email' }
  ]
);
```

### 9. Role-Based Access Control

```javascript
// Đăng ký roles
UniversalSQLite.registerRoles([
  {
    roleName: 'admin',
    requiredDatabases: ['core', 'users', 'products'],
    priority: 1
  },
  {
    roleName: 'user',
    requiredDatabases: ['core'],
    optionalDatabases: ['users'],
    priority: 2
  }
]);

// Set user roles
await sqlite.setUserRoles(['user', 'admin'], 'admin');

// Check access
const hasAccess = sqlite.hasAccessToDatabase('products'); // true for admin

// Get current roles
const roles = sqlite.getCurrentUserRoles(); // ['user', 'admin']
const primaryRole = sqlite.getCurrentRole(); // 'admin'

// Logout (đóng role-specific connections)
await sqlite.logout();
```

### 10. Schema Management

```javascript
// Khởi tạo schema mới
await sqlite.initializeSchema(newSchema, false);

// Force recreate schema
await sqlite.initializeSchema(newSchema, true);

// Get schema version
const version = await sqlite.getSchemaVersion('mydb');

// Get database info
const info = await sqlite.getDatabaseInfo('mydb');

// Get table info
const tableInfo = await sqlite.getTableInfo('users', 'mydb');
```

### 11. Event Handling

```javascript
// Lắng nghe events
sqlite.on('initialized', ({ schemas }) => {
  console.log('Initialized schemas:', schemas);
});

sqlite.on('connected', ({ schemaName }) => {
  console.log('Connected to:', schemaName);
});

sqlite.on('error', (error, context) => {
  console.error('Error in', context, ':', error);
});

sqlite.on('dataImported', ({ schemaName, tableName, recordCount }) => {
  console.log(`Imported ${recordCount} records to ${tableName}`);
});

// Remove listener
const handler = (data) => console.log(data);
sqlite.on('connected', handler);
sqlite.off('connected', handler);
```

### 12. Connection Management

```javascript
// Kiểm tra trạng thái
const status = sqlite.getConnectionStatus();
console.log(status);
// {
//   isInitialized: true,
//   currentSchema: 'mydb',
//   activeConnections: ['core', 'users'],
//   connectionCount: 2,
//   userRoles: ['admin'],
//   primaryRole: 'admin'
// }

// List schemas
const schemas = sqlite.getAvailableSchemas();

// Health check
const health = await sqlite.healthCheck();
console.log(health);
// {
//   mydb: { healthy: true },
//   otherdb: { healthy: false, error: 'Connection lost' }
// }

// Đóng connection cụ thể
await sqlite.closeConnection('mydb');

// Đóng tất cả connections
await sqlite.closeAll();
```

### 13. Utility Methods

```javascript
// Get environment info
const env = sqlite.getEnvironment(); // 'browser', 'node', 'deno', etc.

// Get DAO trực tiếp
const dao = sqlite.getDAO('mydb');
const currentDao = sqlite.getCurrentDAO();

// Ensure connection
const dao = await sqlite.ensureDatabaseConnection('mydb');
```

## API Reference

### Core Methods

#### `initialize(schemas, options)`
Khởi tạo UniversalSQLite với các schema configurations.

**Parameters:**
- `schemas`: Record<string, DatabaseSchema> - Các schema configuration
- `options`: Object
  - `registerAdapters?`: SQLiteAdapter[] - Custom adapters
  - `autoConnectCore?`: boolean - Tự động kết nối core database
  - `defaultRoles?`: string[] - Default user roles
  - `globalErrorHandler?`: Function - Global error handler
  - `loggerConfig?`: any - Logger configuration

#### `connect(schemaName)`
Kết nối đến một database schema cụ thể.

**Returns:** Promise<UniversalDAO>

#### `createService<T>(tableName, schemaName?)`
Tạo service layer cho một table.

**Returns:** BaseService<T>

#### `query(tableName?, schemaName?)`
Tạo query builder instance.

**Returns:** QueryBuilder

#### `execute(sql, params?, schemaName?)`
Thực thi raw SQL query.

**Returns:** Promise<SQLiteResult>

### Import/Export Methods

#### `importData(schemaName, tableName, data, options?)`
Import data vào table.

**Returns:** Promise<ImportResult>

#### `importFromCSV(schemaName, tableName, csvData, options?)`
Import data từ CSV string.

**Returns:** Promise<ImportResult>

### Transaction Methods

#### `executeTransaction(schemas, callback)`
Thực thi cross-schema transaction.

#### `executeTransactionOnCurrent<T>(callback)`
Thực thi transaction trên connection hiện tại.

**Returns:** Promise<T>

### Role Management

#### `setUserRoles(roles, primaryRole?)`
Set user roles và khởi tạo role-based connections.

#### `getCurrentUserRoles()`
Lấy danh sách roles hiện tại.

**Returns:** string[]

#### `hasAccessToDatabase(dbKey)`
Kiểm tra quyền truy cập database.

**Returns:** boolean

### Connection Lifecycle

#### `closeConnection(schemaName)`
Đóng connection cụ thể.

#### `closeAll()`
Đóng tất cả connections.

#### `logout()`
Logout user và đóng role-specific connections.

## Events

UniversalSQLite phát ra các events sau:

- `initialized`: Khi initialization hoàn tất
- `connected`: Khi kết nối đến database
- `connectionClosed`: Khi đóng connection
- `allConnectionsClosed`: Khi đóng tất cả connections
- `error`: Khi có lỗi xảy ra
- `queryExecuted`: Khi query được thực thi
- `dataImported`: Khi import data thành công
- `csvImported`: Khi import CSV thành công
- `schemaInitialized`: Khi schema được khởi tạo
- `transactionCompleted`: Khi transaction hoàn tất
- `userRolesSet`: Khi set user roles
- `userLoggedOut`: Khi user logout

## Best Practices

### 1. Singleton Pattern
```javascript
// ✅ Đúng
const sqlite = UniversalSQLite.getInstance();

// ❌ Sai
const sqlite = new UniversalSQLite(); // Sẽ throw error
```

### 2. Initialize một lần
```javascript
// ✅ Đúng - Initialize ở entry point
await sqlite.initialize(schemas);

// Sau đó sử dụng ở mọi nơi
const dao = sqlite.getDAO('mydb');
```

### 3. Xử lý errors
```javascript
// ✅ Đúng - Luôn handle errors
try {
  await sqlite.execute(sql, params);
} catch (error) {
  console.error('Database error:', error);
  // Handle error appropriately
}

// Hoặc dùng global error handler
sqlite.on('error', (error, context) => {
  logError(error, context);
});
```

### 4. Sử dụng transactions cho multiple operations
```javascript
// ✅ Đúng - Dùng transaction
await sqlite.executeTransactionOnCurrent(async (dao) => {
  await dao.execute('INSERT INTO users ...');
  await dao.execute('INSERT INTO profiles ...');
});
```

### 5. Đóng connections khi không dùng
```javascript
// ✅ Đúng - Cleanup
await sqlite.closeAll();

// Hoặc trong cleanup handler
window.addEventListener('beforeunload', async () => {
  await sqlite.closeAll();
});
```

## Testing

```javascript
import { UniversalSQLite } from '@dqcai/sqlite';

describe('UniversalSQLite', () => {
  beforeEach(() => {
    // Reset instance trước mỗi test
    UniversalSQLite.resetInstance();
  });

  afterEach(async () => {
    // Cleanup sau mỗi test
    const sqlite = UniversalSQLite.getInstance();
    await sqlite.closeAll();
  });

  it('should initialize successfully', async () => {
    const sqlite = UniversalSQLite.getInstance();
    await sqlite.initialize({ test: testSchema });
    expect(sqlite.getConnectionStatus().isInitialized).toBe(true);
  });
});
```

## Advanced Usage

### Custom Adapter

```javascript
import { SQLiteAdapter } from '@dqcai/sqlite';

class MyCustomAdapter implements SQLiteAdapter {
  name = 'my-adapter';
  version = '1.0.0';
  
  async execute(sql, params) {
    // Custom implementation
  }
  
  // Implement other required methods...
}

// Register adapter
UniversalSQLite.registerAdapter(new MyCustomAdapter());
```

### Schema với Relationships

```javascript
const schema = {
  database_name: 'myapp',
  version: '1.0.0',
  tables: [
    {
      table_name: 'users',
      columns: [
        { name: 'id', type: 'INTEGER', primary_key: true },
        { name: 'name', type: 'TEXT', not_null: true }
      ]
    },
    {
      table_name: 'posts',
      columns: [
        { name: 'id', type: 'INTEGER', primary_key: true },
        { name: 'user_id', type: 'INTEGER', not_null: true },
        { name: 'content', type: 'TEXT' }
      ],
      foreign_keys: [
        {
          columns: ['user_id'],
          references: { table: 'users', columns: ['id'] },
          on_delete: 'CASCADE'
        }
      ]
    }
  ]
};
```

## Troubleshooting

### Connection Issues
```javascript
// Check health
const health = await sqlite.healthCheck();
console.log(health);

// Reconnect if needed
if (!health.mydb.healthy) {
  await sqlite.closeConnection('mydb');
  await sqlite.connect('mydb');
}
```

### Performance Optimization
```javascript
// Sử dụng batch insert cho large datasets
await sqlite.importData('mydb', 'users', largeDataArray, {
  batchSize: 500 // Adjust batch size
});

// Index cho queries thường xuyên
await sqlite.execute(
  'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)'
);
```

## License

[License information]

## Contributing

[Contribution guidelines]

## Support

- Documentation: [Link to docs]
- Issues: [Link to issues]
- Discord/Slack: [Community links]