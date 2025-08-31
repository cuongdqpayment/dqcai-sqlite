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
          // Windows global object check
          typeof globalThis.Windows !== 'undefined' ||
          // React Native Windows module check
          (() => {
            try {
              if (typeof require !== 'undefined') {
                require('react-native-windows');
                return true;
              }
            } catch {
              return false;
            }
            return false;
          })() ||
          // Platform module check
          (() => {
            try {
              if (typeof require !== 'undefined') {
                const { Platform } = require('react-native');
                return Platform && Platform.OS === 'windows';
              }
            } catch {
              return false;
            }
            return false;
          })()
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
      if (!window.openDatabase) {
        throw new Error('WebView openDatabase not available');
      }
      const db = window.openDatabase(path, '1.0', 'Database', 2 * 1024 * 1024);
      return new ReactNativeSQLiteConnection(db, path);
    } catch (error) {
      throw new Error(`Cannot connect to WebView SQLite database: ${error}`);
    }
  }
}