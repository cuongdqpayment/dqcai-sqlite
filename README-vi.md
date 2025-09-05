# @dqcai/sqlite - A Universal SQLite Library (@dqcai/sqlite v2.0.1)

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
- **DatabaseManager**: Quản lý kết nối, schema và vai trò người dùng
- **BaseService**: Lớp cơ sở cho CRUD operations

## Installation

Cài đặt qua npm hoặc yarn:

```bash
npm install @dqcai/sqlite@2.0.0
# hoặc
yarn add @dqcai/sqlite@2.0.0
```

Đối với React Native, đảm bảo cài đặt các dependencies cần thiết cho adapter (nếu sử dụng adapter cụ thể như react-native-sqlite-storage).

## Cài đặt

```bash
npm install @dqcai/sqlite
```

## 1. Cấu hình Schema Database

Trước tiên, định nghĩa schema cho cơ sở dữ liệu:

```typescript
import { DatabaseSchema } from '@dqcai/sqlite';

// Schema cho database users
const userSchema: DatabaseSchema = {
  version: "1.0.0",
  database_name: "users",
  description: "User management database",
  schemas: {
    users: {
      description: "User table",
      cols: [
        {
          name: "id",
          type: "integer",
          primary_key: true,
          auto_increment: true,
          nullable: false
        },
        {
          name: "username",
          type: "varchar",
          nullable: false,
          unique: true,
          length: 50
        },
        {
          name: "email",
          type: "varchar",
          nullable: false,
          unique: true,
          length: 100
        },
        {
          name: "password",
          type: "varchar",
          nullable: false,
          length: 255
        },
        {
          name: "created_at",
          type: "datetime",
          nullable: false,
          default: "CURRENT_TIMESTAMP"
        },
        {
          name: "updated_at",
          type: "datetime",
          nullable: true
        }
      ],
      indexes: [
        {
          name: "idx_username",
          columns: ["username"],
          unique: true
        },
        {
          name: "idx_email", 
          columns: ["email"],
          unique: true
        }
      ]
    },
    profiles: {
      description: "User profiles table",
      cols: [
        {
          name: "id",
          type: "integer",
          primary_key: true,
          auto_increment: true
        },
        {
          name: "user_id",
          type: "integer",
          nullable: false
        },
        {
          name: "first_name",
          type: "varchar",
          length: 50
        },
        {
          name: "last_name",
          type: "varchar", 
          length: 50
        },
        {
          name: "phone",
          type: "varchar",
          length: 20
        },
        {
          name: "address",
          type: "text"
        }
      ],
      foreign_keys: [
        {
          name: "fk_profile_user",
          column: "user_id",
          references: {
            table: "users",
            column: "id"
          },
          on_delete: "CASCADE",
          on_update: "CASCADE"
        }
      ]
    }
  }
};

// Schema core cho hệ thống
const coreSchema: DatabaseSchema = {
  version: "1.0.0",
  database_name: "core",
  description: "Core system database",
  schemas: {
    settings: {
      description: "System settings",
      cols: [
        {
          name: "key",
          type: "varchar",
          primary_key: true,
          length: 100
        },
        {
          name: "value",
          type: "text"
        },
        {
          name: "description",
          type: "text"
        }
      ]
    }
  }
};
```

## 2. Setup cho React Native

### Cài đặt dependencies

```bash
npm install react-native-sqlite-2
# Hoặc
npm install react-native-sqlite-storage
```

### Tạo Adapter cho React Native

```typescript
// adapters/ReactNativeAdapter.ts
import { BaseAdapter } from '@dqcai/sqlite';
import SQLite from 'react-native-sqlite-2';

export class ReactNativeAdapter extends BaseAdapter {
  isSupported(): boolean {
    return typeof SQLite !== 'undefined';
  }

  async connect(path: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const db = SQLite.openDatabase(
        path,
        '1.0',
        'Database',
        200000,
        () => {
          resolve(new ReactNativeConnection(db));
        },
        (error) => {
          reject(error);
        }
      );
    });
  }
}

class ReactNativeConnection {
  constructor(private db: any) {}

  async execute(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.transaction((tx: any) => {
        tx.executeSql(
          sql,
          params,
          (tx: any, results: any) => {
            const rows: any[] = [];
            for (let i = 0; i < results.rows.length; i++) {
              rows.push(results.rows.item(i));
            }
            resolve({
              rows,
              rowsAffected: results.rowsAffected,
              lastInsertRowId: results.insertId
            });
          },
          (tx: any, error: any) => {
            reject(error);
          }
        );
      });
    });
  }

  async close(): Promise<void> {
    // React Native SQLite không cần close thủ công
    return Promise.resolve();
  }
}
```

### Khởi tạo DatabaseManager (React Native)

```typescript
// services/DatabaseService.ts
import { DatabaseManager, DatabaseFactory } from '@dqcai/sqlite';
import { ReactNativeAdapter } from '../adapters/ReactNativeAdapter';

export class DatabaseService {
  private static isInitialized = false;

  static async initialize() {
    if (this.isInitialized) return;

    // Đăng ký adapter
    DatabaseFactory.registerAdapter(new ReactNativeAdapter());

    // Đăng ký schemas
    DatabaseManager.registerSchemas({
      core: coreSchema,
      users: userSchema
    });

    // Đăng ký roles
    DatabaseManager.registerRoles([
      {
        roleName: 'admin',
        requiredDatabases: ['core', 'users'],
        priority: 1
      },
      {
        roleName: 'user',
        requiredDatabases: ['core'],
        optionalDatabases: ['users'],
        priority: 2
      }
    ]);

    // Khởi tạo core database
    await DatabaseManager.initializeCoreConnection();

    this.isInitialized = true;
    console.log('DatabaseService initialized for React Native');
  }

  static async setUserRole(roles: string[]) {
    await DatabaseManager.setCurrentUserRoles(roles);
  }

  static getConnection(dbKey: string) {
    return DatabaseManager.get(dbKey);
  }

  static async closeAll() {
    await DatabaseManager.closeAll();
    this.isInitialized = false;
  }
}
```

## 3. Setup cho Node.js

### Cài đặt dependencies

```bash
npm install sqlite3
# Hoặc 
npm install better-sqlite3
```

### Tạo Adapter cho Node.js

```typescript
// adapters/NodeAdapter.ts
import { BaseAdapter } from '@dqcai/sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

export class NodeAdapter extends BaseAdapter {
  isSupported(): boolean {
    return typeof process !== 'undefined' && process.versions?.node;
  }

  async connect(dbPath: string): Promise<any> {
    const fullPath = path.resolve(dbPath);
    
    // Tạo thư mục nếu chưa tồn tại
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(fullPath, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(new NodeConnection(db));
        }
      });
    });
  }
}

class NodeConnection {
  constructor(private db: sqlite3.Database) {}

  async execute(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      const isSelect = sql.trim().toUpperCase().startsWith('SELECT');
      
      if (isSelect) {
        this.db.all(sql, params, (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve({
              rows: rows || [],
              rowsAffected: 0
            });
          }
        });
      } else {
        this.db.run(sql, params, function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({
              rows: [],
              rowsAffected: this.changes,
              lastInsertRowId: this.lastID
            });
          }
        });
      }
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}
```

### Khởi tạo DatabaseManager (Node.js)

```typescript
// services/DatabaseService.ts
import { DatabaseManager, DatabaseFactory } from '@dqcai/sqlite';
import { NodeAdapter } from '../adapters/NodeAdapter';
import path from 'path';

export class DatabaseService {
  private static isInitialized = false;
  private static dbDirectory = './databases';

  static async initialize() {
    if (this.isInitialized) return;

    // Đăng ký adapter
    DatabaseFactory.registerAdapter(new NodeAdapter());

    // Đăng ký schemas
    DatabaseManager.registerSchemas({
      core: coreSchema,
      users: userSchema
    });

    // Đăng ký roles
    DatabaseManager.registerRoles([
      {
        roleName: 'admin',
        requiredDatabases: ['core', 'users'],
        priority: 1
      },
      {
        roleName: 'user', 
        requiredDatabases: ['core'],
        optionalDatabases: ['users'],
        priority: 2
      }
    ]);

    // Khởi tạo core database
    await DatabaseManager.initializeCoreConnection();

    this.isInitialized = true;
    console.log('DatabaseService initialized for Node.js');
  }

  static async setUserRole(roles: string[]) {
    await DatabaseManager.setCurrentUserRoles(roles);
  }

  static getConnection(dbKey: string) {
    return DatabaseManager.get(dbKey);
  }

  static async closeAll() {
    await DatabaseManager.closeAll();
    this.isInitialized = false;
  }
}
```

## 4. Tạo Services với BaseService

### User Service

```typescript
// services/UserService.ts
import { BaseService } from '@dqcai/sqlite';

interface User {
  id?: number;
  username: string;
  email: string;
  password: string;
  created_at?: string;
  updated_at?: string;
}

interface Profile {
  id?: number;
  user_id: number;
  first_name?: string;
  last_name?: string;
  phone?: string;
  address?: string;
}

export class UserService extends BaseService<User> {
  constructor() {
    super('users', 'users'); // schema name, table name
    this.setPrimaryKeyFields(['id']);
  }

  // Tạo user mới
  async createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User | null> {
    try {
      // Kiểm tra email đã tồn tại chưa
      const existingUser = await this.findFirst({ email: userData.email });
      if (existingUser) {
        throw new Error('Email already exists');
      }

      // Kiểm tra username đã tồn tại chưa  
      const existingUsername = await this.findFirst({ username: userData.username });
      if (existingUsername) {
        throw new Error('Username already exists');
      }

      const newUser = await this.create({
        ...userData,
        created_at: new Date().toISOString()
      });

      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Cập nhật user
  async updateUser(id: number, userData: Partial<User>): Promise<User | null> {
    try {
      const updatedUser = await this.update(id, {
        ...userData,
        updated_at: new Date().toISOString()
      });
      return updatedUser;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // Tìm user theo email
  async findByEmail(email: string): Promise<User | null> {
    return await this.findFirst({ email });
  }

  // Tìm user theo username
  async findByUsername(username: string): Promise<User | null> {
    return await this.findFirst({ username });
  }

  // Lấy tất cả users với phân trang
  async getAllUsers(page: number = 1, limit: number = 10): Promise<User[]> {
    const offset = (page - 1) * limit;
    return await this.findAll({}, {
      orderBy: [{ name: 'created_at', direction: 'DESC' }],
      limit,
      offset
    });
  }

  // Xóa user (soft delete bằng cách cập nhật trường deleted_at)
  async softDeleteUser(id: number): Promise<boolean> {
    const result = await this.update(id, {
      updated_at: new Date().toISOString(),
      // deleted_at: new Date().toISOString() // nếu có field này trong schema
    });
    return result !== null;
  }

  // Đếm tổng số users
  async getTotalUsers(): Promise<number> {
    return await this.count();
  }

  // Tìm kiếm users
  async searchUsers(searchTerm: string): Promise<User[]> {
    const dao = await this.init().then(() => this.dao!);
    const sql = `
      SELECT * FROM users 
      WHERE username LIKE ? OR email LIKE ?
      ORDER BY created_at DESC
    `;
    const params = [`%${searchTerm}%`, `%${searchTerm}%`];
    const result = await dao.execute(sql, params);
    return result.rows as User[];
  }
}

export class ProfileService extends BaseService<Profile> {
  constructor() {
    super('users', 'profiles');
    this.setPrimaryKeyFields(['id']);
  }

  // Tạo profile cho user
  async createProfile(profileData: Omit<Profile, 'id'>): Promise<Profile | null> {
    return await this.create(profileData);
  }

  // Lấy profile theo user_id
  async getProfileByUserId(userId: number): Promise<Profile | null> {
    return await this.findFirst({ user_id: userId });
  }

  // Cập nhật profile
  async updateProfile(id: number, profileData: Partial<Profile>): Promise<Profile | null> {
    return await this.update(id, profileData);
  }

  // Lấy thông tin user và profile
  async getUserWithProfile(userId: number): Promise<any> {
    const dao = await this.init().then(() => this.dao!);
    const sql = `
      SELECT 
        u.id, u.username, u.email, u.created_at,
        p.first_name, p.last_name, p.phone, p.address
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE u.id = ?
    `;
    const result = await dao.execute(sql, [userId]);
    return result.rows[0] || null;
  }
}
```

### Core Service

```typescript
// services/CoreService.ts
import { BaseService } from '@dqcai/sqlite';

interface Setting {
  key: string;
  value: string;
  description?: string;
}

export class SettingsService extends BaseService<Setting> {
  constructor() {
    super('core', 'settings');
    this.setPrimaryKeyFields(['key']);
  }

  // Lấy giá trị setting
  async getSetting(key: string): Promise<string | null> {
    const setting = await this.findById(key);
    return setting?.value || null;
  }

  // Đặt giá trị setting
  async setSetting(key: string, value: string, description?: string): Promise<void> {
    const existing = await this.findById(key);
    
    if (existing) {
      await this.update(key, { value, description });
    } else {
      await this.create({ key, value, description });
    }
  }

  // Lấy tất cả settings
  async getAllSettings(): Promise<Setting[]> {
    return await this.findAll({}, {
      orderBy: [{ name: 'key', direction: 'ASC' }]
    });
  }

  // Xóa setting
  async deleteSetting(key: string): Promise<boolean> {
    return await this.delete(key);
  }

  // Lấy nhiều settings cùng lúc
  async getMultipleSettings(keys: string[]): Promise<Record<string, string>> {
    const dao = await this.init().then(() => this.dao!);
    const placeholders = keys.map(() => '?').join(',');
    const sql = `SELECT key, value FROM settings WHERE key IN (${placeholders})`;
    const result = await dao.execute(sql, keys);
    
    const settings: Record<string, string> = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    
    return settings;
  }
}
```

## 5. Sử dụng trong ứng dụng

### Trong React Native

```typescript
// App.tsx hoặc index.js
import React, { useEffect, useState } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import { DatabaseService } from './services/DatabaseService';
import { UserService, ProfileService } from './services/UserService';
import { SettingsService } from './services/CoreService';

const App = () => {
  const [isDbReady, setIsDbReady] = useState(false);
  const [userService] = useState(new UserService());
  const [profileService] = useState(new ProfileService());
  const [settingsService] = useState(new SettingsService());

  useEffect(() => {
    initializeDatabase();
    
    return () => {
      // Cleanup khi component unmount
      DatabaseService.closeAll();
    };
  }, []);

  const initializeDatabase = async () => {
    try {
      // Khởi tạo database
      await DatabaseService.initialize();
      
      // Đặt role cho user hiện tại
      await DatabaseService.setUserRole(['user']);
      
      // Khởi tạo services
      await userService.init();
      await profileService.init();
      await settingsService.init();
      
      setIsDbReady(true);
      console.log('Database ready!');
    } catch (error) {
      console.error('Database initialization failed:', error);
      Alert.alert('Error', 'Failed to initialize database');
    }
  };

  const handleCreateUser = async () => {
    if (!isDbReady) return;

    try {
      const newUser = await userService.createUser({
        username: 'john_doe',
        email: 'john@example.com',
        password: 'hashed_password'
      });

      if (newUser) {
        // Tạo profile cho user
        await profileService.createProfile({
          user_id: newUser.id!,
          first_name: 'John',
          last_name: 'Doe',
          phone: '+1234567890'
        });

        Alert.alert('Success', 'User created successfully');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      Alert.alert('Error', 'Failed to create user');
    }
  };

  const handleGetAllUsers = async () => {
    if (!isDbReady) return;

    try {
      const users = await userService.getAllUsers(1, 10);
      console.log('Users:', users);
      Alert.alert('Users', `Found ${users.length} users`);
    } catch (error) {
      console.error('Error getting users:', error);
    }
  };

  const handleSetSetting = async () => {
    if (!isDbReady) return;

    try {
      await settingsService.setSetting(
        'app_version',
        '1.0.0',
        'Current app version'
      );
      
      const version = await settingsService.getSetting('app_version');
      Alert.alert('Setting', `App version: ${version}`);
    } catch (error) {
      console.error('Error setting value:', error);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
      <Text>Database Status: {isDbReady ? 'Ready' : 'Initializing...'}</Text>
      
      <Button
        title="Create User"
        onPress={handleCreateUser}
        disabled={!isDbReady}
      />
      
      <Button
        title="Get All Users"
        onPress={handleGetAllUsers}
        disabled={!isDbReady}
      />
      
      <Button
        title="Set App Setting"
        onPress={handleSetSetting}
        disabled={!isDbReady}
      />
    </View>
  );
};

export default App;
```

### Trong Node.js

```typescript
// app.ts
import express from 'express';
import { DatabaseService } from './services/DatabaseService';
import { UserService, ProfileService } from './services/UserService';
import { SettingsService } from './services/CoreService';

const app = express();
app.use(express.json());

// Services
const userService = new UserService();
const profileService = new ProfileService();
const settingsService = new SettingsService();

// Khởi tạo database khi start server
async function initializeApp() {
  try {
    console.log('Initializing database...');
    
    // Khởi tạo DatabaseService
    await DatabaseService.initialize();
    
    // Set role admin cho server
    await DatabaseService.setUserRole(['admin']);
    
    // Khởi tạo services
    await userService.init();
    await profileService.init();
    await settingsService.init();
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

// API Routes

// POST /users - Tạo user mới
app.post('/users', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const user = await userService.createUser({
      username,
      email,
      password // Nên hash password trước khi lưu
    });

    res.status(201).json({ success: true, user });
  } catch (error: any) {
    console.error('Error creating user:', error);
    res.status(400).json({ error: error.message });
  }
});

// GET /users - Lấy danh sách users
app.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const users = await userService.getAllUsers(page, limit);
    const total = await userService.getTotalUsers();
    
    res.json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /users/:id - Lấy user theo ID
app.get('/users/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const user = await userService.findById(id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ success: true, user });
  } catch (error: any) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /users/:id - Cập nhật user
app.put('/users/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates = req.body;
    
    const user = await userService.updateUser(id, updates);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ success: true, user });
  } catch (error: any) {
    console.error('Error updating user:', error);
    res.status(400).json({ error: error.message });
  }
});

// DELETE /users/:id - Xóa user
app.delete('/users/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const success = await userService.delete(id);
    
    if (!success) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ success: true, message: 'User deleted' });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /users/:id/profile - Tạo profile cho user
app.post('/users/:id/profile', async (req, res) => {
  try {
    const user_id = parseInt(req.params.id);
    const profileData = { ...req.body, user_id };
    
    const profile = await profileService.createProfile(profileData);
    res.status(201).json({ success: true, profile });
  } catch (error: any) {
    console.error('Error creating profile:', error);
    res.status(400).json({ error: error.message });
  }
});

// GET /users/:id/full - Lấy user với profile
app.get('/users/:id/full', async (req, res) => {
  try {
    const user_id = parseInt(req.params.id);
    const userWithProfile = await profileService.getUserWithProfile(user_id);
    
    if (!userWithProfile) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ success: true, user: userWithProfile });
  } catch (error: any) {
    console.error('Error getting user with profile:', error);
    res.status(500).json({ error: error.message });
  }
});

// Settings API
app.get('/settings/:key', async (req, res) => {
  try {
    const value = await settingsService.getSetting(req.params.key);
    res.json({ success: true, value });
  } catch (error: any) {
    console.error('Error getting setting:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/settings', async (req, res) => {
  try {
    const { key, value, description } = req.body;
    await settingsService.setSetting(key, value, description);
    res.json({ success: true, message: 'Setting saved' });
  } catch (error: any) {
    console.error('Error setting value:', error);
    res.status(500).json({ error: error.message });
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  await DatabaseService.closeAll();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down server...');
  await DatabaseService.closeAll();
  process.exit(0);
});

// Start server
const PORT = process.env.PORT || 3000;

initializeApp().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
```

## 6. Quản lý Database với DatabaseManager

### Mở/Đóng Connections

```typescript
// DatabaseHelper.ts
import { DatabaseManager } from '@dqcai/sqlite';

export class DatabaseHelper {
  
  // Kiểm tra trạng thái kết nối
  static checkConnectionStatus(): void {
    const connections = DatabaseManager.getConnections();
    const count = DatabaseManager.getConnectionCount();
    const activeList = DatabaseManager.listConnections();
    
    console.log('Active connections:', count);
    console.log('Connection list:', activeList);
    console.log('Connection details:', connections);
  }

  // Đóng kết nối cụ thể
  static async closeSpecificConnection(dbKey: string): Promise<void> {
    try {
      await DatabaseManager.closeConnection(dbKey);
      console.log(`Connection ${dbKey} closed`);
    } catch (error) {
      console.error(`Error closing connection ${dbKey}:`, error);
    }
  }

  // Mở lại kết nối
  static async reopenConnection(dbKey: string): Promise<void> {
    try {
      const dao = await DatabaseManager.getLazyLoading(dbKey);
      console.log(`Connection ${dbKey} reopened`);
      return dao;
    } catch (error) {
      console.error(`Error reopening connection ${dbKey}:`, error);
      throw error;
    }
  }

  // Đảm bảo kết nối tồn tại
  static async ensureConnection(dbKey: string): Promise<void> {
    try {
      const dao = await DatabaseManager.ensureDatabaseConnection(dbKey);
      console.log(`Connection ${dbKey} ensured`);
      return dao;
    } catch (error) {
      console.error(`Error ensuring connection ${dbKey}:`, error);
      throw error;
    }
  }

  // Thực hiện transaction cross-schema
  static async executeTransactionAcrossSchemas(
    schemas: string[],
    operations: (daos: Record<string, any>) => Promise<void>
  ): Promise<void> {
    try {
      await DatabaseManager.executeCrossSchemaTransaction(schemas, operations);
      console.log('Cross-schema transaction completed successfully');
    } catch (error) {
      console.error('Cross-schema transaction failed:', error);
      throw error;
    }
  }

  // Event listeners cho reconnection
  static setupReconnectionHandlers(): void {
    DatabaseManager.onDatabaseReconnect('users', (dao) => {
      console.log('Users database reconnected');
      // Re-initialize services nếu cần
    });

    DatabaseManager.onDatabaseReconnect('core', (dao) => {
      console.log('Core database reconnected');
      // Re-initialize settings
    });
  }

  // Health check tất cả connections
  static async performHealthCheck(): Promise<void> {
    const connections = DatabaseManager.getConnections();
    
    for (const [dbKey, dao] of Object.entries(connections)) {
      try {
        await dao.execute('SELECT 1');
        console.log(`${dbKey}: Healthy`);
      } catch (error) {
        console.error(`${dbKey}: Unhealthy -`, error);
        
        // Thử reconnect nếu cần
        try {
          await DatabaseManager.ensureDatabaseConnection(dbKey);
          console.log(`${dbKey}: Reconnected successfully`);
        } catch (reconnectError) {
          console.error(`${dbKey}: Failed to reconnect -`, reconnectError);
        }
      }
    }
  }
}
```

## 7. Import/Export Dữ liệu

### Import từ CSV

```typescript
// services/DataImportService.ts
import { DatabaseManager, ImportResult, ColumnMapping } from '@dqcai/sqlite';

export class DataImportService {
  
  // Import users từ CSV
  static async importUsersFromCSV(csvData: string): Promise<ImportResult> {
    try {
      const result = await DatabaseManager.importFromCSV(
        'users', // database key
        'users', // table name
        csvData,
        {
          hasHeader: true,
          delimiter: ',',
          skipErrors: false,
          validateData: true,
          batchSize: 500,
          onProgress: (processed, total) => {
            console.log(`Import progress: ${processed}/${total}`);
          },
          onError: (error, rowIndex, rowData) => {
            console.error(`Row ${rowIndex} error:`, error, rowData);
          }
        }
      );

      console.log('Import completed:', {
        total: result.totalRows,
        success: result.successRows,
        errors: result.errorRows,
        time: result.executionTime
      });

      return result;
    } catch (error) {
      console.error('Import failed:', error);
      throw error;
    }
  }

  // Import với column mapping
  static async importUsersWithMapping(
    data: Record<string, any>[],
    columnMappings: ColumnMapping[]
  ): Promise<ImportResult> {
    try {
      const result = await DatabaseManager.importDataWithMapping(
        'users',
        'users', 
        data,
        columnMappings,
        {
          batchSize: 1000,
          skipErrors: true,
          updateOnConflict: true,
          conflictColumns: ['email']
        }
      );

      return result;
    } catch (error) {
      console.error('Import with mapping failed:', error);
      throw error;
    }
  }

  // Bulk import nhiều bảng cùng lúc
  static async bulkImportData(importConfigs: Array<{
    databaseKey: string;
    tableName: string;
    data: Record<string, any>[];
  }>): Promise<void> {
    try {
      const result = await DatabaseManager.bulkImport(importConfigs);
      
      console.log('Bulk import completed:', {
        totalDatabases: result.totalDatabases,
        successDatabases: result.successDatabases,
        executionTime: result.executionTime
      });

      // Log chi tiết từng bảng
      Object.entries(result.results).forEach(([key, importResult]) => {
        console.log(`${key}: ${importResult.successRows}/${importResult.totalRows} rows imported`);
      });

      // Log lỗi nếu có
      if (Object.keys(result.errors).length > 0) {
        console.error('Import errors:', result.errors);
      }

    } catch (error) {
      console.error('Bulk import failed:', error);
      throw error;
    }
  }
}

// Ví dụ sử dụng import service
async function exampleImportUsage() {
  // CSV data mẫu
  const csvData = `username,email,password,first_name,last_name
john_doe,john@example.com,password123,John,Doe
jane_smith,jane@example.com,password456,Jane,Smith
bob_wilson,bob@example.com,password789,Bob,Wilson`;

  try {
    // Import từ CSV
    const importResult = await DataImportService.importUsersFromCSV(csvData);
    console.log('CSV Import result:', importResult);

    // Import với column mapping
    const mappedData = [
      { user_name: 'alice', user_email: 'alice@test.com', pwd: 'pass123' },
      { user_name: 'charlie', user_email: 'charlie@test.com', pwd: 'pass456' }
    ];

    const columnMappings: ColumnMapping[] = [
      { sourceColumn: 'user_name', targetColumn: 'username' },
      { sourceColumn: 'user_email', targetColumn: 'email' },
      { 
        sourceColumn: 'pwd', 
        targetColumn: 'password',
        transform: (value) => `hashed_${value}` // Hash password
      }
    ];

    const mappingResult = await DataImportService.importUsersWithMapping(
      mappedData, 
      columnMappings
    );
    console.log('Mapping Import result:', mappingResult);

  } catch (error) {
    console.error('Import example failed:', error);
  }
}
```

### Export dữ liệu

```typescript
// services/DataExportService.ts
import { DatabaseManager } from '@dqcai/sqlite';

export class DataExportService {
  
  // Export users ra CSV
  static async exportUsersToCSV(): Promise<string> {
    try {
      const dao = DatabaseManager.get('users');
      const sql = `
        SELECT u.username, u.email, u.created_at,
               p.first_name, p.last_name, p.phone
        FROM users u
        LEFT JOIN profiles p ON u.id = p.user_id
        ORDER BY u.created_at DESC
      `;
      
      const result = await dao.execute(sql);
      
      if (result.rows.length === 0) {
        return 'No data to export';
      }

      // Tạo CSV header
      const headers = Object.keys(result.rows[0]);
      let csvContent = headers.join(',') + '\n';

      // Thêm data rows
      result.rows.forEach(row => {
        const values = headers.map(header => {
          const value = row[header];
          // Escape quotes và wrap trong quotes nếu chứa comma
          if (value === null || value === undefined) {
            return '';
          }
          const stringValue = String(value);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        });
        csvContent += values.join(',') + '\n';
      });

      return csvContent;
    } catch (error) {
      console.error('Export to CSV failed:', error);
      throw error;
    }
  }

  // Export với điều kiện tùy chỉnh
  static async exportUsersWithConditions(
    whereClause?: string,
    params?: any[]
  ): Promise<Record<string, any>[]> {
    try {
      const dao = DatabaseManager.get('users');
      let sql = `
        SELECT u.*, p.first_name, p.last_name, p.phone, p.address
        FROM users u
        LEFT JOIN profiles p ON u.id = p.user_id
      `;
      
      if (whereClause) {
        sql += ` WHERE ${whereClause}`;
      }
      
      sql += ` ORDER BY u.created_at DESC`;

      const result = await dao.execute(sql, params || []);
      return result.rows;
    } catch (error) {
      console.error('Export with conditions failed:', error);
      throw error;
    }
  }

  // Export dữ liệu backup toàn bộ database
  static async createDatabaseBackup(dbKey: string): Promise<{
    tables: Record<string, any[]>;
    metadata: any;
  }> {
    try {
      const dao = DatabaseManager.get(dbKey);
      
      // Lấy danh sách tables
      const tablesResult = await dao.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      );
      
      const backup: Record<string, any[]> = {};
      
      // Export từng table
      for (const tableRow of tablesResult.rows) {
        const tableName = tableRow.name;
        const dataResult = await dao.execute(`SELECT * FROM ${tableName}`);
        backup[tableName] = dataResult.rows;
      }

      // Thêm metadata
      const dbInfo = await dao.getDatabaseInfo();
      
      return {
        tables: backup,
        metadata: {
          ...dbInfo,
          exportDate: new Date().toISOString(),
          version: await dao.getSchemaVersion()
        }
      };
    } catch (error) {
      console.error('Database backup failed:', error);
      throw error;
    }
  }
}

// Ví dụ sử dụng export
async function exampleExportUsage() {
  try {
    // Export users ra CSV
    const csvContent = await DataExportService.exportUsersToCSV();
    console.log('CSV Export:', csvContent);

    // Export users với điều kiện
    const recentUsers = await DataExportService.exportUsersWithConditions(
      "u.created_at > ?",
      [new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()] // 30 ngày gần đây
    );
    console.log('Recent users:', recentUsers);

    // Backup toàn bộ database users
    const backup = await DataExportService.createDatabaseBackup('users');
    console.log('Database backup:', backup);

  } catch (error) {
    console.error('Export example failed:', error);
  }
}
```

## 8. Best Practices & Tips

### Error Handling

```typescript
// utils/ErrorHandler.ts
export class DatabaseErrorHandler {
  
  static handleServiceError(error: any, context: string): void {
    console.error(`Database Error in ${context}:`, {
      message: error.message,
      stack: error.stack,
      code: error.code,
      timestamp: new Date().toISOString()
    });

    // Specific error handling
    if (error.message?.includes('UNIQUE constraint failed')) {
      throw new Error('Duplicate entry detected');
    } else if (error.message?.includes('database is locked')) {
      throw new Error('Database is busy, please try again');
    } else if (error.message?.includes('no such table')) {
      throw new Error('Database table not found');
    } else {
      throw new Error(`Database operation failed: ${error.message}`);
    }
  }

  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: any;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (i < maxRetries - 1) {
          console.log(`Operation failed, retrying in ${delay}ms... (${i + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
        }
      }
    }
    
    throw lastError;
  }
}

// Sử dụng error handler
class SafeUserService extends UserService {
  async createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User | null> {
    return DatabaseErrorHandler.withRetry(async () => {
      try {
        return await super.createUser(userData);
      } catch (error) {
        DatabaseErrorHandler.handleServiceError(error, 'createUser');
        throw error; // Re-throw sau khi handle
      }
    });
  }
}
```

### Performance Optimization

```typescript
// utils/PerformanceOptimizer.ts
export class PerformanceOptimizer {
  
  // Batch operations để giảm số lần gọi database
  static async batchCreateUsers(
    userService: UserService,
    users: Array<Omit<User, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<void> {
    const batchSize = 100;
    
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      await userService.executeTransaction(async () => {
        for (const userData of batch) {
          await userService.create({
            ...userData,
            created_at: new Date().toISOString()
          });
        }
      });
      
      console.log(`Processed batch ${Math.ceil((i + batchSize) / batchSize)}`);
    }
  }

  // Index optimization
  static async optimizeQueries(dao: any): Promise<void> {
    // Enable query optimization
    await dao.execute('PRAGMA optimize');
    
    // Analyze tables for better query planning
    await dao.execute('ANALYZE');
    
    // Set optimal cache size
    await dao.execute('PRAGMA cache_size = 10000');
    
    console.log('Database optimization completed');
  }

  // Connection pooling check
  static monitorConnections(): void {
    setInterval(() => {
      const count = DatabaseManager.getConnectionCount();
      const connections = DatabaseManager.listConnections();
      
      console.log(`Active connections: ${count}`, connections);
      
      if (count > 5) {
        console.warn('High number of database connections detected');
      }
    }, 30000); // Check every 30 seconds
  }
}
```

### Testing Utilities

```typescript
// utils/TestHelpers.ts
import { DatabaseManager } from '@dqcai/sqlite';

export class DatabaseTestHelpers {
  
  static async setupTestDatabase(): Promise<void> {
    // Use in-memory database for testing
    const testSchema = {
      ...userSchema,
      database_name: ':memory:'
    };
    
    DatabaseManager.registerSchema('test_users', testSchema);
    await DatabaseManager.initLazySchema(['test_users']);
  }

  static async cleanupTestData(service: any): Promise<void> {
    await service.truncate();
  }

  static async seedTestData(userService: UserService): Promise<User[]> {
    const testUsers = [
      { username: 'test1', email: 'test1@example.com', password: 'pass1' },
      { username: 'test2', email: 'test2@example.com', password: 'pass2' },
      { username: 'test3', email: 'test3@example.com', password: 'pass3' }
    ];

    const createdUsers: User[] = [];
    for (const userData of testUsers) {
      const user = await userService.createUser(userData);
      if (user) createdUsers.push(user);
    }

    return createdUsers;
  }
}

// Example test
describe('UserService Tests', () => {
  let userService: UserService;

  beforeAll(async () => {
    await DatabaseTestHelpers.setupTestDatabase();
    userService = new UserService();
    await userService.init();
  });

  beforeEach(async () => {
    await DatabaseTestHelpers.cleanupTestData(userService);
  });

  afterAll(async () => {
    await DatabaseManager.closeAll();
  });

  test('should create user successfully', async () => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    };

    const user = await userService.createUser(userData);
    expect(user).toBeTruthy();
    expect(user?.username).toBe(userData.username);
    expect(user?.email).toBe(userData.email);
  });
});
```

## 9. Troubleshooting Common Issues

### Database Locked

```typescript
// Giải quyết database locked
const handleDatabaseLocked = async () => {
  try {
    // Enable WAL mode để tránh lock
    const dao = DatabaseManager.get('users');
    await dao.execute('PRAGMA journal_mode = WAL');
    await dao.execute('PRAGMA busy_timeout = 30000'); // 30 giây timeout
  } catch (error) {
    console.error('Error setting WAL mode:', error);
  }
};
```

### Connection Issues

```typescript
// Kiểm tra và khôi phục kết nối
const ensureConnectionHealth = async (dbKey: string) => {
  try {
    const dao = DatabaseManager.get(dbKey);
    await dao.execute('SELECT 1');
  } catch (error) {
    console.log(`Connection ${dbKey} unhealthy, reconnecting...`);
    await DatabaseManager.closeConnection(dbKey);
    await DatabaseManager.getLazyLoading(dbKey);
    console.log(`Connection ${dbKey} restored`);
  }
};
```

## 10. Migration & Schema Updates

```typescript
// migrations/001_add_user_status.ts
import { UniversalDAO } from '@dqcai/sqlite';

export const migration_001 = {
  version: '1.0.1',
  description: 'Add status column to users table',
  
  async up(dao: UniversalDAO): Promise<void> {
    await dao.execute(`
      ALTER TABLE users 
      ADD COLUMN status VARCHAR(20) DEFAULT 'active'
    `);
    
    await dao.execute(`
      CREATE INDEX idx_user_status ON users(status)
    `);
  },
  
  async down(dao: UniversalDAO): Promise<void> {
    await dao.execute(`
      DROP INDEX IF EXISTS idx_user_status
    `);
    
    // SQLite không hỗ trợ DROP COLUMN, cần recreate table
    await dao.execute(`
      CREATE TABLE users_backup AS 
      SELECT id, username, email, password, created_at, updated_at 
      FROM users
    `);
    
    await dao.execute(`DROP TABLE users`);
    
    await dao.execute(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME
      )
    `);
    
    await dao.execute(`
      INSERT INTO users SELECT * FROM users_backup
    `);
    
    await dao.execute(`DROP TABLE users_backup`);
  }
};

// Chạy migration
const runMigration = async () => {
  const dao = DatabaseManager.get('users');
  const currentVersion = await dao.getSchemaVersion();
  
  if (currentVersion < '1.0.1') {
    await migration_001.up(dao);
    await dao.setSchemaVersion('1.0.1');
    console.log('Migration 001 completed');
  }
};
```

## Kết luận

Universal SQLite cung cấp một giải pháp mạnh mẽ và linh hoạt để quản lý cơ sở dữ liệu SQLite across platforms. Với DatabaseManager và BaseService, bạn có thể:

- Dễ dàng quản lý nhiều database connections
- Thực hiện CRUD operations một cách type-safe
- Import/Export dữ liệu hiệu quả
- Quản lý schema và migrations
- Handle errors và performance optimization

Thư viện hỗ trợ tốt cho cả React Native và Node.js, giúp bạn xây dựng ứng dụng database-driven một cách nhất quán và maintainable.

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
