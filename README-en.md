# @dqcai/sqlite - A Universal SQLite Library (@dqcai/sqlite v2.1.x)

![Universal SQLite](https://img.shields.io/badge/SQLite-Universal-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)
![Cross Platform](https://img.shields.io/badge/Platform-Universal-green)

UniversalSQLite is a comprehensive, cross-platform SQLite library designed to work seamlessly across environments like Browser, Node.js, Deno, Bun, and React Native. The library provides a unified interface for managing SQLite databases, including schema creation, CRUD operations, advanced queries, migrations, data import/export, transaction management, and service lifecycle management. It uses the DAO (Data Access Object) pattern to separate data access logic, supports role-based access control, and integrates easily with various frameworks.

## Features

- **Cross-Platform Support**: Works on Browser, Node.js, Deno, Bun, React Native (iOS/Android/Windows).
- **Schema-Based Management**: Create and manage databases from JSON schemas.
- **DAO Pattern**: UniversalDAO for CRUD operations, queries, and transactions.
- **Query Builder**: Build complex queries with join, where, group by, having, union, CTE.
- **Migration System**: Manage migrations with up/down scripts.
- **Data Import/Export**: Support import from CSV/JSON with mapping, validation, and export to CSV.
- **Role-Based Access**: Manage connections based on user roles.
- **Transaction Management**: Support single and cross-schema transactions.
- **Service Management**: Lifecycle management for service instances with ServiceManager.
- **Adapters**: Auto-detect environment, support custom adapter registration.
- **Type-Safe**: Full TypeScript types for schema, queries, and operations.
- **Utilities**: CSVImporter, MigrationManager, BaseService for service layer.
- **DatabaseManager**: Manage connections, schemas, and user roles.
- **BaseService**: Base class for CRUD operations with built-in optimization.

## Installation

Install via npm or yarn:

```bash
npm install @dqcai/sqlite@2.1.0
# or
yarn add @dqcai/sqlite@2.1.0
```

For React Native, ensure you install the necessary dependencies for the adapter (if using specific adapters like react-native-sqlite-storage).

## Quick Start

```bash
npm install @dqcai/sqlite
```

## 1. Database Schema Configuration

First, define the schema for your database:

```typescript
import { DatabaseSchema } from '@dqcai/sqlite';

// Schema for users database
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

// Core schema for system
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

## 2. Service Management with ServiceManager

### Service Configuration and Registration

The ServiceManager provides centralized lifecycle management for service instances:

```typescript
// services/ServiceRegistration.ts
import { ServiceManager, ServiceConfig } from '@dqcai/sqlite';
import { UserService, ProfileService } from './UserService';
import { SettingsService } from './CoreService';

export class ServiceRegistration {
  private static serviceManager = ServiceManager.getInstance();

  static registerAllServices(): void {
    const serviceConfigs: ServiceConfig[] = [
      // User services
      {
        schemaName: 'users',
        tableName: 'users',
        primaryKeyFields: ['id'],
        serviceClass: UserService
      },
      {
        schemaName: 'users',
        tableName: 'profiles',
        primaryKeyFields: ['id'],
        serviceClass: ProfileService
      },
      // Core services
      {
        schemaName: 'core',
        tableName: 'settings',
        primaryKeyFields: ['key'],
        serviceClass: SettingsService
      }
    ];

    // Register all services at once
    this.serviceManager.registerServices(serviceConfigs);
    
    console.log('All services registered successfully');
  }

  static async getService<T = BaseService>(
    schemaName: string, 
    tableName: string
  ): Promise<T> {
    const service = await this.serviceManager.getService(schemaName, tableName);
    return service as T;
  }

  static async initializeService<T = BaseService>(
    schemaName: string, 
    tableName: string
  ): Promise<T> {
    const service = await this.serviceManager.initializeService(schemaName, tableName);
    return service as T;
  }

  static async destroyService(schemaName: string, tableName: string): Promise<boolean> {
    return await this.serviceManager.destroyService(schemaName, tableName);
  }

  static async getHealthReport() {
    return await this.serviceManager.healthCheck();
  }

  static getServiceInfo() {
    return this.serviceManager.getAllServiceInfo();
  }
}
```

### Advanced Service Management

```typescript
// services/ServiceMonitor.ts
import { ServiceManager, ServiceManagerEvent } from '@dqcai/sqlite';

export class ServiceMonitor {
  private serviceManager = ServiceManager.getInstance();

  constructor() {
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Monitor service lifecycle events
    this.serviceManager.on('SERVICE_CREATED', this.onServiceCreated);
    this.serviceManager.on('SERVICE_DESTROYED', this.onServiceDestroyed);
    this.serviceManager.on('SERVICE_ERROR', this.onServiceError);
    this.serviceManager.on('HEALTH_CHECK_COMPLETED', this.onHealthCheckCompleted);
  }

  private onServiceCreated = (event: ServiceManagerEvent): void => {
    console.log(`Service created: ${event.serviceKey}`, {
      schema: event.schemaName,
      table: event.tableName,
      timestamp: event.timestamp
    });
  };

  private onServiceDestroyed = (event: ServiceManagerEvent): void => {
    console.log(`Service destroyed: ${event.serviceKey}`, {
      schema: event.schemaName,
      table: event.tableName,
      timestamp: event.timestamp
    });
  };

  private onServiceError = (event: ServiceManagerEvent): void => {
    console.error(`Service error in ${event.serviceKey}:`, {
      error: event.error?.message,
      schema: event.schemaName,
      table: event.tableName,
      timestamp: event.timestamp
    });
  };

  private onHealthCheckCompleted = (event: ServiceManagerEvent): void => {
    const report = event.data;
    console.log('Health check completed:', {
      totalServices: report.totalServices,
      healthyServices: report.healthyServices,
      unhealthyServices: report.unhealthyServices,
      overallHealth: report.overallHealth,
      timestamp: event.timestamp
    });

    // Alert if unhealthy services found
    if (!report.overallHealth) {
      console.warn('Unhealthy services detected!', report.services.filter(s => !s.healthy));
    }
  };

  // Periodic health monitoring
  async startPeriodicHealthCheck(intervalMs: number = 60000): Promise<void> {
    setInterval(async () => {
      try {
        await this.serviceManager.healthCheck();
      } catch (error) {
        console.error('Periodic health check failed:', error);
      }
    }, intervalMs);
  }

  // Get service statistics
  getServiceStats() {
    const infos = this.serviceManager.getAllServiceInfo();
    const schemas = this.serviceManager.getSchemas();
    
    return {
      totalServices: this.serviceManager.getServiceCount(),
      registeredServices: this.serviceManager.getRegisteredCount(),
      activeSchemas: schemas,
      serviceBreakdown: schemas.map(schema => ({
        schema,
        serviceCount: infos.filter(info => info.schemaName === schema).length
      })),
      recentlyAccessed: infos
        .filter(info => info.lastAccessed)
        .sort((a, b) => 
          new Date(b.lastAccessed!).getTime() - new Date(a.lastAccessed!).getTime()
        )
        .slice(0, 10)
    };
  }

  // Cleanup unused services
  async cleanupUnusedServices(schemaName?: string): Promise<void> {
    if (schemaName) {
      await this.serviceManager.destroyServicesBySchema(schemaName);
      console.log(`Cleaned up services for schema: ${schemaName}`);
    } else {
      // Custom cleanup logic based on access time
      const infos = this.serviceManager.getAllServiceInfo();
      const cutoffTime = Date.now() - (30 * 60 * 1000); // 30 minutes ago
      
      for (const info of infos) {
        if (info.lastAccessed) {
          const lastAccess = new Date(info.lastAccessed).getTime();
          if (lastAccess < cutoffTime) {
            await this.serviceManager.destroyService(info.schemaName, info.tableName);
            console.log(`Cleaned up unused service: ${info.key}`);
          }
        }
      }
    }
  }
}
```

## 3. Setup for React Native

### Install dependencies

```bash
npm install react-native-sqlite-2
# Or
npm install react-native-sqlite-storage
```

### Create Adapter for React Native

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
    // React Native SQLite doesn't need manual close
    return Promise.resolve();
  }
}
```

### Initialize DatabaseManager (React Native)

```typescript
// services/DatabaseService.ts
import { DatabaseManager, DatabaseFactory } from '@dqcai/sqlite';
import { ReactNativeAdapter } from '../adapters/ReactNativeAdapter';
import { ServiceRegistration } from './ServiceRegistration';

export class DatabaseService {
  private static isInitialized = false;

  static async initialize() {
    if (this.isInitialized) return;

    // Register adapter
    DatabaseFactory.registerAdapter(new ReactNativeAdapter());

    // Register schemas
    DatabaseManager.registerSchemas({
      core: coreSchema,
      users: userSchema
    });

    // Register roles
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

    // Initialize core database
    await DatabaseManager.initializeCoreConnection();

    // Register all services
    ServiceRegistration.registerAllServices();

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

## 4. Setup for Node.js

### Install dependencies

```bash
npm install sqlite3
# Or 
npm install better-sqlite3
```

### Create Adapter for Node.js

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
    
    // Create directory if it doesn't exist
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

### Initialize DatabaseManager (Node.js)

```typescript
// services/DatabaseService.ts
import { DatabaseManager, DatabaseFactory } from '@dqcai/sqlite';
import { NodeAdapter } from '../adapters/NodeAdapter';
import { ServiceRegistration } from './ServiceRegistration';
import path from 'path';

export class DatabaseService {
  private static isInitialized = false;
  private static dbDirectory = './databases';

  static async initialize() {
    if (this.isInitialized) return;

    // Register adapter
    DatabaseFactory.registerAdapter(new NodeAdapter());

    // Register schemas
    DatabaseManager.registerSchemas({
      core: coreSchema,
      users: userSchema
    });

    // Register roles
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

    // Initialize core database
    await DatabaseManager.initializeCoreConnection();

    // Register all services
    ServiceRegistration.registerAllServices();

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

## 5. Creating Services with BaseService

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
  constructor(schemaName?: string, tableName?: string) {
    super(schemaName || 'users', tableName || 'users');
    this.setPrimaryKeyFields(['id']);
  }

  // Create new user
  async createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User | null> {
    try {
      // Check if email already exists
      const existingUser = await this.findFirst({ email: userData.email });
      if (existingUser) {
        throw new Error('Email already exists');
      }

      // Check if username already exists  
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

  // Update user
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

  // Find user by email
  async findByEmail(email: string): Promise<User | null> {
    return await this.findFirst({ email });
  }

  // Find user by username
  async findByUsername(username: string): Promise<User | null> {
    return await this.findFirst({ username });
  }

  // Get all users with pagination
  async getAllUsers(page: number = 1, limit: number = 10): Promise<User[]> {
    const offset = (page - 1) * limit;
    return await this.findAll({}, {
      orderBy: [{ name: 'created_at', direction: 'DESC' }],
      limit,
      offset
    });
  }

  // Soft delete user
  async softDeleteUser(id: number): Promise<boolean> {
    const result = await this.update(id, {
      updated_at: new Date().toISOString(),
      // deleted_at: new Date().toISOString() // if this field exists in schema
    });
    return result !== null;
  }

  // Count total users
  async getTotalUsers(): Promise<number> {
    return await this.count();
  }

  // Search users
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
  constructor(schemaName?: string, tableName?: string) {
    super(schemaName || 'users', tableName || 'profiles');
    this.setPrimaryKeyFields(['id']);
  }

  // Create profile for user
  async createProfile(profileData: Omit<Profile, 'id'>): Promise<Profile | null> {
    return await this.create(profileData);
  }

  // Get profile by user_id
  async getProfileByUserId(userId: number): Promise<Profile | null> {
    return await this.findFirst({ user_id: userId });
  }

  // Update profile
  async updateProfile(id: number, profileData: Partial<Profile>): Promise<Profile | null> {
    return await this.update(id, profileData);
  }

  // Get user with profile
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
  constructor(schemaName?: string, tableName?: string) {
    super(schemaName || 'core', tableName || 'settings');
    this.setPrimaryKeyFields(['key']);
  }

  // Get setting value
  async getSetting(key: string): Promise<string | null> {
    const setting = await this.findById(key);
    return setting?.value || null;
  }

  // Set setting value
  async setSetting(key: string, value: string, description?: string): Promise<void> {
    const existing = await this.findById(key);
    
    if (existing) {
      await this.update(key, { value, description });
    } else {
      await this.create({ key, value, description });
    }
  }

  // Get all settings
  async getAllSettings(): Promise<Setting[]> {
    return await this.findAll({}, {
      orderBy: [{ name: 'key', direction: 'ASC' }]
    });
  }

  // Delete setting
  async deleteSetting(key: string): Promise<boolean> {
    return await this.delete(key);
  }

  // Get multiple settings at once
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

## 6. Using in Applications

### In React Native

```typescript
// App.tsx or index.js
import React, { useEffect, useState } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import { DatabaseService } from './services/DatabaseService';
import { ServiceRegistration } from './services/ServiceRegistration';
import { ServiceMonitor } from './services/ServiceMonitor';
import { UserService, ProfileService } from './services/UserService';
import { SettingsService } from './services/CoreService';

const App = () => {
  const [isDbReady, setIsDbReady] = useState(false);
  const [serviceMonitor] = useState(new ServiceMonitor());

  useEffect(() => {
    initializeDatabase();
    
    return () => {
      // Cleanup when component unmounts
      DatabaseService.closeAll();
    };
  }, []);

  const initializeDatabase = async () => {
    try {
      // Initialize database
      await DatabaseService.initialize();
      
      // Set role for current user
      await DatabaseService.setUserRole(['user']);
      
      // Start service monitoring
      await serviceMonitor.startPeriodicHealthCheck(60000); // Every minute
      
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
      const userService = await ServiceRegistration.getService<UserService>('users', 'users');
      const profileService = await ServiceRegistration.getService<ProfileService>('users', 'profiles');

      const newUser = await userService.createUser({
        username: 'john_doe',
        email: 'john@example.com',
        password: 'hashed_password'
      });

      if (newUser) {
        // Create profile for user
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
      const userService = await ServiceRegistration.getService<UserService>('users', 'users');
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
      const settingsService = await ServiceRegistration.getService<SettingsService>('core', 'settings');
      
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

  const handleGetServiceStats = async () => {
    if (!isDbReady) return;

    try {
      const stats = serviceMonitor.getServiceStats();
      const healthReport = await ServiceRegistration.getHealthReport();
      
      Alert.alert('Service Stats', 
        `Total: ${stats.totalServices}, Healthy: ${healthReport.healthyServices}/${healthReport.totalServices}`
      );
    } catch (error) {
      console.error('Error getting service stats:', error);
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
      
      <Button
        title="Get Service Stats"
        onPress={handleGetServiceStats}
        disabled={!isDbReady}
      />
    </View>
  );
};

export default App;
```

### In Node.js

```typescript
// app.ts
import express from 'express';
import { DatabaseService } from './services/DatabaseService';
import { ServiceRegistration } from './services/ServiceRegistration';
import { ServiceMonitor } from './services/ServiceMonitor';
import { UserService, ProfileService } from './services/UserService';
import { SettingsService } from './services/CoreService';

const app = express();
app.use(express.json());

// Service monitor
const serviceMonitor = new ServiceMonitor();

// Initialize database when starting server
async function initializeApp() {
  try {
    console.log('Initializing database...');
    
    // Initialize DatabaseService
    await DatabaseService.initialize();
    
    // Set admin role for server
    await DatabaseService.setUserRole(['admin']);
    
    // Start service monitoring
    await serviceMonitor.startPeriodicHealthCheck(60000); // Every minute
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

// API Routes

// POST /users - Create new user
app.post('/users', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userService = await ServiceRegistration.getService<UserService>('users', 'users');
    const user = await userService.createUser({
      username,
      email,
      password // Should hash password before saving
    });

    res.status(201).json({ success: true, user });
  } catch (error: any) {
    console.error('Error creating user:', error);
    res.status(400).json({ error: error.message });
  }
});

// GET /users - Get list of users
app.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const userService = await ServiceRegistration.getService<UserService>('users', 'users');
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

// GET /users/:id - Get user by ID
app.get('/users/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const userService = await ServiceRegistration.getService<UserService>('users', 'users');
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

// PUT /users/:id - Update user
app.put('/users/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates = req.body;
    
    const userService = await ServiceRegistration.getService<UserService>('users', 'users');
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

// DELETE /users/:id - Delete user
app.delete('/users/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const userService = await ServiceRegistration.getService<UserService>('users', 'users');
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

// POST /users/:id/profile - Create profile for user
app.post('/users/:id/profile', async (req, res) => {
  try {
    const user_id = parseInt(req.params.id);
    const profileData = { ...req.body, user_id };
    
    const profileService = await ServiceRegistration.getService<ProfileService>('users', 'profiles');
    const profile = await profileService.createProfile(profileData);
    res.status(201).json({ success: true, profile });
  } catch (error: any) {
    console.error('Error creating profile:', error);
    res.status(400).json({ error: error.message });
  }
});

// GET /users/:id/full - Get user with profile
app.get('/users/:id/full', async (req, res) => {
  try {
    const user_id = parseInt(req.params.id);
    const profileService = await ServiceRegistration.getService<ProfileService>('users', 'profiles');
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
    const settingsService = await ServiceRegistration.getService<SettingsService>('core', 'settings');
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
    const settingsService = await ServiceRegistration.getService<SettingsService>('core', 'settings');
    await settingsService.setSetting(key, value, description);
    res.json({ success: true, message: 'Setting saved' });
  } catch (error: any) {
    console.error('Error setting value:', error);
    res.status(500).json({ error: error.message });
  }
});

// Service management API
app.get('/admin/services', async (req, res) => {
  try {
    const serviceInfo = ServiceRegistration.getServiceInfo();
    const healthReport = await ServiceRegistration.getHealthReport();
    const stats = serviceMonitor.getServiceStats();
    
    res.json({
      success: true,
      services: serviceInfo,
      health: healthReport,
      stats
    });
  } catch (error: any) {
    console.error('Error getting service info:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/admin/services/cleanup/:schema?', async (req, res) => {
  try {
    const schema = req.params.schema;
    await serviceMonitor.cleanupUnusedServices(schema);
    res.json({ success: true, message: 'Cleanup completed' });
  } catch (error: any) {
    console.error('Error cleaning up services:', error);
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

## 7. Database Management with DatabaseManager

### Opening/Closing Connections

```typescript
// DatabaseHelper.ts
import { DatabaseManager } from '@dqcai/sqlite';

export class DatabaseHelper {
  
  // Check connection status
  static checkConnectionStatus(): void {
    const connections = DatabaseManager.getConnections();
    const count = DatabaseManager.getConnectionCount();
    const activeList = DatabaseManager.listConnections();
    
    console.log('Active connections:', count);
    console.log('Connection list:', activeList);
    console.log('Connection details:', connections);
  }

  // Close specific connection
  static async closeSpecificConnection(dbKey: string): Promise<void> {
    try {
      await DatabaseManager.closeConnection(dbKey);
      console.log(`Connection ${dbKey} closed`);
    } catch (error) {
      console.error(`Error closing connection ${dbKey}:`, error);
    }
  }

  // Reopen connection
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

  // Ensure connection exists
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

  // Execute cross-schema transaction
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

  // Event listeners for reconnection
  static setupReconnectionHandlers(): void {
    DatabaseManager.onDatabaseReconnect('users', (dao) => {
      console.log('Users database reconnected');
      // Re-initialize services if needed
    });

    DatabaseManager.onDatabaseReconnect('core', (dao) => {
      console.log('Core database reconnected');
      // Re-initialize settings
    });
  }

  // Health check all connections
  static async performHealthCheck(): Promise<void> {
    const connections = DatabaseManager.getConnections();
    
    for (const [dbKey, dao] of Object.entries(connections)) {
      try {
        await dao.execute('SELECT 1');
        console.log(`${dbKey}: Healthy`);
      } catch (error) {
        console.error(`${dbKey}: Unhealthy -`, error);
        
        // Try reconnect if needed
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

## 8. Data Import/Export

### Import from CSV

```typescript
// services/DataImportService.ts
import { DatabaseManager, ImportResult, ColumnMapping } from '@dqcai/sqlite';

export class DataImportService {
  
  // Import users from CSV
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

  // Import with column mapping
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

  // Bulk import multiple tables at once
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

      // Log details for each table
      Object.entries(result.results).forEach(([key, importResult]) => {
        console.log(`${key}: ${importResult.successRows}/${importResult.totalRows} rows imported`);
      });

      // Log errors if any
      if (Object.keys(result.errors).length > 0) {
        console.error('Import errors:', result.errors);
      }

    } catch (error) {
      console.error('Bulk import failed:', error);
      throw error;
    }
  }
}

// Example import usage
async function exampleImportUsage() {
  // Sample CSV data
  const csvData = `username,email,password,first_name,last_name
john_doe,john@example.com,password123,John,Doe
jane_smith,jane@example.com,password456,Jane,Smith
bob_wilson,bob@example.com,password789,Bob,Wilson`;

  try {
    // Import from CSV
    const importResult = await DataImportService.importUsersFromCSV(csvData);
    console.log('CSV Import result:', importResult);

    // Import with column mapping
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

### Export Data

```typescript
// services/DataExportService.ts
import { DatabaseManager } from '@dqcai/sqlite';

export class DataExportService {
  
  // Export users to CSV
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

      // Create CSV header
      const headers = Object.keys(result.rows[0]);
      let csvContent = headers.join(',') + '\n';

      // Add data rows
      result.rows.forEach(row => {
        const values = headers.map(header => {
          const value = row[header];
          // Escape quotes and wrap in quotes if contains comma
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

  // Export with custom conditions
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

  // Create full database backup
  static async createDatabaseBackup(dbKey: string): Promise<{
    tables: Record<string, any[]>;
    metadata: any;
  }> {
    try {
      const dao = DatabaseManager.get(dbKey);
      
      // Get list of tables
      const tablesResult = await dao.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      );
      
      const backup: Record<string, any[]> = {};
      
      // Export each table
      for (const tableRow of tablesResult.rows) {
        const tableName = tableRow.name;
        const dataResult = await dao.execute(`SELECT * FROM ${tableName}`);
        backup[tableName] = dataResult.rows;
      }

      // Add metadata
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

// Example export usage
async function exampleExportUsage() {
  try {
    // Export users to CSV
    const csvContent = await DataExportService.exportUsersToCSV();
    console.log('CSV Export:', csvContent);

    // Export users with conditions
    const recentUsers = await DataExportService.exportUsersWithConditions(
      "u.created_at > ?",
      [new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()] // Last 30 days
    );
    console.log('Recent users:', recentUsers);

    // Backup entire users database
    const backup = await DataExportService.createDatabaseBackup('users');
    console.log('Database backup:', backup);

  } catch (error) {
    console.error('Export example failed:', error);
  }
}
```

## 9. Best Practices & Tips

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

// Using error handler
class SafeUserService extends UserService {
  async createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User | null> {
    return DatabaseErrorHandler.withRetry(async () => {
      try {
        return await super.createUser(userData);
      } catch (error) {
        DatabaseErrorHandler.handleServiceError(error, 'createUser');
        throw error; // Re-throw after handling
      }
    });
  }
}
```

### Performance Optimization

```typescript
// utils/PerformanceOptimizer.ts
export class PerformanceOptimizer {
  
  // Batch operations to reduce database calls
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
import { DatabaseManager, ServiceManager } from '@dqcai/sqlite';

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

  static async teardownTest(): Promise<void> {
    await DatabaseManager.closeAll();
    ServiceManager.resetInstance();
  }
}

// Example test
describe('UserService Tests', () => {
  let serviceManager: ServiceManager;
  let userService: UserService;

  beforeAll(async () => {
    await DatabaseTestHelpers.setupTestDatabase();
    serviceManager = ServiceManager.getInstance();
    userService = await serviceManager.getService('test_users', 'users') as UserService;
    await userService.init();
  });

  beforeEach(async () => {
    await DatabaseTestHelpers.cleanupTestData(userService);
  });

  afterAll(async () => {
    await DatabaseTestHelpers.teardownTest();
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

  test('should manage service lifecycle', async () => {
    const serviceInfo = serviceManager.getAllServiceInfo();
    expect(serviceInfo.length).toBeGreaterThan(0);

    const healthReport = await serviceManager.healthCheck();
    expect(healthReport.overallHealth).toBe(true);
  });
});
```

## 10. Troubleshooting Common Issues

### Database Locked

```typescript
// Resolve database locked issues
const handleDatabaseLocked = async () => {
  try {
    // Enable WAL mode to avoid locks
    const dao = DatabaseManager.get('users');
    await dao.execute('PRAGMA journal_mode = WAL');
    await dao.execute('PRAGMA busy_timeout = 30000'); // 30 second timeout
  } catch (error) {
    console.error('Error setting WAL mode:', error);
  }
};
```

### Connection Issues

```typescript
// Check and restore connections
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

### Service Management Issues

```typescript
// Service troubleshooting
const troubleshootServices = async () => {
  const serviceManager = ServiceManager.getInstance();
  
  // Get service health report
  const healthReport = await serviceManager.healthCheck();
  console.log('Service Health:', healthReport);
  
  // Clean up problematic services
  if (!healthReport.overallHealth) {
    const unhealthyServices = healthReport.services.filter(s => !s.healthy);
    
    for (const service of unhealthyServices) {
      const [schemaName, tableName] = service.serviceKey.split(':');
      console.log(`Attempting to restart service: ${service.serviceKey}`);
      
      await serviceManager.destroyService(schemaName, tableName);
      await serviceManager.getService(schemaName, tableName);
    }
  }
};
```

## 11. Migration & Schema Updates

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
    
    // SQLite doesn't support DROP COLUMN, need to recreate table
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

// Run migration
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

## 12. Advanced Features

### Cross-Schema Transactions with ServiceManager

```typescript
// Advanced transaction management across multiple services
export class TransactionManager {
  private serviceManager = ServiceManager.getInstance();

  async executeUserProfileTransaction(
    userData: Omit<User, 'id' | 'created_at' | 'updated_at'>,
    profileData: Omit<Profile, 'id' | 'user_id'>
  ): Promise<{ user: User; profile: Profile }> {
    
    // Execute transaction within the same schema (users)
    return await this.serviceManager.executeSchemaTransaction('users', async (services) => {
      const userService = services.find(s => s.tableName === 'users') as UserService;
      const profileService = services.find(s => s.tableName === 'profiles') as ProfileService;

      // Create user first
      const user = await userService.createUser(userData);
      if (!user) {
        throw new Error('Failed to create user');
      }

      // Create profile for the user
      const profile = await profileService.createProfile({
        ...profileData,
        user_id: user.id!
      });

      if (!profile) {
        throw new Error('Failed to create profile');
      }

      return { user, profile };
    });
  }

  async executeMultiSchemaOperation(): Promise<void> {
    // For operations across different schemas (databases)
    await DatabaseManager.executeCrossSchemaTransaction(['users', 'core'], async (daos) => {
      const usersDao = daos.users;
      const coreDao = daos.core;

      // Update user count in settings
      const userCount = await usersDao.execute('SELECT COUNT(*) as count FROM users');
      await coreDao.execute(
        'INSERT OR REPLACE INTO settings (key, value, description) VALUES (?, ?, ?)',
        ['user_count', userCount.rows[0].count.toString(), 'Total number of users']
      );

      // Log system activity
      await coreDao.execute(
        'INSERT OR REPLACE INTO settings (key, value, description) VALUES (?, ?, ?)',
        ['last_user_sync', new Date().toISOString(), 'Last user count sync']
      );
    });
  }
}
```

### Service Composition and Dependency Injection

```typescript
// Advanced service composition
export class ServiceComposer {
  private serviceManager = ServiceManager.getInstance();

  // Compose services with dependencies
  async createUserManagementService(): Promise<UserManagementService> {
    const userService = await this.serviceManager.getService('users', 'users') as UserService;
    const profileService = await this.serviceManager.getService('users', 'profiles') as ProfileService;
    const settingsService = await this.serviceManager.getService('core', 'settings') as SettingsService;

    return new UserManagementService(userService, profileService, settingsService);
  }
}

// Composite service example
export class UserManagementService {
  constructor(
    private userService: UserService,
    private profileService: ProfileService,
    private settingsService: SettingsService
  ) {}

  async createCompleteUser(
    userData: Omit<User, 'id' | 'created_at' | 'updated_at'>,
    profileData: Omit<Profile, 'id' | 'user_id'>
  ): Promise<any> {
    // Get default settings
    const defaultRole = await this.settingsService.getSetting('default_user_role') || 'user';
    
    return await this.userService.executeTransaction(async () => {
      // Create user
      const user = await this.userService.createUser(userData);
      if (!user) throw new Error('Failed to create user');

      // Create profile
      const profile = await this.profileService.createProfile({
        ...profileData,
        user_id: user.id!
      });

      // Update user count
      const currentCount = await this.userService.count();
      await this.settingsService.setSetting(
        'total_users',
        currentCount.toString(),
        'Total registered users'
      );

      return { user, profile, defaultRole };
    });
  }

  async getUserDashboardData(userId: number): Promise<any> {
    const [user, profile, recentSettings] = await Promise.all([
      this.userService.findById(userId),
      this.profileService.getProfileByUserId(userId),
      this.settingsService.getMultipleSettings(['app_version', 'maintenance_mode', 'user_count'])
    ]);

    return {
      user,
      profile,
      settings: recentSettings,
      isComplete: !!(user && profile)
    };
  }
}
```

### Real-time Monitoring and Alerting

```typescript
// Real-time service monitoring
export class ServiceHealthMonitor {
  private serviceManager = ServiceManager.getInstance();
  private alerts: Array<{ timestamp: string; level: string; message: string }> = [];
  private healthCheckInterval: NodeJS.Timeout | null = null;

  startMonitoring(intervalMs: number = 30000): void {
    this.setupEventHandlers();
    
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, intervalMs);

    console.log('Service health monitoring started');
  }

  stopMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    console.log('Service health monitoring stopped');
  }

  private setupEventHandlers(): void {
    this.serviceManager.on('SERVICE_ERROR', (event) => {
      this.addAlert('ERROR', `Service error in ${event.serviceKey}: ${event.error?.message}`);
    });

    this.serviceManager.on('SERVICE_CREATED', (event) => {
      this.addAlert('INFO', `Service created: ${event.serviceKey}`);
    });

    this.serviceManager.on('SERVICE_DESTROYED', (event) => {
      this.addAlert('WARNING', `Service destroyed: ${event.serviceKey}`);
    });
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const healthReport = await this.serviceManager.healthCheck();
      
      if (!healthReport.overallHealth) {
        this.addAlert('CRITICAL', `System unhealthy: ${healthReport.unhealthyServices}/${healthReport.totalServices} services down`);
        
        // Attempt automatic recovery
        await this.attemptAutoRecovery(healthReport);
      } else {
        this.addAlert('INFO', `System healthy: All ${healthReport.totalServices} services operational`);
      }
    } catch (error) {
      this.addAlert('ERROR', `Health check failed: ${error}`);
    }
  }

  private async attemptAutoRecovery(healthReport: any): Promise<void> {
    const unhealthyServices = healthReport.services.filter((s: any) => !s.healthy);
    
    for (const service of unhealthyServices) {
      try {
        const [schemaName, tableName] = service.serviceKey.split(':');
        
        // Try to restart the service
        await this.serviceManager.destroyService(schemaName, tableName);
        await this.serviceManager.initializeService(schemaName, tableName);
        
        this.addAlert('INFO', `Auto-recovery successful for ${service.serviceKey}`);
      } catch (error) {
        this.addAlert('ERROR', `Auto-recovery failed for ${service.serviceKey}: ${error}`);
      }
    }
  }

  private addAlert(level: string, message: string): void {
    const alert = {
      timestamp: new Date().toISOString(),
      level,
      message
    };
    
    this.alerts.unshift(alert);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(0, 100);
    }

    // Log based on severity
    switch (level) {
      case 'CRITICAL':
      case 'ERROR':
        console.error(`[${level}] ${message}`);
        break;
      case 'WARNING':
        console.warn(`[${level}] ${message}`);
        break;
      default:
        console.log(`[${level}] ${message}`);
    }
  }

  getRecentAlerts(limit: number = 20): typeof this.alerts {
    return this.alerts.slice(0, limit);
  }

  getSystemMetrics(): any {
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);
    
    const recentAlerts = this.alerts.filter(
      alert => new Date(alert.timestamp).getTime() > hourAgo
    );
    
    const alertsByLevel = recentAlerts.reduce((acc, alert) => {
      acc[alert.level] = (acc[alert.level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      serviceCount: this.serviceManager.getServiceCount(),
      activeSchemas: this.serviceManager.getSchemas(),
      recentAlerts: alertsByLevel,
      systemUptime: process.uptime?.() || 0,
      memoryUsage: process.memoryUsage?.() || null
    };
  }
}
```

## 13. Production Deployment Considerations

### Configuration Management

```typescript
// config/DatabaseConfig.ts
export interface DatabaseConfig {
  environment: 'development' | 'production' | 'test';
  databases: {
    [key: string]: {
      path: string;
      maxConnections?: number;
      timeout?: number;
      enableWAL?: boolean;
    };
  };
  services: {
    autoCleanupInterval?: number;
    healthCheckInterval?: number;
    maxIdleTime?: number;
  };
  monitoring: {
    enabled: boolean;
    alertThreshold?: number;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
}

export const productionConfig: DatabaseConfig = {
  environment: 'production',
  databases: {
    users: {
      path: '/data/users.db',
      maxConnections: 10,
      timeout: 30000,
      enableWAL: true
    },
    core: {
      path: '/data/core.db',
      maxConnections: 5,
      timeout: 30000,
      enableWAL: true
    }
  },
  services: {
    autoCleanupInterval: 10 * 60 * 1000, // 10 minutes
    healthCheckInterval: 30 * 1000, // 30 seconds
    maxIdleTime: 30 * 60 * 1000 // 30 minutes
  },
  monitoring: {
    enabled: true,
    alertThreshold: 80, // Alert when 80% of services are unhealthy
    logLevel: 'info'
  }
};

export const developmentConfig: DatabaseConfig = {
  environment: 'development',
  databases: {
    users: {
      path: './dev/users.db',
      enableWAL: false
    },
    core: {
      path: './dev/core.db',
      enableWAL: false
    }
  },
  services: {
    autoCleanupInterval: 5 * 60 * 1000, // 5 minutes
    healthCheckInterval: 60 * 1000, // 1 minute
    maxIdleTime: 10 * 60 * 1000 // 10 minutes
  },
  monitoring: {
    enabled: true,
    logLevel: 'debug'
  }
};
```

### Production Service Setup

```typescript
// production/ProductionSetup.ts
import { DatabaseConfig, productionConfig } from '../config/DatabaseConfig';

export class ProductionSetup {
  static async initializeForProduction(config: DatabaseConfig = productionConfig): Promise<void> {
    try {
      // Apply production optimizations
      await this.applyProductionOptimizations();
      
      // Initialize with config
      await DatabaseService.initialize();
      
      // Setup monitoring
      if (config.monitoring.enabled) {
        const monitor = new ServiceHealthMonitor();
        monitor.startMonitoring(config.services.healthCheckInterval);
      }
      
      // Setup graceful shutdown
      this.setupGracefulShutdown();
      
      console.log('Production setup completed successfully');
    } catch (error) {
      console.error('Production setup failed:', error);
      process.exit(1);
    }
  }

  private static async applyProductionOptimizations(): Promise<void> {
    // Apply SQLite production settings
    const connections = DatabaseManager.getConnections();
    
    for (const [dbKey, dao] of Object.entries(connections)) {
      try {
        // Enable WAL mode for better concurrency
        await dao.execute('PRAGMA journal_mode = WAL');
        
        // Set aggressive timeout for busy database
        await dao.execute('PRAGMA busy_timeout = 30000');
        
        // Optimize cache size
        await dao.execute('PRAGMA cache_size = -64000'); // 64MB cache
        
        // Enable foreign key constraints
        await dao.execute('PRAGMA foreign_keys = ON');
        
        // Optimize for faster queries
        await dao.execute('PRAGMA synchronous = NORMAL');
        await dao.execute('PRAGMA temp_store = MEMORY');
        
        console.log(`Production optimizations applied to ${dbKey}`);
      } catch (error) {
        console.error(`Failed to optimize ${dbKey}:`, error);
      }
    }
  }

  private static setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      console.log(`Received ${signal}. Starting graceful shutdown...`);
      
      try {
        // Close all database connections
        await DatabaseManager.closeAll();
        
        // Destroy service manager
        const serviceManager = ServiceManager.getInstance();
        await serviceManager.destroy();
        
        console.log('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGHUP', () => shutdown('SIGHUP'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      shutdown('uncaughtException');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      shutdown('unhandledRejection');
    });
  }
}
```

## Conclusion

Universal SQLite provides a powerful and flexible solution for managing SQLite databases across platforms. With DatabaseManager, ServiceManager, and BaseService, you can:

- Easily manage multiple database connections and service lifecycles
- Perform type-safe CRUD operations with automatic optimization
- Import/Export data efficiently with built-in validation
- Manage schemas and migrations systematically
- Handle errors and performance optimization gracefully
- Monitor service health and automate recovery
- Deploy confidently in production environments

The library supports both React Native and Node.js well, helping you build database-driven applications consistently and maintainably across different platforms.

## Key Features Summary

- **Cross-Platform**: Browser, Node.js, Deno, Bun, React Native (iOS/Android/Windows)
- **Service Management**: Centralized lifecycle management with ServiceManager
- **Type Safety**: Full TypeScript support for schemas, queries, and operations
- **Performance**: Built-in optimization, connection pooling, and batch operations
- **Monitoring**: Real-time health monitoring and automatic recovery
- **Production Ready**: Comprehensive error handling and graceful shutdown
- **Flexible**: Custom adapters, role-based access, and extensible architecture

## Best Practices Summary

1. **Always use ServiceManager for service lifecycle management**
2. **Register services at application startup for better organization**
3. **Use transactions for multi-step operations**
4. **Implement proper error handling with retry mechanisms**
5. **Monitor service health in production environments**
6. **Use batch operations for better performance**
7. **Enable WAL mode for production deployments**
8. **Implement graceful shutdown procedures**

## API Reference

- **ServiceManager**: Centralized service lifecycle management
- **DatabaseManager**: Connection and schema management
- **BaseService**: Base class for CRUD operations with optimization
- **UniversalDAO**: Core DAO for database operations
- **QueryBuilder**: Fluent API for complex queries
- **DatabaseFactory**: Factory for creating adapters and connections
- **MigrationManager**: Schema versioning and migrations
- **CSVImporter**: Data import/export utilities

See source code for detailed types and method signatures.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with proper TypeScript types
4. Add comprehensive tests
5. Update documentation
6. Submit a pull request

## License

MIT © [Cuong Doan](https://github.com/cuongdqpayment)

## Acknowledgments

- [sqlite3](https://www.npmjs.com/package/sqlite3) - Node.js SQLite bindings
- [sql.js](https://github.com/sql-js/sql.js) - SQLite compiled to WebAssembly
- [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) - Expo SQLite support
- [react-native-sqlite-storage](https://github.com/andpor/react-native-sqlite-storage) - React Native SQLite
- [Deno SQLite](https://deno.land/x/sqlite) - Deno SQLite module

## Links

- [Documentation](https://github.com/cuongdqpayment/dqcai-sqlite/docs)
- [Examples Repository](https://github.com/cuongdqpayment/dqcai-sqlite)
- [Issue Tracker](https://github.com/cuongdqpayment/dqcai-sqlite/issues)
- [Facebook Page](https://www.facebook.com/share/p/19esHGbaGj/)
- [NPM Package](https://www.npmjs.com/package/@dqcai/sqlite)

---

🚀 **@dqcai/sqlite** — One library, all platforms! 🎯