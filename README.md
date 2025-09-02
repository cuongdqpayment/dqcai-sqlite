# @dqcai/sqlite - Universal SQLite DAO Library

![Universal SQLite](https://img.shields.io/badge/SQLite-Universal-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)
![Cross Platform](https://img.shields.io/badge/Platform-Universal-green)

A universal SQLite Data Access Object (DAO) library that works across multiple JavaScript environments including Node.js, React Native, Browser, Deno, and Bun. This library provides a unified interface for SQLite operations with type-safe schema management, migrations, and advanced query capabilities.

## Features

- **Universal Compatibility**: Works in Node.js, React Native, Browser, Deno, and Bun
- **Type-Safe Schema Management**: Define and validate database schemas with TypeScript
- **Advanced Query Builder**: Fluent interface for building complex SQL queries
- **Migration System**: Version-controlled database schema changes
- **CSV Import/Export**: Bulk data operations with validation
- **Transaction Support**: ACID-compliant transaction management
- **Connection Pooling**: Efficient database connection management
- **Service Layer**: High-level abstraction for common CRUD operations

## Installation

```bash
# npm
npm install @dqcai/sqlite

# yarn
yarn add @dqcai/sqlite

# pnpm
pnpm add @dqcai/sqlite
```

### Environment-Specific Dependencies

**Node.js:**
```bash
npm install sqlite3
# or
npm install better-sqlite3
```

**React Native:**
```bash
npm install react-native-sqlite-2
# or
npm install @react-native-async-storage/async-storage
```

## Quick Start

### Basic Usage

```typescript
import UniversalSQLite, { DatabaseSchema, UniversalDAO } from '@dqcai/sqlite';

// Initialize the universal SQLite instance
const db = new UniversalSQLite();

// Connect to database
await db.connect('path/to/database.db');

// Execute raw SQL
const result = await db.execute('SELECT * FROM users WHERE id = ?', [1]);

// Use the DAO directly
const dao = db.getDAO();
const users = await dao.getRsts('SELECT * FROM users');

// Disconnect
await db.disconnect();
```

### Schema-Driven Development

```typescript
import { DatabaseSchema } from '@dqcai/sqlite';

// Define your database schema
const schema: DatabaseSchema = {
  version: "1.0.0",
  database_name: "myapp_db",
  description: "Main application database",
  type_mapping: {
    sqlite: {
      string: 'TEXT',
      integer: 'INTEGER',
      boolean: 'INTEGER',
      timestamp: 'TEXT',
      json: 'TEXT'
    }
  },
  schemas: {
    users: {
      description: "User accounts table",
      cols: [
        {
          name: 'id',
          type: 'integer',
          primary_key: true,
          auto_increment: true,
          description: 'Primary key'
        },
        {
          name: 'username',
          type: 'string',
          nullable: false,
          unique: true,
          description: 'Unique username'
        },
        {
          name: 'email',
          type: 'string',
          nullable: false,
          unique: true
        },
        {
          name: 'created_at',
          type: 'timestamp',
          default: 'CURRENT_TIMESTAMP'
        },
        {
          name: 'profile_data',
          type: 'json',
          nullable: true
        }
      ],
      indexes: [
        {
          name: 'idx_username',
          columns: ['username'],
          unique: true
        },
        {
          name: 'idx_email',
          columns: ['email']
        }
      ]
    },
    posts: {
      description: "User posts table",
      cols: [
        {
          name: 'id',
          type: 'integer',
          primary_key: true,
          auto_increment: true
        },
        {
          name: 'user_id',
          type: 'integer',
          nullable: false
        },
        {
          name: 'title',
          type: 'string',
          nullable: false
        },
        {
          name: 'content',
          type: 'string',
          nullable: true
        },
        {
          name: 'created_at',
          type: 'timestamp',
          default: 'CURRENT_TIMESTAMP'
        }
      ],
      foreign_keys: [
        {
          name: 'fk_posts_user',
          column: 'user_id',
          references: {
            table: 'users',
            column: 'id'
          },
          on_delete: 'CASCADE',
          on_update: 'CASCADE'
        }
      ]
    }
  }
};

// Initialize database with schema
const db = new UniversalSQLite();
await db.connect('myapp.db');
await db.initializeSchema(schema);
```

## Environment-Specific Setup

### Node.js Setup

```typescript
import UniversalSQLite, { DatabaseFactory } from '@dqcai/sqlite';
import { NodeSQLiteAdapter } from '@dqcai/sqlite/adapters/node';

// Register the Node.js adapter
DatabaseFactory.registerAdapter(new NodeSQLiteAdapter());

const db = new UniversalSQLite();
await db.connect('./data/app.db');

// Your application logic here
const userService = db.createService('users');
const newUser = await userService.create({
  username: 'johndoe',
  email: 'john@example.com',
  profile_data: { firstName: 'John', lastName: 'Doe' }
});
```

### React Native Setup

```typescript
import UniversalSQLite, { DatabaseFactory } from '@dqcai/sqlite';
import { ReactNativeSQLiteAdapter } from '@dqcai/sqlite/adapters/react-native';

// Register the React Native adapter
DatabaseFactory.registerAdapter(new ReactNativeSQLiteAdapter());

const db = new UniversalSQLite();

// In React Native, database path is relative to Documents directory
await db.connect('app.db');

// React Native component example
const UserList = () => {
  const [users, setUsers] = useState([]);
  
  useEffect(() => {
    const loadUsers = async () => {
      const userService = db.createService('users');
      const userList = await userService.findAll();
      setUsers(userList);
    };
    
    loadUsers();
  }, []);
  
  return (
    <FlatList
      data={users}
      keyExtractor={item => item.id.toString()}
      renderItem={({ item }) => (
        <Text>{item.username} - {item.email}</Text>
      )}
    />
  );
};
```

## Core Components

### UniversalDAO

The core data access object providing low-level database operations.

```typescript
import { UniversalDAO, QueryTable } from '@dqcai/sqlite';

const dao = db.getDAO();

// Insert data
const insertTable: QueryTable = {
  name: 'users',
  cols: [
    { name: 'username', value: 'alice' },
    { name: 'email', value: 'alice@example.com' }
  ]
};
const result = await dao.insert(insertTable);

// Update data
const updateTable: QueryTable = {
  name: 'users',
  cols: [
    { name: 'email', value: 'alice.new@example.com' }
  ],
  wheres: [
    { name: 'id', value: 1 }
  ]
};
await dao.update(updateTable);

// Select data
const selectTable: QueryTable = {
  name: 'users',
  cols: [
    { name: 'id' },
    { name: 'username' },
    { name: 'email' }
  ],
  wheres: [
    { name: 'username', value: 'alice', operator: '=' }
  ],
  orderbys: [
    { name: 'created_at', direction: 'DESC' }
  ],
  limitOffset: {
    limit: 10,
    offset: 0
  }
};
const users = await dao.selectAll(selectTable);
```

### BaseService

High-level service abstraction for common CRUD operations.

```typescript
// Create a custom service class
class UserService extends BaseService<User> {
  constructor(dao: UniversalDAO) {
    super(dao, 'users');
  }
  
  async findByUsername(username: string): Promise<User | null> {
    const users = await this.findAll({
      where: [{ name: 'username', value: username }]
    });
    return users[0] || null;
  }
  
  async findActiveUsers(): Promise<User[]> {
    return await this.findAll({
      where: [{ name: 'status', value: 'active' }],
      orderBy: [{ name: 'created_at', direction: 'DESC' }]
    });
  }
}

// Usage
const userService = new UserService(db.getDAO());

// Create user
const newUser = await userService.create({
  username: 'bob',
  email: 'bob@example.com'
});

// Find user by ID
const user = await userService.findById(1);

// Update user
const updatedUser = await userService.update(1, {
  email: 'bob.updated@example.com'
});

// Delete user
const deleted = await userService.delete(1);

// Find all users with pagination
const users = await userService.findAll({
  limit: 10,
  offset: 20,
  orderBy: [{ name: 'created_at', direction: 'DESC' }]
});
```

### QueryBuilder

Fluent interface for building complex SQL queries.

```typescript
import { QueryBuilder } from '@dqcai/sqlite';

const dao = db.getDAO();

// Complex query example
const query = QueryBuilder
  .table('users')
  .select(['users.id', 'users.username', 'profiles.display_name'])
  .leftJoin('profiles', 'profiles.user_id = users.id')
  .where('users.status = ?', 'active')
  .whereNotNull('profiles.display_name')
  .orderBy('users.created_at', 'DESC')
  .limit(20);

const { sql, params } = query.toSQL();
const result = await dao.execute(sql, params);

// Insert with QueryBuilder
const insertQuery = QueryBuilder.insert('users', {
  username: 'charlie',
  email: 'charlie@example.com',
  status: 'active'
});

await dao.execute(insertQuery.sql, insertQuery.params);

// Update with QueryBuilder
const updateQuery = QueryBuilder.update(
  'users',
  { email: 'charlie.new@example.com' },
  'id = ?',
  [1]
);

await dao.execute(updateQuery.sql, updateQuery.params);

// Upsert (Insert or Update)
const upsertQuery = QueryBuilder.upsert('users', {
  username: 'dave',
  email: 'dave@example.com'
}, ['username']);

await dao.execute(upsertQuery.sql, upsertQuery.params);
```

## Advanced Features

### Migration System

```typescript
import { MigrationManager, Migration } from '@dqcai/sqlite';

const migrationManager = db.createMigrationManager();

// Define migrations
const migration1: Migration = {
  version: '1.0.0',
  description: 'Create initial tables',
  up: async (dao) => {
    await dao.execute(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
  },
  down: async (dao) => {
    await dao.execute('DROP TABLE users');
  }
};

const migration2: Migration = {
  version: '1.1.0',
  description: 'Add user profiles',
  up: async (dao) => {
    await dao.execute(`
      CREATE TABLE profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        display_name TEXT,
        bio TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
  },
  down: async (dao) => {
    await dao.execute('DROP TABLE profiles');
  }
};

// Add migrations
migrationManager.addMigration(migration1);
migrationManager.addMigration(migration2);

// Run migrations
await migrationManager.migrate();

// Check migration status
const status = await migrationManager.status();
console.log(status);

// Rollback to specific version
await migrationManager.rollback('1.0.0');
```

### CSV Import/Export

```typescript
import { CSVImporter } from '@dqcai/sqlite';

const csvImporter = db.createCSVImporter();

// Import CSV data
const csvData = `
username,email,age
alice,alice@example.com,25
bob,bob@example.com,30
charlie,charlie@example.com,35
`;

const importResult = await csvImporter.importFromCSV('users', csvData, {
  hasHeader: true,
  delimiter: ',',
  batchSize: 1000,
  skipErrors: true,
  validateData: true,
  columnMappings: {
    'username': 'username',
    'email': 'email',
    'age': 'age'
  },
  transform: {
    'age': (value) => parseInt(value)
  },
  onProgress: (processed, total) => {
    console.log(`Progress: ${processed}/${total}`);
  },
  onError: (error, rowIndex, rowData) => {
    console.error(`Error at row ${rowIndex}:`, error.message);
  }
});

console.log('Import Result:', importResult);

// Bulk import using DAO
const bulkData = [
  { username: 'user1', email: 'user1@example.com' },
  { username: 'user2', email: 'user2@example.com' },
  { username: 'user3', email: 'user3@example.com' }
];

const dao = db.getDAO();
const bulkResult = await dao.importData({
  tableName: 'users',
  data: bulkData,
  batchSize: 500,
  skipErrors: false,
  validateData: true,
  updateOnConflict: true,
  conflictColumns: ['username']
});
```

### Transaction Management

```typescript
const dao = db.getDAO();

try {
  // Begin transaction
  await dao.beginTransaction();
  
  // Perform multiple operations
  const user = await dao.insert({
    name: 'users',
    cols: [
      { name: 'username', value: 'transactional_user' },
      { name: 'email', value: 'trans@example.com' }
    ]
  });
  
  await dao.insert({
    name: 'profiles',
    cols: [
      { name: 'user_id', value: user.lastInsertRowId },
      { name: 'display_name', value: 'Transactional User' }
    ]
  });
  
  // Commit transaction
  await dao.commitTransaction();
  
  console.log('Transaction completed successfully');
} catch (error) {
  // Rollback transaction on error
  await dao.rollbackTransaction();
  console.error('Transaction failed:', error);
}
```

### Database Connection Management

```typescript
import { DatabaseManager } from '@dqcai/sqlite';

const manager = new DatabaseManager();

// Get connections for multiple databases
const mainDb = await manager.getConnection('main.db');
const cacheDb = await manager.getConnection('cache.db');
const logDb = await manager.getConnection('logs.db');

// Use different databases
await mainDb.execute('INSERT INTO users ...');
await cacheDb.execute('INSERT INTO cache_entries ...');
await logDb.execute('INSERT INTO logs ...');

// List all connections
const connections = manager.listConnections();
console.log('Active connections:', connections);

// Close specific connection
await manager.closeConnection('cache.db');

// Close all connections
await manager.closeAllConnections();
```

## API Reference

### Core Classes

#### UniversalSQLite
Main entry point for the library.

- `connect(dbPath: string, options?)`: Connect to database
- `disconnect()`: Close all connections
- `getDAO()`: Get UniversalDAO instance
- `createService<T>(tableName: string)`: Create BaseService instance
- `execute(sql: string, params?)`: Execute raw SQL
- `initializeSchema(schema: DatabaseSchema)`: Initialize database from schema

#### UniversalDAO
Core data access object.

- `insert(table: QueryTable)`: Insert data
- `update(table: QueryTable)`: Update data  
- `delete(table: QueryTable)`: Delete data
- `select(table: QueryTable)`: Select single record
- `selectAll(table: QueryTable)`: Select multiple records
- `execute(sql: string, params?)`: Execute raw SQL
- `beginTransaction()`: Start transaction
- `commitTransaction()`: Commit transaction
- `rollbackTransaction()`: Rollback transaction

#### BaseService<T>
High-level service abstraction.

- `create(data: Partial<T>)`: Create record
- `update(id: any, data: Partial<T>)`: Update record
- `delete(id: any)`: Delete record
- `findById(id: any)`: Find by ID
- `findAll(options?)`: Find all records
- `count(where?)`: Count records
- `exists(id: any)`: Check if record exists
- `bulkInsert(items: Partial<T>[])`: Bulk insert

### Type Definitions

```typescript
interface SQLiteResult {
  rows: SQLiteRow[];
  rowsAffected: number;
  lastInsertRowId?: number;
}

interface QueryTable {
  name: string;
  cols: Column[];
  wheres?: WhereClause[];
  orderbys?: OrderByClause[];
  limitOffset?: LimitOffset;
}

interface DatabaseSchema {
  version: string;
  database_name: string;
  description?: string;
  type_mapping?: TypeMappingConfig['type_mapping'];
  schemas: Record<string, TableSchema>;
}
```

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