# @dqcai/sqlite - A Universal SQLite Library (@dqcai/sqlite v2.0.0)

![Universal SQLite](https://img.shields.io/badge/SQLite-Universal-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)
![Cross Platform](https://img.shields.io/badge/Platform-Universal-green)

UniversalSQLite là một thư viện SQLite toàn diện, hỗ trợ đa nền tảng, được thiết kế để hoạt động mượt mà trên các môi trường như Browser, Node.js, Deno, Bun và React Native. Thư viện cung cấp giao diện thống nhất để quản lý cơ sở dữ liệu SQLite, bao gồm tạo schema, CRUD, query nâng cao, migration, import/export dữ liệu, và quản lý transaction. Nó sử dụng mô hình DAO (Data Access Object) để tách biệt logic truy cập dữ liệu, hỗ trợ role-based access control, và tích hợp dễ dàng với các framework.

## Features

- **Cross-Platform Support**: Hoạt động trên Browser, Node.js, Deno, Bun, React Native (iOS/Android/Windows).
- **Schema-Based Management**: Tạo và quản lý database từ JSON schema.
- **DAO Pattern**: UniversalDAO để thực hiện CRUD, query, transaction.
- **Query Builder**: Xây dựng query phức tạp với join, where, group by, having, union, CTE.
- **Migration System**: Quản lý migration với up/down scripts.
- **Data Import/Export**: Hỗ trợ import từ CSV/JSON với mapping, validation, và export to CSV.
- **Role-Based Access**: Quản lý kết nối dựa trên role người dùng.
- **Transaction Management**: Hỗ trợ transaction đơn và cross-schema.
- **Adapters**: Tự động detect môi trường, hỗ trợ register adapter tùy chỉnh.
- **Type-Safe**: Đầy đủ types TypeScript cho schema, query, và operations.
- **Utilities**: CSVImporter, MigrationManager, BaseService cho service layer.

## Installation

Cài đặt qua npm hoặc yarn:

```bash
npm install @dqcai/sqlite@2.0.0
# hoặc
yarn add @dqcai/sqlite@2.0.0
```

Đối với React Native, đảm bảo cài đặt các dependencies cần thiết cho adapter (nếu sử dụng adapter cụ thể như react-native-sqlite-storage).

## Quick Start

### Bước 1: Định nghĩa Schema
Schema là một object JSON mô tả cấu trúc database.

```typescript
import { DatabaseSchema } from '@dqcai/sqlite';

const exampleSchema: DatabaseSchema = {
  version: '1.0.0',
  database_name: 'example_db',
  description: 'Example database',
  schemas: {
    users: {
      description: 'Users table',
      cols: [
        { name: 'id', type: 'integer', primary_key: true, auto_increment: true },
        { name: 'name', type: 'string', nullable: false },
        { name: 'email', type: 'string', unique: true },
      ],
      indexes: [{ name: 'idx_email', columns: ['email'], unique: true }],
      foreign_keys: [],
    },
  },
};
```

```json
// schema.json ví dụ kiểu json
{
  "version": "1.0.0",
  "database_name": "example.db",
  "description": "Schema for example application.",
  "schemas": {
    "users": {
      "description": "User accounts table.",
      "cols": [
        {
          "name": "id",
          "type": "integer",
          "constraints": "PRIMARY KEY AUTOINCREMENT"
        },
        {
          "name": "name",
          "type": "text",
          "constraints": "NOT NULL"
        },
        {
          "name": "email",
          "type": "text",
          "constraints": "UNIQUE NOT NULL"
        },
        {
          "name": "created_at",
          "type": "timestamp",
          "constraints": "DEFAULT CURRENT_TIMESTAMP"
        }
      ]
    },
    "posts": {
      "description": "Posts created by users.",
      "cols": [
        {
          "name": "id",
          "type": "integer",
          "constraints": "PRIMARY KEY AUTOINCREMENT"
        },
        {
          "name": "title",
          "type": "text",
          "constraints": "NOT NULL"
        },
        {
          "name": "content",
          "type": "text"
        },
        {
          "name": "user_id",
          "type": "integer",
          "constraints": "NOT NULL"
        }
      ],
      "foreign_keys": [
        {
          "name": "fk_posts_user_id",
          "column": "user_id",
          "references": {
            "table": "users",
            "column": "id"
          },
          "on_delete": "CASCADE"
        }
      ]
    }
  }
}
```

### Bước 2: Khởi tạo và Sử dụng
Sử dụng singleton UniversalSQLite.

```typescript
import UniversalSQLite from '@dqcai/sqlite';

const sqlite = UniversalSQLite.getInstance();

async function init() {
  await sqlite.initializeFromSchema(exampleSchema);
  const dao = await sqlite.connect('example_db');

  // CRUD example
  await dao.insert({ name: 'users', cols: [{ name: 'name', value: 'John' }, { name: 'email', value: 'john@example.com' }] });
  const users = await dao.selectAll({ name: 'users' });
  console.log(users);
}

init();
```

## Adapters and Environment Setup

UniversalSQLite tự động detect môi trường và chọn adapter phù hợp. Tuy nhiên, bạn có thể register adapter tùy chỉnh nếu cần.

### Common Adapters
- **Browser**: Sử dụng sql.js (cần import sql.js library).
- **Node.js**: Sử dụng better-sqlite3 hoặc sqlite3 (cần cài đặt package tương ứng).
- **React Native**: Sử dụng react-native-sqlite-storage (cần cài đặt package).
- **Deno/Bun**: Sử dụng native SQLite support.

### Register Adapter
Khai báo adapter tùy chỉnh bằng cách extend BaseAdapter và register với DatabaseFactory.

```typescript
import { BaseAdapter, SQLiteAdapter } from '@dqcai/sqlite';
import DatabaseFactory from '@dqcai/sqlite';

class CustomNodeAdapter extends BaseAdapter implements SQLiteAdapter {
  // Implement connect and isSupported
  async connect(path: string) { /* ... */ }
  isSupported() { return true; }
}

DatabaseFactory.registerAdapter(new CustomNodeAdapter());
```

## Usage Guide

### 1. Khởi tạo Database
Sử dụng DatabaseFactory để tạo hoặc mở database.

- **Tạo từ Schema**:
  ```typescript
  const dao = await DatabaseFactory.createFromConfig(exampleSchema);
  ```

- **Mở Existing Database**:
  ```typescript
  const dao = await DatabaseFactory.openExisting('example_db.db');
  ```

- **Create DAO Directly**:
  ```typescript
  const dao = DatabaseFactory.createDAO('example_db.db', { createIfNotExists: true });
  await dao.connect();
  ```

### 2. CRUD Operations với UniversalDAO
UniversalDAO cung cấp các method CRUD cơ bản.

```typescript
// Insert
await dao.insert({ name: 'users', cols: [{ name: 'name', value: 'Alice' }] });

// Update
await dao.update({ name: 'users', cols: [{ name: 'name', value: 'Bob' }], wheres: [{ name: 'id', value: 1 }] });

// Delete
await dao.delete({ name: 'users', wheres: [{ name: 'id', value: 1 }] });

// Select
const row = await dao.select({ name: 'users', wheres: [{ name: 'id', value: 1 }] });
const allRows = await dao.selectAll({ name: 'users' });
```

### 3. Query Builder
Xây dựng query phức tạp.

```typescript
import { QueryBuilder } from '@dqcai/sqlite';

const qb = new QueryBuilder(dao).table('users')
  .select('id', 'name')
  .where('age', '>', 18)
  .orderBy('name', 'ASC')
  .limit(10);

const results = await qb.get();
```

### 4. Migration
Sử dụng MigrationManager.

```typescript
const migrationManager = new MigrationManager(dao);
migrationManager.addMigration({
  version: '1.1.0',
  description: 'Add column',
  up: async (dao) => { await dao.execute('ALTER TABLE users ADD COLUMN age INTEGER'); },
  down: async (dao) => { /* rollback */ },
});
await migrationManager.migrate();
```

### 5. Import/Export Data
Sử dụng CSVImporter hoặc importData.

```typescript
const importer = new CSVImporter(dao);
await importer.importFromCSV('users', csvString, { hasHeader: true });

// Hoặc import JSON
await dao.importData({ tableName: 'users', data: [{ name: 'John' }] });
```

### 6. Transaction
```typescript
await dao.beginTransaction();
try {
  // operations
  await dao.commitTransaction();
} catch {
  await dao.rollbackTransaction();
}
```

### 7. BaseService
Tạo service layer.

```typescript
class UserService extends BaseService<{ id: number; name: string }> {
  constructor() {
    super('example_db', 'users');
  }
}

const userService = new UserService();
await userService.create({ name: 'John' });
```

### 8. Role-Based Management
Sử dụng DatabaseManager để quản lý role.

```typescript
DatabaseManager.registerRole({ roleName: 'admin', requiredDatabases: ['example_db'] });
await DatabaseManager.setCurrentUserRoles(['admin']);
const dao = DatabaseManager.get('example_db');
```

## Examples

### Example for React Native

1. Cài đặt dependencies:
   ```bash
   npm install react-native-sqlite-storage
   ```

2. Khai báo Adapter (nếu cần tùy chỉnh, nhưng thư viện tự detect):
   ```typescript
    import { enablePromise, openDatabase} from 'react-native-sqlite-storage';
    import { BaseAdapter } from '@dqcai/sqlite';
    enablePromise(true);
    class ReactNativeAdapter extends BaseAdapter {
        isSupported() {
            return typeof Platform !== 'undefined' && Platform.OS !== 'web';
        }

        connect(path) {
            return new Promise((resolve, reject) => {
            const db = openDatabase(
                { name: path, location: 'default' },
                () => {
                resolve({
                    execute: (sql, params) => {
                    return new Promise((execResolve, execReject) => {
                        db.transaction(tx => {
                        tx.executeSql(
                            sql,
                            params,
                            (tx, results) => {
                            const rowsAffected = results.rowsAffected;
                            let rows = [];
                            for (let i = 0; i < results.rows.length; i++) {
                                rows.push(results.rows.item(i));
                            }
                            execResolve({ rows, rowsAffected, lastInsertRowId: results.insertId });
                            },
                            (tx, error) => {
                            execReject(error);
                            }
                        );
                        });
                    });
                    },
                    close: () => {
                    return new Promise((closeResolve, closeReject) => {
                        db.close((err) => {
                        if (err) return closeReject(err);
                        closeResolve();
                        });
                    });
                    }
                });
                },
                (error) => reject(error)
            );
            });
        }
    }
    export default ReactNativeAdapter;
    
   ```

3. Tạo và Mở Database, CRUD:
   ```typescript
    import { DatabaseFactory } from '@dqcai/sqlite';
    import ReactNativeAdapter from './adapters/react-native-adapter'; // Hoặc NodejsAdapter
    import schema from './schema.json';

    async function setupDatabase() {
    // Đăng ký adapter để thư viện biết cách kết nối
    DatabaseFactory.registerAdapter(new ReactNativeAdapter()); // Đăng ký adapter cho môi trường

    // Tạo hoặc mở database. Nếu file chưa tồn tại, nó sẽ được tạo mới và init schema.
    // Nếu đã tồn tại, nó sẽ được mở.
    const dao = await DatabaseFactory.createOrOpen({ config: schema });

    console.log(`Kết nối thành công tới database: ${dao.getDatabaseInfo().name}`);
    return dao;
    }

    async function crudOperations(dao) {
        // 1. CREATE (Insert)
        console.log('Inserting a new user...');
        const userToInsert = {
            name: 'John Doe',
            email: 'john.doe@example.com',
        };
        const insertResult = await dao.insert({
            name: 'users',
            cols: Object.entries(userToInsert).map(([name, value]) => ({ name, value })),
        });
        const newUserId = insertResult.lastInsertRowId;
        console.log(`User inserted with ID: ${newUserId}`);

        // 2. READ (Select)
        console.log('Selecting user by email...');
        const selectedUser = await dao.select({
            name: 'users',
            cols: [], // Chọn tất cả các cột
            wheres: [{ name: 'email', value: 'john.doe@example.com' }],
        });
        console.log('Selected user:', selectedUser);

        // 3. UPDATE
        console.log('Updating user name...');
        await dao.update({
            name: 'users',
            cols: [{ name: 'name', value: 'John Smith' }],
            wheres: [{ name: 'id', value: newUserId }],
        });
        const updatedUser = await dao.select({
            name: 'users',
            cols: ['id', 'name'],
            wheres: [{ name: 'id', value: newUserId }],
        });
        console.log('Updated user:', updatedUser);

        // 4. DELETE
        console.log('Deleting the user...');
        const deleteResult = await dao.delete({
            name: 'users',
            wheres: [{ name: 'id', value: newUserId }],
        });
        console.log(`Rows deleted: ${deleteResult.rowsAffected}`);

        const checkUser = await dao.select({
            name: 'users',
            wheres: [{ name: 'id', value: newUserId }],
        });
        console.log('User exists after delete?', Object.keys(checkUser).length > 0);
        }

    // Chạy ví dụ
    async function main() {
    try {
        const dao = await setupDatabase();
        await crudOperations(dao);
        await dao.close();
        console.log('Đã đóng kết nối database.');
    } catch (error) {
        console.error('Đã xảy ra lỗi:', error);
    }
    }

    main();
   ```

### Example for Node.js

1. Cài đặt dependencies:
   ```bash
   npm install better-sqlite3
   ```

2. Khai báo Adapter (tự detect, nhưng có thể tùy chỉnh):
   ```typescript
   class NodeAdapter extends BaseAdapter {
     async connect(path: string) {
       const SQLite3 = require('better-sqlite3');
       const db = new SQLite3(path);
       return {
         execute: (sql: string, params = []) => {
           const stmt = db.prepare(sql);
           const result = stmt.run(params);
           return { rows: stmt.all(params), rowsAffected: result.changes };
         },
         close: () => db.close(),
       };
     }
     isSupported() { return true; }
   }

   DatabaseFactory.registerAdapter(new NodeAdapter());
   ```

3. Tạo và Mở Database, CRUD:
   ```typescript
   import UniversalSQLite from '@dqcai/sqlite';

   const sqlite = UniversalSQLite.getInstance();

   async function nodeExample() {
     await sqlite.initializeFromSchema(exampleSchema);
     const dao = await sqlite.connect('example_db');

     // CRUD
     await dao.insert({ name: 'users', cols: [{ name: 'name', value: 'NodeUser' }, { name: 'email', value: 'node@example.com' }] });
     const users = await dao.selectAll({ name: 'users' });
     console.log('Users:', users);

     // Query Builder
     const qb = sqlite.query('users');
     const results = await qb.select('*').where('name', 'LIKE', '%User%').get();

     // Migration
     const migrationManager = sqlite.createMigrationManager();
     migrationManager.addMigration({
       version: '1.0.1',
       description: 'Add age',
       up: async (dao) => await dao.execute('ALTER TABLE users ADD COLUMN age INTEGER'),
       down: async (dao) => await dao.execute('ALTER TABLE users DROP COLUMN age'),
     });
     await migrationManager.migrate();

     // Import from File
     const importer = sqlite.createCSVImporter();
     await importer.importFromFile('users', './data.csv', { hasHeader: true });

     await sqlite.closeAll();
   }

   nodeExample();
   ```

## API Reference

- **UniversalSQLite**: Singleton chính, methods: initialize, connect, getDAO, query, execute, importData, etc.
- **UniversalDAO**: Core DAO cho CRUD, execute, importData.
- **QueryBuilder**: Xây dựng query với fluent API.
- **MigrationManager**: Quản lý migration.
- **CSVImporter**: Import/export CSV.
- **BaseService**: Base cho service layer.
- **DatabaseFactory**: Factory để tạo DAO.
- **DatabaseManager**: Quản lý connections, roles.

Xem source code để biết chi tiết types và methods.


## Best Practices

1. **Always use transactions for multi-step operations**
2. **Define schemas for type safety and validation**
3. **Use parameterized queries to prevent SQL injection**
4. **Implement proper error handling**
5. **Close connections when done**
6. **Use migrations for schema changes**
7. **Batch large operations for better performance**

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request


## 📄 License

MIT © [Cuong Doan](https://github.com/cuongdqpayment)

## 🙏 Acknowledgments

- [sqlite3](https://www.npmjs.com/package/sqlite3) - Node.js SQLite bindings
- [sql.js](https://github.com/sql-js/sql.js) - SQLite compiled to WebAssembly
- [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) - Expo SQLite support
- [react-native-sqlite-storage](https://github.com/andpor/react-native-sqlite-storage) - React Native SQLite
- [Deno SQLite](https://deno.land/x/sqlite) - Deno SQLite module

## 🔗 Links

- [Documentation](https://github.com/cuongdqpayment/dqcai-sqlite/docs)
- [Examples Repository](https://github.com/cuongdqpayment/dqcai-sqlite)
- [Issue Tracker](https://github.com/cuongdqpayment/dqcai-sqlite/issues)
- [Issue Facebook](https://www.facebook.com/share/p/19esHGbaGj/)
- [NPM Package](https://www.npmjs.com/package/@dqcai/sqlite)

---

🔥 **@dqcai/sqlite** — One library, all platforms! 🚀
