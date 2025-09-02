# @dqcai/sqlite - Universal SQLite Library

![Universal SQLite](https://img.shields.io/badge/SQLite-Universal-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)
![Cross Platform](https://img.shields.io/badge/Platform-Universal-green)

Một thư viện SQLite đa nền tảng hỗ trợ **tất cả** các môi trường JavaScript/TypeScript phổ biến với API thống nhất.

## 🌟 Tính năng nổi bật

- ✅ **Universal**: Hoạt động trên Node.js, Browser, Deno, Bun, React Native
- ✅ **TypeScript**: Hỗ trợ đầy đủ TypeScript với type safety
- ✅ **Auto-detection**: Tự động phát hiện môi trường và chọn adapter phù hợp
- ✅ **Query Builder**: Công cụ xây dựng truy vấn mạnh mẽ
- ✅ **React Native Windows**: Hỗ trợ đặc biệt cho React Native Windows
- ✅ **Zero Configuration**: Không cần cấu hình phức tạp

## 🚀 Cài đặt

```bash
npm install @dqcai/sqlite
```

### Cài đặt dependencies theo môi trường

#### Node.js
```bash
npm install sqlite3
```

#### Browser
Không cần cài đặt thêm - sử dụng sql.js từ CDN

#### Deno
Không cần cài đặt - sử dụng Deno SQLite module

#### Bun
Sử dụng built-in SQLite của Bun

#### React Native
```bash
# Standard React Native
npm install react-native-sqlite-storage
# hoặc
npm install expo-sqlite

# React Native Windows
npm install react-native-sqlite-2
# hoặc
npm install react-native-windows-sqlite
```

## 📖 Sử dụng cơ bản

### Import thư viện

```typescript
import UniversalSQLite, { SQLiteManager, QueryBuilder } from '@dqcai/sqlite';
```

### Kết nối và sử dụng đơn giản

```typescript
const db = new UniversalSQLite();

async function basicExample() {
  try {
    // Kết nối đến database
    await db.connect('myapp.db');
    
    // Tạo bảng
    await db.createTable('users', {
      id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
      name: 'TEXT NOT NULL',
      email: 'TEXT UNIQUE',
      created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP'
    });
    
    // Thêm dữ liệu
    await db.insert('users', {
      name: 'John Doe',
      email: 'john@example.com'
    });
    
    // Truy vấn dữ liệu
    const users = await db.select('users');
    console.log('All users:', users.rows);
    
    // Tìm kiếm có điều kiện
    const john = await db.select('users', 'name = ?', ['John Doe']);
    console.log('John:', john.rows[0]);
    
    // Cập nhật
    await db.update('users', 
      { email: 'john.doe@example.com' }, 
      'name = ?', 
      ['John Doe']
    );
    
    // Xóa
    await db.delete('users', 'id = ?', [1]);
    
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await db.close();
  }
}

basicExample();
```

## 🔧 API Chi tiết

### UniversalSQLite Class

#### Khởi tạo
```typescript
const db = new UniversalSQLite();
```

#### Phương thức chính

##### `connect(path: string): Promise<void>`
```typescript
// In-memory database
await db.connect(':memory:');

// File database
await db.connect('database.db');

// Browser (file hoặc in-memory)
await db.connect('myapp.db');
```

##### `query(sql: string, params?: any[]): Promise<SQLiteResult>`
```typescript
// Truy vấn đơn giản
const result = await db.query('SELECT * FROM users');

// Truy vấn với parameters
const result = await db.query('SELECT * FROM users WHERE age > ?', [18]);

console.log(result.rows);        // Dữ liệu trả về
console.log(result.rowsAffected); // Số dòng bị ảnh hưởng
console.log(result.lastInsertRowId); // ID của dòng mới insert
```

##### `createTable(name: string, schema: Record<string, string>): Promise<void>`
```typescript
await db.createTable('products', {
  id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
  name: 'TEXT NOT NULL',
  price: 'REAL',
  category_id: 'INTEGER',
  'FOREIGN KEY (category_id)': 'REFERENCES categories(id)'
});
```

##### `insert(table: string, data: Record<string, any>): Promise<SQLiteResult>`
```typescript
const result = await db.insert('users', {
  name: 'Alice',
  email: 'alice@example.com',
  age: 25
});

console.log('New user ID:', result.lastInsertRowId);
```

##### `select(table: string, where?: string, params?: any[]): Promise<SQLiteResult>`
```typescript
// Lấy tất cả
const allUsers = await db.select('users');

// Có điều kiện
const adults = await db.select('users', 'age >= ?', [18]);

// Điều kiện phức tạp
const result = await db.select('users', 'age BETWEEN ? AND ? AND name LIKE ?', [18, 65, 'A%']);
```

##### `update(table: string, data: Record<string, any>, where: string, whereParams?: any[]): Promise<SQLiteResult>`
```typescript
const result = await db.update('users', 
  { email: 'newemail@example.com', age: 26 },
  'id = ?',
  [1]
);

console.log('Updated rows:', result.rowsAffected);
```

##### `delete(table: string, where: string, params?: any[]): Promise<SQLiteResult>`
```typescript
const result = await db.delete('users', 'age < ?', [18]);
console.log('Deleted rows:', result.rowsAffected);
```

### QueryBuilder - Xây dựng truy vấn nâng cao

```typescript
import { QueryBuilder } from '@dqcai/sqlite';

// SELECT với QueryBuilder
const selectSQL = QueryBuilder
  .table('users')
  .select(['id', 'name', 'email'])
  .where('age > 18')
  .where('status = "active"')
  .orderBy('name', 'ASC')
  .limit(10)
  .offset(0)
  .toSQL();

console.log(selectSQL);
// Output: SELECT id, name, email FROM users WHERE age > 18 AND status = "active" ORDER BY name ASC LIMIT 10 OFFSET 0

const result = await db.query(selectSQL);

// INSERT với QueryBuilder
const insertSQL = QueryBuilder.insert('users', {
  name: 'Bob',
  email: 'bob@example.com',
  age: 30
});

await db.query(insertSQL, ['Bob', 'bob@example.com', 30]);

// UPDATE với QueryBuilder
const updateSQL = QueryBuilder.update('users', 
  { email: 'bob.updated@example.com' }, 
  'id = 1'
);

await db.query(updateSQL, ['bob.updated@example.com']);

// DELETE với QueryBuilder
const deleteSQL = QueryBuilder.delete('users', 'age < 18');
await db.query(deleteSQL);
```

### SQLiteManager - Quản lý kết nối thủ công

```typescript
import { SQLiteManager } from '@dqcai/sqlite';

const manager = new SQLiteManager();

// Kiểm tra môi trường
console.log('Environment:', manager.getEnvironmentInfo());

// Kết nối thủ công
const connection = await manager.connect('database.db');

// Thực thi truy vấn
const result = await connection.execute('SELECT * FROM users');

// Đóng kết nối
await connection.close();
```

## 🌍 Ví dụ theo môi trường

### Node.js Application

```typescript
// server.js
import UniversalSQLite from '@dqcai/sqlite';

const db = new UniversalSQLite();

async function setupUserSystem() {
  await db.connect('./users.db');
  
  // Tạo bảng users
  await db.createTable('users', {
    id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
    username: 'TEXT UNIQUE NOT NULL',
    password_hash: 'TEXT NOT NULL',
    email: 'TEXT UNIQUE',
    created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
    last_login: 'DATETIME'
  });
  
  // Tạo index cho performance
  await db.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
  
  console.log('User system ready!');
}

async function createUser(username: string, email: string, passwordHash: string) {
  return await db.insert('users', {
    username,
    email,
    password_hash: passwordHash
  });
}

async function getUserByEmail(email: string) {
  const result = await db.select('users', 'email = ?', [email]);
  return result.rows[0] || null;
}

setupUserSystem();
```

### Browser Application

```html
<!DOCTYPE html>
<html>
<head>
    <title>Universal SQLite Browser Demo</title>
</head>
<body>
    <div id="app"></div>
    
    <script type="module">
        import UniversalSQLite from './dist/index.js';
        
        const db = new UniversalSQLite();
        
        async function browserDemo() {
            try {
                // Kết nối in-memory database
                await db.connect(':memory:');
                
                // Tạo bảng todos
                await db.createTable('todos', {
                    id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
                    title: 'TEXT NOT NULL',
                    completed: 'BOOLEAN DEFAULT 0',
                    created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP'
                });
                
                // Thêm một số todos
                await db.insert('todos', { title: 'Learn SQLite', completed: 0 });
                await db.insert('todos', { title: 'Build awesome app', completed: 0 });
                
                // Hiển thị todos
                const todos = await db.select('todos');
                document.getElementById('app').innerHTML = `
                    <h1>My Todos</h1>
                    <ul>
                        ${todos.rows.map(todo => 
                            `<li>${todo.title} - ${todo.completed ? '✅' : '⏳'}</li>`
                        ).join('')}
                    </ul>
                `;
                
            } catch (error) {
                console.error('Error:', error);
            }
        }
        
        browserDemo();
    </script>
</body>
</html>
```

### React Native Application

```typescript
// App.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Button, FlatList } from 'react-native';
import UniversalSQLite from '@dqcai/sqlite';

const db = new UniversalSQLite();

interface User {
  id: number;
  name: string;
  email: string;
}

export default function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [environment, setEnvironment] = useState<string>('');

  useEffect(() => {
    initDatabase();
  }, []);

  const initDatabase = async () => {
    try {
      // Kết nối database
      await db.connect('myapp.db');
      
      // Hiển thị môi trường
      setEnvironment(db.getEnvironment());
      
      // Tạo bảng
      await db.createTable('users', {
        id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
        name: 'TEXT NOT NULL',
        email: 'TEXT UNIQUE'
      });
      
      // Load dữ liệu
      loadUsers();
      
    } catch (error) {
      console.error('Database init error:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const result = await db.select('users');
      setUsers(result.rows);
    } catch (error) {
      console.error('Load users error:', error);
    }
  };

  const addUser = async () => {
    try {
      await db.insert('users', {
        name: `User ${Date.now()}`,
        email: `user${Date.now()}@example.com`
      });
      loadUsers();
    } catch (error) {
      console.error('Add user error:', error);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text>Environment: {environment}</Text>
      <Button title="Add User" onPress={addUser} />
      
      <FlatList
        data={users}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <View style={{ padding: 10, borderBottomWidth: 1 }}>
            <Text>{item.name}</Text>
            <Text>{item.email}</Text>
          </View>
        )}
      />
    </View>
  );
}
```

### Deno Application

```typescript
// main.ts
import UniversalSQLite from "https://esm.sh/@dqcai/sqlite";

const db = new UniversalSQLite();

async function denoExample() {
  try {
    await db.connect('./deno_database.db');
    
    // Tạo bảng logs
    await db.createTable('logs', {
      id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
      level: 'TEXT NOT NULL',
      message: 'TEXT NOT NULL',
      timestamp: 'DATETIME DEFAULT CURRENT_TIMESTAMP'
    });
    
    // Thêm log entries
    await db.insert('logs', { level: 'INFO', message: 'Application started' });
    await db.insert('logs', { level: 'DEBUG', message: 'Database connected' });
    await db.insert('logs', { level: 'ERROR', message: 'Something went wrong' });
    
    // Truy vấn logs theo level
    const errorLogs = await db.select('logs', 'level = ?', ['ERROR']);
    console.log('Error logs:', errorLogs.rows);
    
    // Sử dụng QueryBuilder
    const recentLogs = QueryBuilder
      .table('logs')
      .select(['level', 'message', 'timestamp'])
      .where('timestamp > datetime("now", "-1 hour")')
      .orderBy('timestamp', 'DESC')
      .limit(10)
      .toSQL();
    
    const result = await db.query(recentLogs);
    console.log('Recent logs:', result.rows);
    
  } finally {
    await db.close();
  }
}

// Chạy với: deno run --allow-read --allow-write main.ts
denoExample();
```

### Bun Application

```typescript
// app.ts
import UniversalSQLite from '@dqcai/sqlite';

const db = new UniversalSQLite();

async function bunExample() {
  console.log('Environment:', db.getEnvironment()); // "Bun"
  
  await db.connect('./bun_database.db');
  
  // Tạo bảng products
  await db.createTable('products', {
    id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
    name: 'TEXT NOT NULL',
    price: 'REAL NOT NULL',
    category: 'TEXT',
    in_stock: 'BOOLEAN DEFAULT 1'
  });
  
  // Bulk insert
  const products = [
    { name: 'Laptop', price: 999.99, category: 'Electronics' },
    { name: 'Mouse', price: 29.99, category: 'Electronics' },
    { name: 'Desk', price: 199.99, category: 'Furniture' }
  ];
  
  for (const product of products) {
    await db.insert('products', product);
  }
  
  // Truy vấn phức tạp
  const expensiveProducts = await db.query(`
    SELECT name, price, category 
    FROM products 
    WHERE price > ? AND in_stock = 1 
    ORDER BY price DESC
  `, [100]);
  
  console.log('Expensive products:', expensiveProducts.rows);
  
  await db.close();
}

// Chạy với: bun run app.ts
bunExample();
```

## 🏗️ Ví dụ nâng cao

### 1. Transaction Management

```typescript
import { SQLiteManager } from '@dqcai/sqlite';

async function transactionExample() {
  const manager = new SQLiteManager();
  const connection = await manager.connect('transactions.db');
  
  try {
    // Bắt đầu transaction
    await connection.execute('BEGIN TRANSACTION');
    
    // Tạo bảng accounts
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        balance REAL DEFAULT 0.00
      )
    `);
    
    // Thêm accounts
    await connection.execute('INSERT INTO accounts (name, balance) VALUES (?, ?)', ['Alice', 1000]);
    await connection.execute('INSERT INTO accounts (name, balance) VALUES (?, ?)', ['Bob', 500]);
    
    // Chuyển tiền từ Alice sang Bob
    const transferAmount = 200;
    
    // Trừ tiền Alice
    await connection.execute(
      'UPDATE accounts SET balance = balance - ? WHERE name = ?', 
      [transferAmount, 'Alice']
    );
    
    // Cộng tiền Bob
    await connection.execute(
      'UPDATE accounts SET balance = balance + ? WHERE name = ?', 
      [transferAmount, 'Bob']
    );
    
    // Kiểm tra balance không âm
    const aliceBalance = await connection.execute('SELECT balance FROM accounts WHERE name = ?', ['Alice']);
    if (aliceBalance.rows[0].balance < 0) {
      throw new Error('Insufficient funds');
    }
    
    // Commit transaction
    await connection.execute('COMMIT');
    console.log('Transfer successful!');
    
    // Hiển thị kết quả
    const allAccounts = await connection.execute('SELECT * FROM accounts');
    console.log('Final balances:', allAccounts.rows);
    
  } catch (error) {
    // Rollback nếu có lỗi
    await connection.execute('ROLLBACK');
    console.error('Transaction failed:', error);
  } finally {
    await connection.close();
  }
}

transactionExample();
```

### 2. Complex Queries với JOIN

```typescript
async function complexQueryExample() {
  const db = new UniversalSQLite();
  await db.connect('ecommerce.db');
  
  // Tạo schema phức tạp
  await db.createTable('categories', {
    id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
    name: 'TEXT NOT NULL UNIQUE',
    description: 'TEXT'
  });
  
  await db.createTable('products', {
    id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
    name: 'TEXT NOT NULL',
    price: 'REAL NOT NULL',
    category_id: 'INTEGER NOT NULL',
    'FOREIGN KEY (category_id)': 'REFERENCES categories(id)'
  });
  
  await db.createTable('orders', {
    id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
    product_id: 'INTEGER NOT NULL',
    quantity: 'INTEGER NOT NULL',
    order_date: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
    'FOREIGN KEY (product_id)': 'REFERENCES products(id)'
  });
  
  // Thêm dữ liệu mẫu
  await db.insert('categories', { name: 'Electronics', description: 'Electronic devices' });
  await db.insert('categories', { name: 'Books', description: 'Books and literature' });
  
  await db.insert('products', { name: 'iPhone 15', price: 999, category_id: 1 });
  await db.insert('products', { name: 'MacBook Pro', price: 2499, category_id: 1 });
  await db.insert('products', { name: 'JavaScript Guide', price: 29.99, category_id: 2 });
  
  await db.insert('orders', { product_id: 1, quantity: 2 });
  await db.insert('orders', { product_id: 2, quantity: 1 });
  await db.insert('orders', { product_id: 1, quantity: 1 });
  
  // Query phức tạp với JOIN
  const salesReport = await db.query(`
    SELECT 
      c.name as category,
      p.name as product,
      SUM(o.quantity) as total_sold,
      SUM(o.quantity * p.price) as total_revenue,
      AVG(p.price) as avg_price
    FROM orders o
    JOIN products p ON o.product_id = p.id
    JOIN categories c ON p.category_id = c.id
    GROUP BY c.id, p.id
    ORDER BY total_revenue DESC
  `);
  
  console.log('Sales Report:', salesReport.rows);
  
  // Subquery example
  const topSellingCategory = await db.query(`
    SELECT 
      c.name,
      (SELECT SUM(quantity) FROM orders o 
       JOIN products p ON o.product_id = p.id 
       WHERE p.category_id = c.id) as total_quantity
    FROM categories c
    ORDER BY total_quantity DESC
    LIMIT 1
  `);
  
  console.log('Top selling category:', topSellingCategory.rows[0]);
  
  await db.close();
}

complexQueryExample();
```

### 3. Real-time Data Synchronization

```typescript
async function realtimeExample() {
  const db = new UniversalSQLite();
  await db.connect('realtime.db');
  
  // Tạo bảng cho sync
  await db.createTable('sync_queue', {
    id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
    table_name: 'TEXT NOT NULL',
    operation: 'TEXT NOT NULL', // INSERT, UPDATE, DELETE
    data: 'TEXT', // JSON data
    synced: 'BOOLEAN DEFAULT 0',
    created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP'
  });
  
  await db.createTable('users', {
    id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
    name: 'TEXT NOT NULL',
    email: 'TEXT UNIQUE',
    last_modified: 'DATETIME DEFAULT CURRENT_TIMESTAMP'
  });
  
  // Helper function để track changes
  async function trackChange(table: string, operation: string, data: any) {
    await db.insert('sync_queue', {
      table_name: table,
      operation: operation,
      data: JSON.stringify(data)
    });
  }
  
  // Wrapper functions với tracking
  async function insertUser(userData: any) {
    const result = await db.insert('users', userData);
    await trackChange('users', 'INSERT', { ...userData, id: result.lastInsertRowId });
    return result;
  }
  
  async function updateUser(id: number, userData: any) {
    const result = await db.update('users', 
      { ...userData, last_modified: new Date().toISOString() }, 
      'id = ?', 
      [id]
    );
    await trackChange('users', 'UPDATE', { id, ...userData });
    return result;
  }
  
  async function deleteUser(id: number) {
    const result = await db.delete('users', 'id = ?', [id]);
    await trackChange('users', 'DELETE', { id });
    return result;
  }
  
  // Sync function
  async function syncToServer() {
    const unsyncedChanges = await db.select('sync_queue', 'synced = 0');
    
    for (const change of unsyncedChanges.rows) {
      try {
        // Giả lập API call
        console.log(`Syncing ${change.operation} on ${change.table_name}:`, 
                   JSON.parse(change.data));
        
        // Đánh dấu đã sync
        await db.update('sync_queue', 
          { synced: 1 }, 
          'id = ?', 
          [change.id]
        );
        
      } catch (error) {
        console.error('Sync failed for change:', change.id, error);
      }
    }
  }
  
  // Demo usage
  await insertUser({ name: 'Alice', email: 'alice@example.com' });
  await insertUser({ name: 'Bob', email: 'bob@example.com' });
  await updateUser(1, { email: 'alice.updated@example.com' });
  
  // Sync changes
  await syncToServer();
  
  await db.close();
}

realtimeExample();
```

### 4. Database Migration System

```typescript
class DatabaseMigration {
  private db: UniversalSQLite;
  private currentVersion: number = 0;
  
  constructor(db: UniversalSQLite) {
    this.db = db;
  }
  
  async getCurrentVersion(): Promise<number> {
    try {
      const result = await this.db.query('PRAGMA user_version');
      return result.rows[0].user_version || 0;
    } catch {
      return 0;
    }
  }
  
  async setVersion(version: number): Promise<void> {
    await this.db.query(`PRAGMA user_version = ${version}`);
  }
  
  async migrate() {
    this.currentVersion = await this.getCurrentVersion();
    console.log(`Current database version: ${this.currentVersion}`);
    
    const migrations = [
      this.migration1_initial,
      this.migration2_addUserProfiles,
      this.migration3_addIndexes,
      this.migration4_addAuditLog
    ];
    
    for (let i = this.currentVersion; i < migrations.length; i++) {
      console.log(`Running migration ${i + 1}...`);
      await migrations[i].call(this);
      await this.setVersion(i + 1);
      console.log(`Migration ${i + 1} completed`);
    }
    
    console.log('All migrations completed!');
  }
  
  // Migration 1: Initial schema
  private async migration1_initial() {
    await this.db.createTable('users', {
      id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
      username: 'TEXT UNIQUE NOT NULL',
      email: 'TEXT UNIQUE NOT NULL',
      created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP'
    });
  }
  
  // Migration 2: Add user profiles
  private async migration2_addUserProfiles() {
    await this.db.query('ALTER TABLE users ADD COLUMN first_name TEXT');
    await this.db.query('ALTER TABLE users ADD COLUMN last_name TEXT');
    await this.db.query('ALTER TABLE users ADD COLUMN avatar_url TEXT');
  }
  
  // Migration 3: Add performance indexes
  private async migration3_addIndexes() {
    await this.db.query('CREATE INDEX idx_users_email ON users(email)');
    await this.db.query('CREATE INDEX idx_users_username ON users(username)');
    await this.db.query('CREATE INDEX idx_users_created_at ON users(created_at)');
  }
  
  // Migration 4: Add audit log
  private async migration4_addAuditLog() {
    await this.db.createTable('audit_logs', {
      id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
      table_name: 'TEXT NOT NULL',
      record_id: 'INTEGER NOT NULL',
      action: 'TEXT NOT NULL',
      old_values: 'TEXT',
      new_values: 'TEXT',
      user_id: 'INTEGER',
      timestamp: 'DATETIME DEFAULT CURRENT_TIMESTAMP'
    });
    
    // Tạo trigger cho audit
    await this.db.query(`
      CREATE TRIGGER audit_users_update 
      AFTER UPDATE ON users 
      FOR EACH ROW 
      BEGIN
        INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values)
        VALUES ('users', NEW.id, 'UPDATE', 
                json_object('username', OLD.username, 'email', OLD.email),
                json_object('username', NEW.username, 'email', NEW.email));
      END
    `);
  }
}

// Sử dụng migration
async function migrationExample() {
  const db = new UniversalSQLite();
  await db.connect('app_with_migrations.db');
  
  const migration = new DatabaseMigration(db);
  await migration.migrate();
  
  // Test data sau migration
  await db.insert('users', {
    username: 'testuser',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User'
  });
  
  // Update để trigger audit
  await db.update('users', 
    { email: 'test.updated@example.com' },
    'username = ?',
    ['testuser']
  );
  
  // Kiểm tra audit log
  const auditLogs = await db.select('audit_logs');
  console.log('Audit logs:', auditLogs.rows);
  
  await db.close();
}

migrationExample();
```

### 5. Full-Text Search

```typescript
async function fullTextSearchExample() {
  const db = new UniversalSQLite();
  await db.connect('search.db');
  
  // Tạo FTS table
  await db.query(`
    CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts 
    USING fts5(id, title, content, author)
  `);
  
  // Tạo bảng articles thường
  await db.createTable('articles', {
    id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
    title: 'TEXT NOT NULL',
    content: 'TEXT NOT NULL',
    author: 'TEXT NOT NULL',
    published_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP'
  });
  
  // Thêm dữ liệu mẫu
  const articles = [
    {
      title: 'Introduction to SQLite',
      content: 'SQLite is a lightweight database engine that is perfect for mobile and web applications. It provides ACID compliance and supports most of the SQL standard.',
      author: 'John Doe'
    },
    {
      title: 'Advanced TypeScript Patterns',
      content: 'TypeScript provides powerful type system features including generics, conditional types, and mapped types that enable building robust applications.',
      author: 'Jane Smith'
    },
    {
      title: 'React Native Performance Tips',
      content: 'Optimizing React Native apps requires understanding of the bridge, native modules, and proper state management patterns.',
      author: 'Bob Johnson'
    }
  ];
  
  for (const article of articles) {
    const result = await db.insert('articles', article);
    // Thêm vào FTS index
    await db.query(`
      INSERT INTO articles_fts (id, title, content, author) 
      VALUES (?, ?, ?, ?)
    `, [result.lastInsertRowId, article.title, article.content, article.author]);
  }
  
  // Full-text search
  const searchResults = await db.query(`
    SELECT 
      a.id, a.title, a.author, a.published_at,
      snippet(articles_fts, 1, '<b>', '</b>', '...', 50) as title_snippet,
      snippet(articles_fts, 2, '<b>', '</b>', '...', 100) as content_snippet
    FROM articles_fts
    JOIN articles a ON articles_fts.id = a.id
    WHERE articles_fts MATCH ?
    ORDER BY rank
  `, ['SQLite OR TypeScript']);
  
  console.log('Search results:', searchResults.rows);
  
  // Advanced search với bxm25 ranking
  const advancedSearch = await db.query(`
    SELECT 
      a.*,
      bm25(articles_fts) as relevance_score
    FROM articles_fts
    JOIN articles a ON articles_fts.id = a.id
    WHERE articles_fts MATCH ?
    ORDER BY relevance_score
  `, ['application AND (mobile OR web)']);
  
  console.log('Advanced search:', advancedSearch.rows);
  
  await db.close();
}

fullTextSearchExample();
```

### 6. Data Analytics và Reporting

```typescript
async function analyticsExample() {
  const db = new UniversalSQLite();
  await db.connect('analytics.db');
  
  // Tạo schema cho analytics
  await db.createTable('events', {
    id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
    user_id: 'INTEGER NOT NULL',
    event_type: 'TEXT NOT NULL',
    event_data: 'TEXT', // JSON
    timestamp: 'DATETIME DEFAULT CURRENT_TIMESTAMP'
  });
  
  await db.createTable('users_analytics', {
    id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
    user_id: 'INTEGER UNIQUE NOT NULL',
    total_events: 'INTEGER DEFAULT 0',
    first_seen: 'DATETIME',
    last_seen: 'DATETIME',
    session_count: 'INTEGER DEFAULT 0'
  });
  
  // Thêm dữ liệu events mẫu
  const sampleEvents = [
    { user_id: 1, event_type: 'page_view', event_data: '{"page": "/home"}' },
    { user_id: 1, event_type: 'click', event_data: '{"element": "signup_button"}' },
    { user_id: 2, event_type: 'page_view', event_data: '{"page": "/products"}' },
    { user_id: 1, event_type: 'purchase', event_data: '{"product_id": 123, "amount": 99.99}' },
    { user_id: 3, event_type: 'page_view', event_data: '{"page": "/home"}' },
    { user_id: 2, event_type: 'purchase', event_data: '{"product_id": 456, "amount": 149.99}' }
  ];
  
  for (const event of sampleEvents) {
    await db.insert('events', event);
  }
  
  // Analytics queries
  
  // 1. User engagement report
  const userEngagement = await db.query(`
    SELECT 
      user_id,
      COUNT(*) as total_events,
      COUNT(CASE WHEN event_type = 'purchase' THEN 1 END) as purchases,
      MIN(timestamp) as first_seen,
      MAX(timestamp) as last_seen,
      ROUND(
        JULIANDAY(MAX(timestamp)) - JULIANDAY(MIN(timestamp))
      ) as days_active
    FROM events
    GROUP BY user_id
    ORDER BY total_events DESC
  `);
  
  console.log('User Engagement Report:', userEngagement.rows);
  
  // 2. Revenue analytics
  const revenueReport = await db.query(`
    SELECT 
      DATE(timestamp) as date,
      COUNT(*) as purchase_count,
      SUM(CAST(json_extract(event_data, '$.amount') AS REAL)) as total_revenue,
      AVG(CAST(json_extract(event_data, '$.amount') AS REAL)) as avg_order_value
    FROM events
    WHERE event_type = 'purchase'
    GROUP BY DATE(timestamp)
    ORDER BY date DESC
  `);
  
  console.log('Revenue Report:', revenueReport.rows);
  
  // 3. Funnel analysis
  const funnelAnalysis = await db.query(`
    WITH user_funnel AS (
      SELECT 
        user_id,
        MAX(CASE WHEN event_type = 'page_view' THEN 1 ELSE 0 END) as viewed,
        MAX(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END) as clicked,
        MAX(CASE WHEN event_type = 'purchase' THEN 1 ELSE 0 END) as purchased
      FROM events
      GROUP BY user_id
    )
    SELECT 
      SUM(viewed) as total_users,
      SUM(clicked) as users_clicked,
      SUM(purchased) as users_purchased,
      ROUND(SUM(clicked) * 100.0 / SUM(viewed), 2) as click_rate_percent,
      ROUND(SUM(purchased) * 100.0 / SUM(clicked), 2) as conversion_rate_percent
    FROM user_funnel
  `);
  
  console.log('Funnel Analysis:', funnelAnalysis.rows[0]);
  
  await db.close();
}

analyticsExample();
```

## 🔍 Debugging và Monitoring

### 1. Query Performance Monitoring

```typescript
class PerformanceMonitor {
  private db: UniversalSQLite;
  
  constructor(db: UniversalSQLite) {
    this.db = db;
  }
  
  async queryWithTiming(sql: string, params?: any[]): Promise<{result: any, duration: number}> {
    const startTime = performance.now();
    const result = await this.db.query(sql, params);
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`Query executed in ${duration.toFixed(2)}ms: ${sql.substring(0, 100)}...`);
    
    return { result, duration };
  }
  
  async explainQuery(sql: string): Promise<void> {
    const explanation = await this.db.query(`EXPLAIN QUERY PLAN ${sql}`);
    console.log('Query Plan:');
    explanation.rows.forEach(row => {
      console.log(`  ${row.detail}`);
    });
  }
}

async function performanceExample() {
  const db = new UniversalSQLite();
  await db.connect('performance_test.db');
  const monitor = new PerformanceMonitor(db);
  
  // Tạo bảng với nhiều dữ liệu
  await db.createTable('large_table', {
    id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
    name: 'TEXT',
    value: 'INTEGER',
    category: 'TEXT'
  });
  
  // Insert bulk data
  console.log('Inserting test data...');
  for (let i = 0; i < 1000; i++) {
    await db.insert('large_table', {
      name: `Item ${i}`,
      value: Math.floor(Math.random() * 1000),
      category: `Category ${i % 10}`
    });
  }
  
  // Test query performance
  const { result, duration } = await monitor.queryWithTiming(`
    SELECT category, COUNT(*) as count, AVG(value) as avg_value
    FROM large_table 
    GROUP BY category 
    ORDER BY count DESC
  `);
  
  console.log('Aggregation result:', result.rows);
  
  // Explain query
  await monitor.explainQuery('SELECT * FROM large_table WHERE value > 500');
  
  await db.close();
}

performanceExample();
```

### 2. Connection Pool (Advanced)

```typescript
class ConnectionPool {
  private connections: Map<string, UniversalSQLite> = new Map();
  private maxConnections: number = 5;
  
  async getConnection(dbPath: string): Promise<UniversalSQLite> {
    if (this.connections.has(dbPath)) {
      return this.connections.get(dbPath)!;
    }
    
    if (this.connections.size >= this.maxConnections) {
      throw new Error('Connection pool exhausted');
    }
    
    const db = new UniversalSQLite();
    await db.connect(dbPath);
    this.connections.set(dbPath, db);
    
    return db;
  }
  
  async closeAll(): Promise<void> {
    for (const [path, db] of this.connections) {
      await db.close();
    }
    this.connections.clear();
  }
}

async function connectionPoolExample() {
  const pool = new ConnectionPool();
  
  try {
    // Sử dụng multiple databases
    const mainDb = await pool.getConnection('main.db');
    const cacheDb = await pool.getConnection('cache.db');
    const logsDb = await pool.getConnection('logs.db');
    
    // Setup schemas
    await mainDb.createTable('users', {
      id: 'INTEGER PRIMARY KEY',
      name: 'TEXT',
      email: 'TEXT'
    });
    
    await cacheDb.createTable('cache_entries', {
      key: 'TEXT PRIMARY KEY',
      value: 'TEXT',
      expires_at: 'DATETIME'
    });
    
    await logsDb.createTable('access_logs', {
      id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
      ip: 'TEXT',
      path: 'TEXT',
      timestamp: 'DATETIME DEFAULT CURRENT_TIMESTAMP'
    });
    
    // Concurrent operations
    await Promise.all([
      mainDb.insert('users', { name: 'Alice', email: 'alice@test.com' }),
      cacheDb.insert('cache_entries', { key: 'user:1', value: '{"name":"Alice"}', expires_at: '2024-12-31 23:59:59' }),
      logsDb.insert('access_logs', { ip: '192.168.1.1', path: '/api/users' })
    ]);
    
    console.log('All operations completed successfully');
    
  } finally {
    await pool.closeAll();
  }
}

connectionPoolExample();
```

## 🛠️ Configuration và Customization

### Environment Detection

```typescript
import { SQLiteManager } from '@dqcai/sqlite';

const manager = new SQLiteManager();

// Kiểm tra môi trường hiện tại
const env = manager.getEnvironmentInfo();
console.log('Running on:', env);

// Conditional logic based on environment
switch (env) {
  case 'Node.js':
    console.log('Server-side database with file system access');
    break;
  case 'Browser':
    console.log('Client-side database with local storage');
    break;
  case 'React Native':
    console.log('Mobile database with native SQLite');
    break;
  case 'React Native Windows':
    console.log('Windows mobile database');
    break;
  case 'Deno':
    console.log('Deno runtime with modern SQLite');
    break;
  case 'Bun':
    console.log('Bun runtime with built-in SQLite');
    break;
}
```

### Custom Error Handling

```typescript
class DatabaseErrorHandler {
  static async safeExecute<T>(
    operation: () => Promise<T>, 
    fallback?: T
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      console.error('Database operation failed:', error);
      
      if (error.message.includes('UNIQUE constraint failed')) {
        console.log('Duplicate entry detected');
      } else if (error.message.includes('no such table')) {
        console.log('Table does not exist');
      } else if (error.message.includes('database is locked')) {
        console.log('Database is busy, retrying...');
        // Implement retry logic
        await new Promise(resolve => setTimeout(resolve, 100));
        return await operation();
      }
      
      return fallback || null;
    }
  }
}

async function errorHandlingExample() {
  const db = new UniversalSQLite();
  await db.connect('error_test.db');
  
  await db.createTable('users', {
    id: 'INTEGER PRIMARY KEY',
    email: 'TEXT UNIQUE NOT NULL'
  });
  
  // Safe insert với error handling
  const user1 = await DatabaseErrorHandler.safeExecute(async () => {
    return await db.insert('users', { email: 'test@example.com' });
  });
  
  // Duplicate insert sẽ fail gracefully
  const user2 = await DatabaseErrorHandler.safeExecute(async () => {
    return await db.insert('users', { email: 'test@example.com' });
  });
  
  console.log('User1 result:', user1);
  console.log('User2 result:', user2); // null due to unique constraint
  
  await db.close();
}

errorHandlingExample();
```

## 📱 Platform-Specific Examples

### React Native với Expo

```typescript
// expo-sqlite-example.ts
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, FlatList } from 'react-native';
import { useState, useEffect } from 'react';
import UniversalSQLite from '@dqcai/sqlite';

const db = new UniversalSQLite();

export default function App() {
  const [todos, setTodos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initDatabase();
  }, []);

  const initDatabase = async () => {
    try {
      await db.connect('todos.db');
      
      await db.createTable('todos', {
        id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
        title: 'TEXT NOT NULL',
        completed: 'BOOLEAN DEFAULT 0',
        priority: 'INTEGER DEFAULT 1',
        created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP'
      });
      
      loadTodos();
    } catch (error) {
      console.error('Database setup error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTodos = async () => {
    try {
      const result = await db.select('todos', null, []);
      setTodos(result.rows);
    } catch (error) {
      console.error('Load todos error:', error);
    }
  };

  const addTodo = async () => {
    try {
      await db.insert('todos', {
        title: `Todo ${Date.now()}`,
        priority: Math.floor(Math.random() * 3) + 1
      });
      loadTodos();
    } catch (error) {
      console.error('Add todo error:', error);
    }
  };

  const toggleTodo = async (id: number, completed: boolean) => {
    try {
      await db.update('todos', 
        { completed: completed ? 0 : 1 },
        'id = ?',
        [id]
      );
      loadTodos();
    } catch (error) {
      console.error('Toggle todo error:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text>Loading database...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Universal SQLite Todos</Text>
      <Text>Environment: {db.getEnvironment()}</Text>
      
      <Button title="Add Todo" onPress={addTodo} />
      
      <FlatList
        data={todos}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.todoItem}>
            <Text style={[styles.todoText, item.completed && styles.completed]}>
              {item.title}
            </Text>
            <Button 
              title={item.completed ? "Undo" : "Done"}
              onPress={() => toggleTodo(item.id, item.completed)}
            />
          </View>
        )}
      />
      
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  todoText: {
    flex: 1,
    fontSize: 16,
  },
  completed: {
    textDecorationLine: 'line-through',
    color: '#888',
  },
});
```

### Next.js API Routes

```typescript
// pages/api/users/[id].ts
import { NextApiRequest, NextApiResponse } from 'next';
import UniversalSQLite from '@dqcai/sqlite';

const db = new UniversalSQLite();
let isConnected = false;

async function ensureConnection() {
  if (!isConnected) {
    await db.connect(process.env.DATABASE_PATH || './api_database.db');
    
    await db.createTable('users', {
      id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
      name: 'TEXT NOT NULL',
      email: 'TEXT UNIQUE NOT NULL',
      avatar: 'TEXT',
      created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
      updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP'
    });
    
    isConnected = true;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  
  try {
    await ensureConnection();
    
    switch (req.method) {
      case 'GET':
        if (id === 'all') {
          const users = await db.select('users');
          res.status(200).json(users.rows);
        } else {
          const user = await db.select('users', 'id = ?', [Number(id)]);
          if (user.rows.length === 0) {
            res.status(404).json({ error: 'User not found' });
          } else {
            res.status(200).json(user.rows[0]);
          }
        }
        break;
        
      case 'POST':
        const { name, email, avatar } = req.body;
        const newUser = await db.insert('users', { name, email, avatar });
        res.status(201).json({ 
          id: newUser.lastInsertRowId, 
          message: 'User created successfully' 
        });
        break;
        
      case 'PUT':
        const updateData = { ...req.body, updated_at: new Date().toISOString() };
        const updateResult = await db.update('users', updateData, 'id = ?', [Number(id)]);
        
        if (updateResult.rowsAffected === 0) {
          res.status(404).json({ error: 'User not found' });
        } else {
          res.status(200).json({ message: 'User updated successfully' });
        }
        break;
        
      case 'DELETE':
        const deleteResult = await db.delete('users', 'id = ?', [Number(id)]);
        
        if (deleteResult.rowsAffected === 0) {
          res.status(404).json({ error: 'User not found' });
        } else {
          res.status(200).json({ message: 'User deleted successfully' });
        }
        break;
        
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
    
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

## 🧪 Testing

### Unit Tests với Jest

```typescript
// __tests__/universal-sqlite.test.ts
import UniversalSQLite from '../src/index';

describe('UniversalSQLite', () => {
  let db: UniversalSQLite;
  
  beforeEach(async () => {
    db = new UniversalSQLite();
    await db.connect(':memory:');
  });
  
  afterEach(async () => {
    await db.close();
  });
  
  test('should create and query table', async () => {
    await db.createTable('test_table', {
      id: 'INTEGER PRIMARY KEY',
      name: 'TEXT'
    });
    
    await db.insert('test_table', { name: 'Test Item' });
    
    const result = await db.select('test_table');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].name).toBe('Test Item');
  });
  
  test('should handle parameters correctly', async () => {
    await db.createTable('users', {
      id: 'INTEGER PRIMARY KEY',
      email: 'TEXT UNIQUE'
    });
    
    await db.insert('users', { email: 'test@example.com' });
    
    const user = await db.select('users', 'email = ?', ['test@example.com']);
    expect(user.rows).toHaveLength(1);
    
    const noUser = await db.select('users', 'email = ?', ['nonexistent@example.com']);
    expect(noUser.rows).toHaveLength(0);
  });
  
  test('should handle SQL injection attempts', async () => {
    await db.createTable('users', {
      id: 'INTEGER PRIMARY KEY',
      name: 'TEXT'
    });
    
    await db.insert('users', { name: 'Regular User' });
    
    // Attempt SQL injection
    const maliciousInput = "'; DROP TABLE users; --";
    await db.insert('users', { name: maliciousInput });
    
    const users = await db.select('users');
    expect(users.rows).toHaveLength(2); // Table should still exist
  });
});
```

## 🔐 Best Practices

### 1. Security

```typescript
class SecureDatabase {
  private db: UniversalSQLite;
  
  constructor() {
    this.db = new UniversalSQLite();
  }
  
  async connect(path: string) {
    await this.db.connect(path);
    
    // Enable foreign key constraints
    await this.db.query('PRAGMA foreign_keys = ON');
    
    // Set secure defaults
    await this.db.query('PRAGMA journal_mode = WAL'); // Write-Ahead Logging
    await this.db.query('PRAGMA synchronous = NORMAL');
  }
  
  // Validate input before queries
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  validateUsername(username: string): boolean {
    return /^[a-zA-Z0-9_]{3,20}$/.test(username);
  }
  
  async createUser(userData: {name: string, email: string, username: string}) {
    // Validate input
    if (!this.validateEmail(userData.email)) {
      throw new Error('Invalid email format');
    }
    
    if (!this.validateUsername(userData.username)) {
      throw new Error('Invalid username format');
    }
    
    // Sanitize input
    const sanitizedData = {
      name: userData.name.trim(),
      email: userData.email.toLowerCase().trim(),
      username: userData.username.trim()
    };
    
    return await this.db.insert('users', sanitizedData);
  }
}
```

### 2. Performance Optimization

```typescript
class OptimizedDatabase {
  private db: UniversalSQLite;
  
  constructor() {
    this.db = new UniversalSQLite();
  }
  
  async connect(path: string) {
    await this.db.connect(path);
    
    // Performance tuning
    await this.db.query('PRAGMA cache_size = 10000');
    await this.db.query('PRAGMA temp_store = memory');
    await this.db.query('PRAGMA mmap_size = 268435456'); // 256MB
    await this.db.query('PRAGMA optimize');
  }
  
  async bulkInsert(table: string, records: Record<string, any>[]) {
    await this.db.query('BEGIN TRANSACTION');
    
    try {
      for (const record of records) {
        await this.db.insert(table, record);
      }
      await this.db.query('COMMIT');
    } catch (error) {
      await this.db.query('ROLLBACK');
      throw error;
    }
  }
  
  async createOptimizedIndexes(table: string, columns: string[]) {
    for (const column of columns) {
      await this.db.query(`
        CREATE INDEX IF NOT EXISTS idx_${table}_${column} 
        ON ${table}(${column})
      `);
    }
  }
}
```

## 🚨 Troubleshooting

### Common Issues

#### 1. "No supported SQLite adapter found"
```typescript
// Kiểm tra adapter availability
const manager = new SQLiteManager();
const adapters = [
  'NodeAdapter',
  'BrowserAdapter', 
  'DenoAdapter',
  'BunAdapter',
  'ReactNativeAdapter'
];

for (const adapterName of adapters) {
  try {
    const adapter = new (require(`./adapters/${adapterName.toLowerCase()}`))();
    console.log(`${adapterName}: ${adapter.isSupported() ? '✅' : '❌'}`);
  } catch {
    console.log(`${adapterName}: ❌ (not available)`);
  }
}
```

#### 2. React Native Windows Setup

```typescript
// Kiểm tra Windows environment
async function checkReactNativeWindows() {
  const db = new UniversalSQLite();
  
  console.log('Environment:', db.getEnvironment());
  
  if (db.getEnvironment() === 'React Native Windows') {
    console.log('✅ React Native Windows detected');
    
    try {
      await db.connect('windows_test.db');
      console.log('✅ Database connection successful');
      
      await db.createTable('test', { id: 'INTEGER', name: 'TEXT' });
      console.log('✅ Table creation successful');
      
    } catch (error) {
      console.error('❌ Windows SQLite error:', error);
      console.log('💡 Try installing: npm install react-native-sqlite-2');
    }
  }
}
```

#### 3. Browser CORS Issues

```typescript
// browser-cors-fix.js
async function setupBrowserDatabase() {
  const db = new UniversalSQLite();
  
  try {
    // In-memory database (không cần file access)
    await db.connect(':memory:');
    console.log('✅ Browser in-memory database ready');
    
  } catch (error) {
    console.error('❌ Browser setup failed:', error);
    console.log('💡 Fallback: Using in-memory database');
    
    // Fallback strategy
    await db.connect(':memory:');
  }
}
```

## 📊 Performance Benchmarks

```typescript
async function benchmarkExample() {
  const db = new UniversalSQLite();
  await db.connect('benchmark.db');
  
  await db.createTable('benchmark_table', {
    id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
    data: 'TEXT',
    timestamp: 'DATETIME DEFAULT CURRENT_TIMESTAMP'
  });
  
  // Benchmark bulk insert
  console.log('Starting bulk insert benchmark...');
  const insertStart = performance.now();
  
  await db.query('BEGIN TRANSACTION');
  for (let i = 0; i < 10000; i++) {
    await db.insert('benchmark_table', { 
      data: `Sample data ${i}` 
    });
  }
  await db.query('COMMIT');
  
  const insertEnd = performance.now();
  console.log(`Bulk insert (10k records): ${(insertEnd - insertStart).toFixed(2)}ms`);
  
  // Benchmark select
  const selectStart = performance.now();
  const allRecords = await db.select('benchmark_table');
  const selectEnd = performance.now();
  
  console.log(`Select all (${allRecords.rows.length} records): ${(selectEnd - selectStart).toFixed(2)}ms`);
  
  // Benchmark with index
  await db.query('CREATE INDEX idx_data ON benchmark_table(data)');
  
  const indexedSelectStart = performance.now();
  const searchResult = await db.select('benchmark_table', 'data LIKE ?', ['Sample data 50%']);
  const indexedSelectEnd = performance.now();
  
  console.log(`Indexed search (${searchResult.rows.length} results): ${(indexedSelectEnd - indexedSelectStart).toFixed(2)}ms`);
  
  await db.close();
}

benchmarkExample();
```

## 📚 Advanced Use Cases

### 1. Multi-Database Application

```typescript
class MultiDatabaseApp {
  private userDb: UniversalSQLite;
  private logDb: UniversalSQLite;
  private cacheDb: UniversalSQLite;
  
  constructor() {
    this.userDb = new UniversalSQLite();
    this.logDb = new UniversalSQLite();
    this.cacheDb = new UniversalSQLite();
  }
  
  async initialize() {
    // Separate databases for different concerns
    await this.userDb.connect('users.db');
    await this.logDb.connect('logs.db');
    await this.cacheDb.connect(':memory:'); // Cache in memory
    
    // Setup schemas
    await this.setupUserDatabase();
    await this.setupLogDatabase();
    await this.setupCacheDatabase();
  }
  
  private async setupUserDatabase() {
    await this.userDb.createTable('users', {
      id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
      username: 'TEXT UNIQUE NOT NULL',
      email: 'TEXT UNIQUE NOT NULL',
      profile_data: 'TEXT', // JSON
      created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP'
    });
    
    await this.userDb.createTable('user_sessions', {
      id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
      user_id: 'INTEGER NOT NULL',
      session_token: 'TEXT UNIQUE NOT NULL',
      expires_at: 'DATETIME NOT NULL',
      'FOREIGN KEY (user_id)': 'REFERENCES users(id) ON DELETE CASCADE'
    });
  }
  
  private async setupLogDatabase() {
    await this.logDb.createTable('access_logs', {
      id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
      user_id: 'INTEGER',
      action: 'TEXT NOT NULL',
      ip_address: 'TEXT',
      user_agent: 'TEXT',
      timestamp: 'DATETIME DEFAULT CURRENT_TIMESTAMP'
    });
    
    await this.logDb.createTable('error_logs', {
      id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
      error_type: 'TEXT NOT NULL',
      error_message: 'TEXT NOT NULL',
      stack_trace: 'TEXT',
      context: 'TEXT', // JSON
      timestamp: 'DATETIME DEFAULT CURRENT_TIMESTAMP'
    });
  }
  
  private async setupCacheDatabase() {
    await this.cacheDb.createTable('cache_entries', {
      key: 'TEXT PRIMARY KEY',
      value: 'TEXT NOT NULL',
      expires_at: 'DATETIME NOT NULL'
    });
  }
  
  // User operations
  async createUser(userData: any) {
    const result = await this.userDb.insert('users', userData);
    
    // Log the action
    await this.logAction(result.lastInsertRowId!, 'USER_CREATED', 'User registration');
    
    return result;
  }
  
  async getUserById(id: number) {
    // Check cache first
    const cached = await this.getFromCache(`user:${id}`);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Query from database
    const result = await this.userDb.select('users', 'id = ?', [id]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      // Cache for 1 hour
      await this.setCache(`user:${id}`, JSON.stringify(user), 3600);
      return user;
    }
    
    return null;
  }
  
  // Logging operations
  async logAction(userId: number, action: string, details: string) {
    await this.logDb.insert('access_logs', {
      user_id: userId,
      action: action,
      ip_address: '127.0.0.1', // Would get from request
      user_agent: 'Universal SQLite App'
    });
  }
  
  async logError(error: Error, context?: any) {
    await this.logDb.insert('error_logs', {
      error_type: error.name,
      error_message: error.message,
      stack_trace: error.stack,
      context: context ? JSON.stringify(context) : null
    });
  }
  
  // Cache operations
  async setCache(key: string, value: string, ttlSeconds: number) {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    
    await this.cacheDb.query(`
      INSERT OR REPLACE INTO cache_entries (key, value, expires_at) 
      VALUES (?, ?, ?)
    `, [key, value, expiresAt]);
  }
  
  async getFromCache(key: string): Promise<string | null> {
    // Clean expired entries
    await this.cacheDb.delete('cache_entries', 'expires_at < ?', [new Date().toISOString()]);
    
    const result = await this.cacheDb.select('cache_entries', 'key = ?', [key]);
    return result.rows.length > 0 ? result.rows[0].value : null;
  }
  
  // Analytics across databases
  async getUserAnalytics(userId: number) {
    const user = await this.getUserById(userId);
    if (!user) return null;
    
    const logs = await this.logDb.query(`
      SELECT 
        action,
        COUNT(*) as count,
        MAX(timestamp) as last_action
      FROM access_logs 
      WHERE user_id = ? 
      GROUP BY action
      ORDER BY count DESC
    `, [userId]);
    
    return {
      user: user,
      activity: logs.rows,
      total_actions: logs.rows.reduce((sum, row) => sum + row.count, 0)
    };
  }
  
  async cleanup() {
    await this.userDb.close();
    await this.logDb.close();
    await this.cacheDb.close();
  }
}

// Usage
async function multiDbExample() {
  const app = new MultiDatabaseApp();
  
  try {
    await app.initialize();
    
    // Create user
    const newUser = await app.createUser({
      username: 'johndoe',
      email: 'john@example.com',
      profile_data: JSON.stringify({ bio: 'Software developer' })
    });
    
    const userId = newUser.lastInsertRowId!;
    
    // Simulate user activity
    await app.logAction(userId, 'LOGIN', 'User logged in');
    await app.logAction(userId, 'VIEW_PROFILE', 'Viewed profile page');
    await app.logAction(userId, 'UPDATE_PROFILE', 'Updated profile');
    
    // Get analytics
    const analytics = await app.getUserAnalytics(userId);
    console.log('User Analytics:', analytics);
    
  } catch (error) {
    console.error('Multi-db error:', error);
  } finally {
    await app.cleanup();
  }
}

multiDbExample();
```

### 2. Real-time Sync với WebSocket

```typescript
// realtime-sync.ts
import UniversalSQLite, { QueryBuilder } from '@dqcai/sqlite';
import { WebSocket } from 'ws'; // Node.js example

class RealtimeSync {
  private db: UniversalSQLite;
  private ws: WebSocket | null = null;
  private syncQueue: any[] = [];
  
  constructor() {
    this.db = new UniversalSQLite();
  }
  
  async initialize() {
    await this.db.connect('realtime.db');
    
    // Setup sync tables
    await this.db.createTable('messages', {
      id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
      content: 'TEXT NOT NULL',
      sender_id: 'INTEGER NOT NULL',
      room_id: 'INTEGER NOT NULL',
      created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
      synced: 'BOOLEAN DEFAULT 0'
    });
    
    await this.db.createTable('sync_log', {
      id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
      operation: 'TEXT NOT NULL',
      table_name: 'TEXT NOT NULL',
      record_id: 'INTEGER',
      data: 'TEXT',
      sync_status: 'TEXT DEFAULT "pending"',
      created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP'
    });
    
    this.startSyncProcess();
  }
  
  async addMessage(content: string, senderId: number, roomId: number) {
    const result = await this.db.insert('messages', {
      content,
      sender_id: senderId,
      room_id: roomId
    });
    
    // Queue for sync
    await this.queueSync('INSERT', 'messages', result.lastInsertRowId!, {
      id: result.lastInsertRowId,
      content,
      sender_id: senderId,
      room_id: roomId
    });
    
    return result;
  }
  
  async getMessages(roomId: number, limit: number = 50) {
    return await this.db.query(`
      SELECT m.*, u.username 
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE m.room_id = ? 
      ORDER BY m.created_at DESC 
      LIMIT ?
    `, [roomId, limit]);
  }
  
  private async queueSync(operation: string, tableName: string, recordId: number, data: any) {
    await this.db.insert('sync_log', {
      operation,
      table_name: tableName,
      record_id: recordId,
      data: JSON.stringify(data)
    });
  }
  
  private async startSyncProcess() {
    setInterval(async () => {
      await this.processSyncQueue();
    }, 5000); // Sync every 5 seconds
  }
  
  private async processSyncQueue() {
    const pendingSyncs = await this.db.select('sync_log', 'sync_status = ?', ['pending']);
    
    for (const sync of pendingSyncs.rows) {
      try {
        // Simulate API call
        const response = await this.syncToServer(sync);
        
        if (response.success) {
          await this.db.update('sync_log',
            { sync_status: 'completed' },
            'id = ?',
            [sync.id]
          );
          
          // Mark original record as synced
          if (sync.table_name === 'messages') {
            await this.db.update('messages',
              { synced: 1 },
              'id = ?',
              [sync.record_id]
            );
          }
        }
      } catch (error) {
        await this.db.update('sync_log',
          { sync_status: 'failed' },
          'id = ?',
          [sync.id]
        );
        console.error('Sync failed:', error);
      }
    }
  }
  
  private async syncToServer(syncData: any): Promise<{success: boolean}> {
    // Simulate server sync
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: Math.random() > 0.1 }); // 90% success rate
      }, 100);
    });
  }
}

// Usage
async function realtimeSyncExample() {
  const sync = new RealtimeSync();
  await sync.initialize();
  
  // Simulate adding messages
  await sync.addMessage('Hello World!', 1, 1);
  await sync.addMessage('How are you?', 2, 1);
  
  // Get messages
  const messages = await sync.getMessages(1);
  console.log('Room messages:', messages.rows);
  
  // Let sync process run
  await new Promise(resolve => setTimeout(resolve, 6000));
}

realtimeSyncExample();
```

### 3. Database Backup và Restore

```typescript
class DatabaseBackup {
  private db: UniversalSQLite;
  
  constructor() {
    this.db = new UniversalSQLite();
  }
  
  async connect(path: string) {
    await this.db.connect(path);
  }
  
  async createBackup(): Promise<string> {
    // Get all table schemas
    const tables = await this.db.query(`
      SELECT name, sql FROM sqlite_master 
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    `);
    
    let backupSQL = '';
    backupSQL += '-- Database Backup\n';
    backupSQL += `-- Generated: ${new Date().toISOString()}\n\n`;
    
    // Add schema
    for (const table of tables.rows) {
      backupSQL += `${table.sql};\n\n`;
    }
    
    // Add data
    for (const table of tables.rows) {
      const data = await this.db.select(table.name);
      
      if (data.rows.length > 0) {
        // Get column names
        const columns = Object.keys(data.rows[0]);
        
        backupSQL += `-- Data for ${table.name}\n`;
        for (const row of data.rows) {
          const values = columns.map(col => {
            const value = row[col];
            if (value === null) return 'NULL';
            if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
            return String(value);
          });
          
          backupSQL += `INSERT INTO ${table.name} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
        }
        backupSQL += '\n';
      }
    }
    
    return backupSQL;
  }
  
  async restoreFromBackup(backupSQL: string): Promise<void> {
    const statements = backupSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'));
    
    await this.db.query('BEGIN TRANSACTION');
    
    try {
      for (const statement of statements) {
        if (statement) {
          await this.db.query(statement);
        }
      }
      await this.db.query('COMMIT');
      console.log('Backup restored successfully');
    } catch (error) {
      await this.db.query('ROLLBACK');
      throw new Error(`Restore failed: ${error}`);
    }
  }
  
  async scheduleBackups(intervalMinutes: number = 60) {
    setInterval(async () => {
      try {
        const backup = await this.createBackup();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `backup_${timestamp}.sql`;
        
        // In Node.js environment, save to file
        if (typeof require !== 'undefined' && this.db.getEnvironment() === 'Node.js') {
          const fs = require('fs').promises;
          await fs.writeFile(filename, backup);
          console.log(`Backup saved: ${filename}`);
        } else {
          // In browser/other environments, log or send to server
          console.log('Backup created (implement save logic for your environment)');
        }
        
      } catch (error) {
        console.error('Backup failed:', error);
      }
    }, intervalMinutes * 60 * 1000);
  }
  
  async close() {
    await this.db.close();
  }
}

// Usage
async function backupExample() {
  const backup = new DatabaseBackup();
  await backup.connect('main_app.db');
  
  // Create some test data
  const db = new UniversalSQLite();
  await db.connect('main_app.db');
  
  await db.createTable('posts', {
    id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
    title: 'TEXT NOT NULL',
    content: 'TEXT',
    author_id: 'INTEGER'
  });
  
  await db.insert('posts', { title: 'First Post', content: 'Hello World!', author_id: 1 });
  await db.insert('posts', { title: 'Second Post', content: 'More content', author_id: 2 });
  
  // Create backup
  const backupSQL = await backup.createBackup();
  console.log('Backup created, size:', backupSQL.length, 'characters');
  
  // Test restore (to new database)
  const restoreDb = new UniversalSQLite();
  await restoreDb.connect(':memory:');
  
  const restoreBackup = new DatabaseBackup();
  await restoreBackup.connect(':memory:');
  await restoreBackup.restoreFromBackup(backupSQL);
  
  // Verify restore
  const restoredData = await restoreDb.select('posts');
  console.log('Restored data:', restoredData.rows);
  
  await db.close();
  await restoreDb.close();
  await backup.close();
  await restoreBackup.close();
}

backupExample();
```

## 🌐 Production Deployment

### Environment Variables

```typescript
// config.ts
interface DatabaseConfig {
  path: string;
  backupInterval?: number;
  maxConnections?: number;
  enableWAL?: boolean;
}

function getDatabaseConfig(): DatabaseConfig {
  const env = process.env.NODE_ENV || 'development';
  
  const configs: Record<string, DatabaseConfig> = {
    development: {
      path: './dev_database.db',
      backupInterval: 60, // 1 hour
      enableWAL: true
    },
    test: {
      path: ':memory:',
      enableWAL: false
    },
    production: {
      path: process.env.DATABASE_PATH || './prod_database.db',
      backupInterval: 15, // 15 minutes
      maxConnections: 10,
      enableWAL: true
    }
  };
  
  return configs[env] || configs.development;
}

// app.ts
async function productionSetup() {
  const config = getDatabaseConfig();
  const db = new UniversalSQLite();
  
  await db.connect(config.path);
  
  if (config.enableWAL) {
    await db.query('PRAGMA journal_mode = WAL');
    await db.query('PRAGMA synchronous = NORMAL');
    await db.query('PRAGMA cache_size = 10000');
    await db.query('PRAGMA temp_store = memory');
  }
  
  // Setup production tables
  await setupProductionSchema(db);
  
  // Setup monitoring
  if (process.env.NODE_ENV === 'production') {
    setupProductionMonitoring(db);
  }
  
  return db;
}

async function setupProductionSchema(db: UniversalSQLite) {
  // Users table với full audit trail
  await db.createTable('users', {
    id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
    email: 'TEXT UNIQUE NOT NULL',
    password_hash: 'TEXT NOT NULL',
    status: 'TEXT DEFAULT "active" CHECK(status IN ("active", "inactive", "suspended"))',
    created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
    updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
    last_login: 'DATETIME'
  });
  
  // Indexes for performance
  await db.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login)');
  
  // Trigger for updated_at
  await db.query(`
    CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
    AFTER UPDATE ON users 
    FOR EACH ROW 
    BEGIN
      UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END
  `);
}

function setupProductionMonitoring(db: UniversalSQLite) {
  // Monitor database size
  setInterval(async () => {
    const sizeInfo = await db.query('PRAGMA page_count; PRAGMA page_size;');
    const pages = sizeInfo.rows[0].page_count;
    const pageSize = sizeInfo.rows[1].page_size;
    const sizeBytes = pages * pageSize;
    const sizeMB = (sizeBytes / 1024 / 1024).toFixed(2);
    
    console.log(`Database size: ${sizeMB} MB`);
    
    if (sizeBytes > 500 * 1024 * 1024) { // 500MB warning
      console.warn('Database size exceeds 500MB, consider archiving old data');
    }
  }, 300000); // Check every 5 minutes
  
  // Monitor query performance
  setInterval(async () => {
    const longQueries = await db.query(`
      SELECT * FROM pragma_stats 
      WHERE name LIKE '%time%'
    `);
    
    // Log slow queries for optimization
    console.log('Database stats:', longQueries.rows);
  }, 600000); // Check every 10 minutes
}

productionSetup();
```

## 📖 API Reference

### Core Types

```typescript
interface SQLiteRow {
  [key: string]: any;
}

interface SQLiteResult {
  rows: SQLiteRow[];           // Dữ liệu trả về
  rowsAffected: number;        // Số dòng bị ảnh hưởng
  lastInsertRowId?: number;    // ID của record mới insert
}

interface SQLiteConnection {
  execute(sql: string, params?: any[]): Promise<SQLiteResult>;
  close(): Promise<void>;
}

interface SQLiteConfig {
  path: string;              // Đường dẫn database
  timeout?: number;          // Timeout kết nối
  busyTimeout?: number;      // Timeout khi database busy
}
```

### Error Codes

| Error | Description | Solution |
|-------|-------------|----------|
| `No supported SQLite adapter found` | Không tìm thấy adapter phù hợp | Cài đặt SQLite dependencies cho môi trường |
| `Database connection not available` | Chưa kết nối database | Gọi `connect()` trước khi query |
| `SQLite error: no such table` | Bảng không tồn tại | Tạo bảng bằng `createTable()` hoặc SQL |
| `UNIQUE constraint failed` | Vi phạm ràng buộc unique | Kiểm tra dữ liệu trước khi insert |
| `database is locked` | Database đang bị khóa | Retry sau một khoảng thời gian |

## 🤝 Contributing

### Development Setup

```bash
# Clone repository
git clone https://github.com/cuongdqpayment/dqcai-sqlite
cd sqlite

# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Test in different environments
npm run test:node
npm run test:browser
npm run test:deno
npm run test:bun
```

### Testing New Adapters

```typescript
// tests/adapter-test.ts
import { SQLiteAdapter } from '../src/types';

export async function testAdapter(adapter: SQLiteAdapter, testDbPath: string) {
  console.log(`Testing adapter: ${adapter.constructor.name}`);
  
  // Test 1: Support detection
  console.log(`✓ isSupported(): ${adapter.isSupported()}`);
  
  if (!adapter.isSupported()) {
    console.log('❌ Adapter not supported in current environment');
    return;
  }
  
  try {
    // Test 2: Connection
    const connection = await adapter.connect(testDbPath);
    console.log('✓ Connection established');
    
    // Test 3: Table creation
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS test_table (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        value INTEGER
      )
    `);
    console.log('✓ Table created');
    
    // Test 4: Insert
    const insertResult = await connection.execute(
      'INSERT INTO test_table (name, value) VALUES (?, ?)',
      ['Test Item', 42]
    );
    console.log('✓ Insert successful, ID:', insertResult.lastInsertRowId);
    
    // Test 5: Select
    const selectResult = await connection.execute('SELECT * FROM test_table');
    console.log('✓ Select successful, rows:', selectResult.rows.length);
    
    // Test 6: Update
    const updateResult = await connection.execute(
      'UPDATE test_table SET value = ? WHERE id = ?',
      [100, insertResult.lastInsertRowId]
    );
    console.log('✓ Update successful, affected:', updateResult.rowsAffected);
    
    // Test 7: Delete
    const deleteResult = await connection.execute(
      'DELETE FROM test_table WHERE id = ?',
      [insertResult.lastInsertRowId]
    );
    console.log('✓ Delete successful, affected:', deleteResult.rowsAffected);
    
    // Test 8: Close
    await connection.close();
    console.log('✓ Connection closed');
    
    console.log(`🎉 All tests passed for ${adapter.constructor.name}`);
    
  } catch (error) {
    console.error(`❌ Test failed:`, error);
  }
}
```

## 📄 License

MIT License - see LICENSE file for details.

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
- [NPM Package](https://www.npmjs.com/package/@dqcai/sqlite)

---

**Universal SQLite** - One library, all platforms! 🚀