# Bước 1: Tạo thư mục src và adapters (nếu chưa tồn tại). Lệnh của Grok
mkdir -p src/adapters

# Bước 2: Tạo file src/types.ts với nội dung.
# !!! CẢNH BÁO: Lệnh này sẽ ghi đè file nếu đã tồn tại.
cat << 'EOF' > src/types.ts
export interface SQLiteRow {
  [key: string]: any;
}

export interface SQLiteResult {
  rows: SQLiteRow[];
  rowsAffected: number;
  lastInsertRowId?: number;
}

export interface SQLiteConnection {
  execute(sql: string, params?: any[]): Promise<SQLiteResult>;
  close(): Promise<void>;
}

export interface SQLiteAdapter {
  connect(path: string): Promise<SQLiteConnection>;
  isSupported(): boolean;
}

export interface SQLiteConfig {
  path: string;
  timeout?: number;
  busyTimeout?: number;
}
EOF

# Bước 3: Tạo file src/adapters/base-adapter.ts với nội dung.
# !!! CẢNH BÁO: Lệnh này sẽ ghi đè file nếu đã tồn tại.
cat << 'EOF' > src/adapters/base-adapter.ts
export abstract class BaseAdapter implements SQLiteAdapter {
  abstract connect(path: string): Promise<SQLiteConnection>;
  abstract isSupported(): boolean;

  protected sanitizeSQL(sql: string): string {
    // Basic SQL injection prevention
    return sql.trim();
  }

  protected bindParameters(sql: string, params?: any[]): string {
    if (!params || params.length === 0) {
      return sql;
    }

    let paramIndex = 0;
    return sql.replace(/\?/g, () => {
      if (paramIndex < params.length) {
        const param = params[paramIndex++];
        if (typeof param === 'string') {
          return `'${param.replace(/'/g, "''")}'`;
        }
        if (param === null || param === undefined) {
          return 'NULL';
        }
        return String(param);
      }
      return '?';
    });
  }
}
EOF

# Bước 4: Tạo file src/adapters/node-adapter.ts với nội dung.
# !!! CẢNH BÁO: Lệnh này sẽ ghi đè file nếu đã tồn tại.
cat << 'EOF' > src/adapters/node-adapter.ts
import { BaseAdapter } from './base-adapter';
import { SQLiteConnection, SQLiteResult, SQLiteRow } from '../types';

class NodeSQLiteConnection implements SQLiteConnection {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  async execute(sql: string, params?: any[]): Promise<SQLiteResult> {
    return new Promise((resolve, reject) => {
      const sanitizedSQL = this.bindParameters(sql, params);
      
      if (sql.toLowerCase().trim().startsWith('select')) {
        this.db.all(sanitizedSQL, (err: any, rows: SQLiteRow[]) => {
          if (err) {
            reject(new Error(`SQLite error: ${err.message}`));
          } else {
            resolve({
              rows: rows || [],
              rowsAffected: 0
            });
          }
        });
      } else {
        this.db.run(sanitizedSQL, function(this: any, err: any) {
          if (err) {
            reject(new Error(`SQLite error: ${err.message}`));
          } else {
            resolve({
              rows: [],
              rowsAffected: this.changes || 0,
              lastInsertRowId: this.lastID
            });
          }
        });
      }
    });
  }

  private bindParameters(sql: string, params?: any[]): string {
    if (!params || params.length === 0) {
      return sql;
    }

    let paramIndex = 0;
    return sql.replace(/\?/g, () => {
      if (paramIndex < params.length) {
        const param = params[paramIndex++];
        if (typeof param === 'string') {
          return `'${param.replace(/'/g, "''")}'`;
        }
        if (param === null || param === undefined) {
          return 'NULL';
        }
        return String(param);
      }
      return '?';
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err: any) => {
        if (err) {
          reject(new Error(`Error closing database: ${err.message}`));
        } else {
          resolve();
        }
      });
    });
  }
}

export class NodeAdapter extends BaseAdapter {
  isSupported(): boolean {
    try {
      return typeof require !== 'undefined' && require('sqlite3') !== undefined;
    } catch {
      return false;
    }
  }

  async connect(path: string): Promise<SQLiteConnection> {
    return new Promise((resolve, reject) => {
      try {
        const sqlite3 = require('sqlite3').verbose();
        const db = new sqlite3.Database(path, (err: any) => {
          if (err) {
            reject(new Error(`Cannot connect to database: ${err.message}`));
          } else {
            resolve(new NodeSQLiteConnection(db));
          }
        });
      } catch (error) {
        reject(new Error(`SQLite3 module not available: ${error}`));
      }
    });
  }
}
EOF

# Bước 5: Tạo file src/adapters/browser-adapter.ts với nội dung.
# !!! CẢNH BÁO: Lệnh này sẽ ghi đè file nếu đã tồn tại.
cat << 'EOF' > src/adapters/browser-adapter.ts
import { BaseAdapter } from './base-adapter';
import { SQLiteConnection, SQLiteResult, SQLiteRow } from '../types';

class BrowserSQLiteConnection implements SQLiteConnection {
  private worker: Worker | null = null;
  private db: any = null;

  constructor(db: any, worker?: Worker) {
    this.db = db;
    this.worker = worker || null;
  }

  async execute(sql: string, params?: any[]): Promise<SQLiteResult> {
    if (!this.db) {
      throw new Error('Database connection not available');
    }

    try {
      const boundSQL = super.bindParameters ? super.bindParameters(sql, params) : this.bindParameters(sql, params);
      
      if (sql.toLowerCase().trim().startsWith('select')) {
        const result = this.db.exec(boundSQL);
        const rows: SQLiteRow[] = [];
        
        if (result.length > 0 && result[0].values) {
          const columns = result[0].columns;
          const values = result[0].values;
          
          for (const row of values) {
            const rowObj: SQLiteRow = {};
            columns.forEach((col: string, index: number) => {
              rowObj[col] = row[index];
            });
            rows.push(rowObj);
          }
        }
        
        return {
          rows,
          rowsAffected: 0
        };
      } else {
        this.db.exec(boundSQL);
        return {
          rows: [],
          rowsAffected: 1 // Browser doesn't provide exact count
        };
      }
    } catch (error) {
      throw new Error(`SQLite error: ${error}`);
    }
  }

  private bindParameters(sql: string, params?: any[]): string {
    if (!params || params.length === 0) {
      return sql;
    }

    let paramIndex = 0;
    return sql.replace(/\?/g, () => {
      if (paramIndex < params.length) {
        const param = params[paramIndex++];
        if (typeof param === 'string') {
          return `'${param.replace(/'/g, "''")}'`;
        }
        if (param === null || param === undefined) {
          return 'NULL';
        }
        return String(param);
      }
      return '?';
    });
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

export class BrowserAdapter extends BaseAdapter {
  private sqlJs: any = null;

  isSupported(): boolean {
    return typeof window !== 'undefined' && 
           (typeof window.SQL !== 'undefined' || this.sqlJs !== null);
  }

  async connect(path: string): Promise<SQLiteConnection> {
    try {
      // Try to load sql.js if not already loaded
      if (!this.sqlJs) {
        if (typeof window.SQL !== 'undefined') {
          this.sqlJs = window.SQL;
        } else {
          // Try to load from CDN
          await this.loadSqlJs();
        }
      }

      let db;
      
      if (path === ':memory:') {
        // In-memory database
        db = new this.sqlJs.Database();
      } else {
        // Try to load from file or localStorage
        const data = await this.loadDatabaseFile(path);
        db = new this.sqlJs.Database(data);
      }

      return new BrowserSQLiteConnection(db);
    } catch (error) {
      throw new Error(`Cannot connect to browser database: ${error}`);
    }
  }

  private async loadSqlJs(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js';
      script.onload = async () => {
        try {
          this.sqlJs = await window.initSqlJs({
            locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
          });
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      script.onerror = () => reject(new Error('Failed to load sql.js'));
      document.head.appendChild(script);
    });
  }

  private async loadDatabaseFile(path: string): Promise<Uint8Array | undefined> {
    // Try localStorage first
    const stored = localStorage.getItem(`sqlite_db_${path}`);
    if (stored) {
      return new Uint8Array(JSON.parse(stored));
    }

    // Try to fetch as a file
    try {
      const response = await fetch(path);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        return new Uint8Array(arrayBuffer);
      }
    } catch {
      // File doesn't exist, return undefined for new database
    }

    return undefined;
  }
}
EOF

# Bước 6: Tạo file src/adapters/deno-adapter.ts với nội dung.
# !!! CẢNH BÁO: Lệnh này sẽ ghi đè file nếu đã tồn tại.
cat << 'EOF' > src/adapters/deno-adapter.ts
import { BaseAdapter } from './base-adapter';
import { SQLiteConnection, SQLiteResult, SQLiteRow } from '../types';

class DenoSQLiteConnection implements SQLiteConnection {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  async execute(sql: string, params?: any[]): Promise<SQLiteResult> {
    try {
      const boundSQL = this.bindParameters(sql, params);
      
      if (sql.toLowerCase().trim().startsWith('select')) {
        const result = this.db.queryEntries(boundSQL);
        return {
          rows: result,
          rowsAffected: 0
        };
      } else {
        const result = this.db.query(boundSQL);
        return {
          rows: [],
          rowsAffected: result.length || 1
        };
      }
    } catch (error) {
      throw new Error(`SQLite error: ${error}`);
    }
  }

  private bindParameters(sql: string, params?: any[]): string {
    if (!params || params.length === 0) {
      return sql;
    }

    let paramIndex = 0;
    return sql.replace(/\?/g, () => {
      if (paramIndex < params.length) {
        const param = params[paramIndex++];
        if (typeof param === 'string') {
          return `'${param.replace(/'/g, "''")}'`;
        }
        if (param === null || param === undefined) {
          return 'NULL';
        }
        return String(param);
      }
      return '?';
    });
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
    }
  }
}

export class DenoAdapter extends BaseAdapter {
  isSupported(): boolean {
    try {
      return typeof Deno !== 'undefined' && Deno.env !== undefined;
    } catch {
      return false;
    }
  }

  async connect(path: string): Promise<SQLiteConnection> {
    try {
      // Dynamic import for Deno SQLite
      const { DB } = await import('https://deno.land/x/sqlite@v3.8.0/mod.ts');
      const db = new DB(path);
      return new DenoSQLiteConnection(db);
    } catch (error) {
      throw new Error(`Cannot connect to Deno database: ${error}`);
    }
  }
}
EOF

# Bước 7: Tạo file src/adapters/bun-adapter.ts với nội dung.
# !!! CẢNH BÁO: Lệnh này sẽ ghi đè file nếu đã tồn tại.
cat << 'EOF' > src/adapters/bun-adapter.ts
import { BaseAdapter } from './base-adapter';
import { SQLiteConnection, SQLiteResult, SQLiteRow } from '../types';

class BunSQLiteConnection implements SQLiteConnection {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  async execute(sql: string, params?: any[]): Promise<SQLiteResult> {
    try {
      if (sql.toLowerCase().trim().startsWith('select')) {
        const result = this.db.query(sql).all(params || []);
        return {
          rows: result,
          rowsAffected: 0
        };
      } else {
        const result = this.db.query(sql).run(params || []);
        return {
          rows: [],
          rowsAffected: result.changes || 0,
          lastInsertRowId: result.lastInsertRowid
        };
      }
    } catch (error) {
      throw new Error(`SQLite error: ${error}`);
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
    }
  }
}

export class BunAdapter extends BaseAdapter {
  isSupported(): boolean {
    try {
      return typeof Bun !== 'undefined' && Bun.version !== undefined;
    } catch {
      return false;
    }
  }

  async connect(path: string): Promise<SQLiteConnection> {
    try {
      const { Database } = require('bun:sqlite');
      const db = new Database(path);
      return new BunSQLiteConnection(db);
    } catch (error) {
      throw new Error(`Cannot connect to Bun database: ${error}`);
    }
  }
}
EOF

# Bước 8: Tạo file src/adapters/react-native-adapter.ts với nội dung.
# !!! CẢNH BÁO: Lệnh này sẽ ghi đè file nếu đã tồn tại.
cat << 'EOF' > src/adapters/react-native-adapter.ts
import { BaseAdapter } from './base-adapter';
import { SQLiteConnection, SQLiteResult, SQLiteRow } from '../types';

class ReactNativeSQLiteConnection implements SQLiteConnection {
  private db: any;
  private dbName: string;

  constructor(db: any, dbName: string) {
    this.db = db;
    this.dbName = dbName;
  }

  async execute(sql: string, params?: any[]): Promise<SQLiteResult> {
    return new Promise((resolve, reject) => {
      try {
        const boundSQL = this.bindParameters(sql, params);
        
        this.db.transaction((tx: any) => {
          tx.executeSql(
            boundSQL,
            [],
            (tx: any, results: any) => {
              const rows: SQLiteRow[] = [];
              
              if (results.rows) {
                for (let i = 0; i < results.rows.length; i++) {
                  rows.push(results.rows.item(i));
                }
              }
              
              resolve({
                rows,
                rowsAffected: results.rowsAffected || 0,
                lastInsertRowId: results.insertId
              });
            },
            (tx: any, error: any) => {
              reject(new Error(`SQLite error: ${error.message}`));
              return false;
            }
          );
        });
      } catch (error) {
        reject(new Error(`SQLite execution error: ${error}`));
      }
    });
  }

  private bindParameters(sql: string, params?: any[]): string {
    if (!params || params.length === 0) {
      return sql;
    }

    let paramIndex = 0;
    return sql.replace(/\?/g, () => {
      if (paramIndex < params.length) {
        const param = params[paramIndex++];
        if (typeof param === 'string') {
          return `'${param.replace(/'/g, "''")}'`;
        }
        if (param === null || param === undefined) {
          return 'NULL';
        }
        return String(param);
      }
      return '?';
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.db && this.db.close) {
        this.db.close(
          () => resolve(),
          (error: any) => reject(new Error(`Error closing database: ${error.message}`))
        );
      } else {
        resolve();
      }
    });
  }
}

// Adapter for react-native-sqlite-storage
class ReactNativeSQLiteStorageConnection implements SQLiteConnection {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  async execute(sql: string, params?: any[]): Promise<SQLiteResult> {
    return new Promise((resolve, reject) => {
      this.db.executeSql(
        sql,
        params || [],
        (results: any) => {
          const rows: SQLiteRow[] = [];
          
          if (results.rows) {
            for (let i = 0; i < results.rows.length; i++) {
              rows.push(results.rows.item(i));
            }
          }
          
          resolve({
            rows,
            rowsAffected: results.rowsAffected || 0,
            lastInsertRowId: results.insertId
          });
        },
        (error: any) => {
          reject(new Error(`SQLite error: ${error.message}`));
        }
      );
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.db && this.db.close) {
        this.db.close(resolve, reject);
      } else {
        resolve();
      }
    });
  }
}

// Adapter for expo-sqlite
class ExpoSQLiteConnection implements SQLiteConnection {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  async execute(sql: string, params?: any[]): Promise<SQLiteResult> {
    try {
      const result = await this.db.execAsync([{
        sql,
        args: params || []
      }]);
      
      if (result && result[0]) {
        const firstResult = result[0];
        return {
          rows: firstResult.rows || [],
          rowsAffected: firstResult.rowsAffected || 0,
          lastInsertRowId: firstResult.lastInsertRowId
        };
      }
      
      return {
        rows: [],
        rowsAffected: 0
      };
    } catch (error) {
      throw new Error(`SQLite error: ${error}`);
    }
  }

  async close(): Promise<void> {
    if (this.db && this.db.closeAsync) {
      await this.db.closeAsync();
    }
  }
}

// Adapter for React Native Windows SQLite
class ReactNativeWindowsSQLiteConnection implements SQLiteConnection {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  async execute(sql: string, params?: any[]): Promise<SQLiteResult> {
    try {
      if (sql.toLowerCase().trim().startsWith('select')) {
        const result = await this.db.all(sql, params || []);
        return {
          rows: result || [],
          rowsAffected: 0
        };
      } else {
        const result = await this.db.run(sql, params || []);
        return {
          rows: [],
          rowsAffected: result.changes || 0,
          lastInsertRowId: result.lastID
        };
      }
    } catch (error) {
      throw new Error(`SQLite error: ${error}`);
    }
  }

  async close(): Promise<void> {
    if (this.db && this.db.close) {
      await this.db.close();
    }
  }
}

// Adapter for react-native-sqlite-2 (Windows specific)
class ReactNativeSQLite2Connection implements SQLiteConnection {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  async execute(sql: string, params?: any[]): Promise<SQLiteResult> {
    return new Promise((resolve, reject) => {
      this.db.exec(
        [{ sql, args: params || [] }],
        false,
        (results: any) => {
          if (results && results[0]) {
            const result = results[0];
            if (result.error) {
              reject(new Error(`SQLite error: ${result.error.message}`));
            } else {
              resolve({
                rows: result.rows || [],
                rowsAffected: result.rowsAffected || 0,
                lastInsertRowId: result.insertId
              });
            }
          } else {
            resolve({
              rows: [],
              rowsAffected: 0
            });
          }
        }
      );
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.db && this.db.close) {
        this.db.close(resolve, reject);
      } else {
        resolve();
      }
    });
  }
}

export class ReactNativeAdapter extends BaseAdapter {
  private adapterType: 'webview' | 'storage' | 'expo' | 'windows' | 'sqlite2' | null = null;
  private isWindows: boolean = false;

  isSupported(): boolean {
    try {
      // Check for React Native environment
      const isRN = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
      if (!isRN) return false;

      // Detect Windows platform
      this.isWindows = this.isReactNativeWindows();

      // Check for available SQLite libraries
      if (this.isWindows) {
        if (this.hasSQLite2()) {
          this.adapterType = 'sqlite2';
          return true;
        }
        
        if (this.hasWindowsSQLite()) {
          this.adapterType = 'windows';
          return true;
        }
      }
      
      if (this.hasExpoSQLite()) {
        this.adapterType = 'expo';
        return true;
      }
      
      if (this.hasSQLiteStorage()) {
        this.adapterType = 'storage';
        return true;
      }
      
      if (this.hasWebViewSQLite()) {
        this.adapterType = 'webview';
        return true;
      }
      
      return false;
    } catch {
      return false;
    }
  }

  private isReactNativeWindows(): boolean {
    try {
      // Check for Windows-specific APIs or platform detection
      return (
        typeof navigator !== 'undefined' && 
        navigator.product === 'ReactNative' &&
        (
          // Windows-specific checks
          typeof Windows !== 'undefined' ||
          (typeof require !== 'undefined' && 
           (() => {
             try {
               require('react-native-windows');
               return true;
             } catch {
               return false;
             }
           })()) ||
          // Platform module check
          (typeof Platform !== 'undefined' && Platform.OS === 'windows')
        )
      );
    } catch {
      return false;
    }
  }

  private hasExpoSQLite(): boolean {
    try {
      require('expo-sqlite');
      return !this.isWindows; // Expo SQLite might not work on Windows
    } catch {
      return false;
    }
  }

  private hasSQLiteStorage(): boolean {
    try {
      require('react-native-sqlite-storage');
      return !this.isWindows; // Standard version might not work on Windows
    } catch {
      return false;
    }
  }

  private hasWebViewSQLite(): boolean {
    try {
      return typeof window !== 'undefined' && 
             typeof window.openDatabase === 'function' &&
             !this.isWindows; // WebView SQLite not available on Windows
    } catch {
      return false;
    }
  }

  private hasWindowsSQLite(): boolean {
    try {
      require('react-native-windows-sqlite');
      return true;
    } catch {
      return false;
    }
  }

  private hasSQLite2(): boolean {
    try {
      require('react-native-sqlite-2');
      return true;
    } catch {
      return false;
    }
  }

  async connect(path: string): Promise<SQLiteConnection> {
    if (!this.isSupported()) {
      throw new Error('React Native SQLite not supported in this environment');
    }

    switch (this.adapterType) {
      case 'sqlite2':
        return this.connectSQLite2(path);
        
      case 'windows':
        return this.connectWindows(path);
      
      case 'expo':
        return this.connectExpo(path);
      
      case 'storage':
        return this.connectStorage(path);
      
      case 'webview':
        return this.connectWebView(path);
      
      default:
        throw new Error('No React Native SQLite adapter available');
    }
  }

  private async connectSQLite2(path: string): Promise<SQLiteConnection> {
    return new Promise((resolve, reject) => {
      try {
        const SQLite = require('react-native-sqlite-2');
        
        SQLite.openDatabase(
          path,
          '1.0',
          'Database',
          200000,
          (db: any) => {
            resolve(new ReactNativeSQLite2Connection(db));
          },
          (error: any) => {
            reject(new Error(`Cannot connect to React Native SQLite-2: ${error.message}`));
          }
        );
      } catch (error) {
        reject(new Error(`React Native SQLite-2 not available: ${error}`));
      }
    });
  }

  private async connectWindows(path: string): Promise<SQLiteConnection> {
    try {
      const SQLite = require('react-native-windows-sqlite');
      const db = await SQLite.openDatabase({
        name: path,
        location: 'default'
      });
      return new ReactNativeWindowsSQLiteConnection(db);
    } catch (error) {
      throw new Error(`Cannot connect to React Native Windows SQLite: ${error}`);
    }
  }

  private async connectExpo(path: string): Promise<SQLiteConnection> {
    try {
      const SQLite = require('expo-sqlite');
      const db = SQLite.openDatabaseSync(path);
      return new ExpoSQLiteConnection(db);
    } catch (error) {
      throw new Error(`Cannot connect to Expo SQLite database: ${error}`);
    }
  }

  private async connectStorage(path: string): Promise<SQLiteConnection> {
    return new Promise((resolve, reject) => {
      try {
        const SQLite = require('react-native-sqlite-storage');
        
        // Enable debugging (optional)
        SQLite.DEBUG(false);
        SQLite.enablePromise(true);

        SQLite.openDatabase({
          name: path,
          location: 'default'
        }).then((db: any) => {
          resolve(new ReactNativeSQLiteStorageConnection(db));
        }).catch((error: any) => {
          reject(new Error(`Cannot connect to React Native SQLite database: ${error.message}`));
        });
      } catch (error) {
        reject(new Error(`React Native SQLite Storage not available: ${error}`));
      }
    });
  }

  private async connectWebView(path: string): Promise<SQLiteConnection> {
    try {
      const db = window.openDatabase(path, '1.0', 'Database', 2 * 1024 * 1024);
      return new ReactNativeSQLiteConnection(db, path);
    } catch (error) {
      throw new Error(`Cannot connect to WebView SQLite database: ${error}`);
    }
  }
}
EOF

# Bước 9: Tạo file src/sqlite-manager.ts với nội dung.
# !!! CẢNH BÁO: Lệnh này sẽ ghi đè file nếu đã tồn tại.
cat << 'EOF' > src/sqlite-manager.ts
import { SQLiteAdapter, SQLiteConnection, SQLiteConfig } from './types';
import { NodeAdapter } from './adapters/node-adapter';
import { BrowserAdapter } from './adapters/browser-adapter';
import { DenoAdapter } from './adapters/deno-adapter';
import { BunAdapter } from './adapters/bun-adapter';
import { ReactNativeAdapter } from './adapters/react-native-adapter';

export class SQLiteManager {
  private adapters: SQLiteAdapter[] = [];
  private currentAdapter: SQLiteAdapter | null = null;

  constructor() {
    this.adapters = [
      new ReactNativeAdapter(), // Check React Native first
      new BunAdapter(),
      new DenoAdapter(),
      new NodeAdapter(),
      new BrowserAdapter()
    ];
  }

  private detectEnvironment(): SQLiteAdapter {
    for (const adapter of this.adapters) {
      if (adapter.isSupported()) {
        return adapter;
      }
    }
    throw new Error('No supported SQLite adapter found for this environment');
  }

  async connect(config: string | SQLiteConfig): Promise<SQLiteConnection> {
    const path = typeof config === 'string' ? config : config.path;
    
    if (!this.currentAdapter) {
      this.currentAdapter = this.detectEnvironment();
    }

    try {
      return await this.currentAdapter.connect(path);
    } catch (error) {
      throw new Error(`Failed to connect to SQLite database: ${error}`);
    }
  }

  getEnvironmentInfo(): string {
    if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
      // Detect specific React Native environment
      if (typeof Windows !== 'undefined') return 'React Native Windows';
      if (typeof Platform !== 'undefined' && Platform.OS === 'windows') return 'React Native Windows';
      return 'React Native';
    }
    if (typeof Bun !== 'undefined') return 'Bun';
    if (typeof Deno !== 'undefined') return 'Deno';
    if (typeof window !== 'undefined') return 'Browser';
    if (typeof process !== 'undefined') return 'Node.js';
    return 'Unknown';
  }
}
EOF

# Bước 10: Tạo file src/query-builder.ts với nội dung.
# !!! CẢNH BÁO: Lệnh này sẽ ghi đè file nếu đã tồn tại.
cat << 'EOF' > src/query-builder.ts
export class QueryBuilder {
  private tableName = '';
  private selectFields: string[] = ['*'];
  private whereConditions: string[] = [];
  private orderByFields: string[] = [];
  private limitValue: number | null = null;
  private offsetValue: number | null = null;

  static table(name: string): QueryBuilder {
    const builder = new QueryBuilder();
    builder.tableName = name;
    return builder;
  }

  select(fields: string | string[]): QueryBuilder {
    this.selectFields = Array.isArray(fields) ? fields : [fields];
    return this;
  }

  where(condition: string): QueryBuilder {
    this.whereConditions.push(condition);
    return this;
  }

  orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): QueryBuilder {
    this.orderByFields.push(`${field} ${direction}`);
    return this;
  }

  limit(count: number): QueryBuilder {
    this.limitValue = count;
    return this;
  }

  offset(count: number): QueryBuilder {
    this.offsetValue = count;
    return this;
  }

  toSQL(): string {
    let sql = `SELECT ${this.selectFields.join(', ')} FROM ${this.tableName}`;
    
    if (this.whereConditions.length > 0) {
      sql += ` WHERE ${this.whereConditions.join(' AND ')}`;
    }
    
    if (this.orderByFields.length > 0) {
      sql += ` ORDER BY ${this.orderByFields.join(', ')}`;
    }
    
    if (this.limitValue !== null) {
      sql += ` LIMIT ${this.limitValue}`;
    }
    
    if (this.offsetValue !== null) {
      sql += ` OFFSET ${this.offsetValue}`;
    }
    
    return sql;
  }

  // Insert methods
  static insert(tableName: string, data: Record<string, any>): string {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map(() => '?').join(', ');
    
    return `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${placeholders})`;
  }

  static update(tableName: string, data: Record<string, any>, where: string): string {
    const sets = Object.keys(data).map(key => `${key} = ?`).join(', ');
    return `UPDATE ${tableName} SET ${sets} WHERE ${where}`;
  }

  static delete(tableName: string, where: string): string {
    return `DELETE FROM ${tableName} WHERE ${where}`;
  }
}
EOF

# Bước 11: Tạo file src/index.ts với nội dung.
# !!! CẢNH BÁO: Lệnh này sẽ ghi đè file nếu đã tồn tại.
cat << 'EOF' > src/index.ts
export { SQLiteManager } from './sqlite-manager';
export { QueryBuilder } from './query-builder';
export * from './types';

// Example usage and main export
export default class UniversalSQLite {
  private manager: SQLiteManager;
  private connection: SQLiteConnection | null = null;

  constructor() {
    this.manager = new SQLiteManager();
  }

  async connect(path: string): Promise<void> {
    this.connection = await this.manager.connect(path);
  }

  async query(sql: string, params?: any[]) {
    if (!this.connection) {
      throw new Error('Database not connected');
    }
    return await this.connection.execute(sql, params);
  }

  async close(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
  }

  getEnvironment(): string {
    return this.manager.getEnvironmentInfo();
  }

  // Convenience methods
  async createTable(name: string, schema: Record<string, string>): Promise<void> {
    const fields = Object.entries(schema)
      .map(([field, type]) => `${field} ${type}`)
      .join(', ');
    
    await this.query(`CREATE TABLE IF NOT EXISTS ${name} (${fields})`);
  }

  async insert(table: string, data: Record<string, any>) {
    const sql = QueryBuilder.insert(table, data);
    return await this.query(sql, Object.values(data));
  }

  async select(table: string, where?: string, params?: any[]) {
    let sql = `SELECT * FROM ${table}`;
    if (where) {
      sql += ` WHERE ${where}`;
    }
    return await this.query(sql, params);
  }

  async update(table: string, data: Record<string, any>, where: string, whereParams?: any[]) {
    const sql = QueryBuilder.update(table, data, where);
    const params = [...Object.values(data), ...(whereParams || [])];
    return await this.query(sql, params);
  }

  async delete(table: string, where: string, params?: any[]) {
    const sql = QueryBuilder.delete(table, where);
    return await this.query(sql, params);
  }
}
EOF