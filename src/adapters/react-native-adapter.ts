
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
              reject(new Error(SQLite error: ));
              return false;
            }
          );
        });
      } catch (error) {
        reject(new Error(SQLite execution error: An item with the specified name D:\ReactNative\dqcai-sqlite\src already exists. An item with the specified name D:\ReactNative\dqcai-sqlite\src\adapters already exists. System.Management.Automation.ParseException: At line:1 char:24
+ " | Set-Content -Path "src/types.ts"
+                        ~~~~~~~~~~~~~
Unexpected token 'src/types.ts"
}
  busyTimeout?: number;
  timeout?: number;
  path: string;
export interface SQLiteConfig {

}
  isSupported(): boolean;
  connect(path: string): Promise<SQLiteConnection>;
export interface SQLiteAdapter {

}
  close(): Promise<void>;
  execute(sql: string, params?: any[]): Promise<SQLiteResult>;
export interface SQLiteConnection {

}
  lastInsertRowId?: number;
  rowsAffected: number;
  rows: SQLiteRow[];
export interface SQLiteResult {

}
  [key: string]: any;
export interface SQLiteRow {
"' in expression or statement.
   at System.Management.Automation.Runspaces.PipelineBase.Invoke(IEnumerable input)
   at Microsoft.PowerShell.Executor.ExecuteCommandHelper(Pipeline tempPipeline, Exception& exceptionThrown, ExecutionOptions options) System.Management.Automation.ParseException: At line:1 char:6
+ cat << 'EOF' > src/adapters/base-adapter.ts
+      ~
Missing file specification after redirection operator.

At line:1 char:5
+ cat << 'EOF' > src/adapters/base-adapter.ts
+     ~
The '<' operator is reserved for future use.

At line:1 char:6
+ cat << 'EOF' > src/adapters/base-adapter.ts
+      ~
The '<' operator is reserved for future use.
   at System.Management.Automation.Runspaces.PipelineBase.Invoke(IEnumerable input)
   at Microsoft.PowerShell.Executor.ExecuteCommandHelper(Pipeline tempPipeline, Exception& exceptionThrown, ExecutionOptions options) The term 'EOF' is not recognized as the name of a cmdlet, function, script file, or operable program. Check the spelling of the name, or if a path was included, verify that the path is correct and try again. The term 'export' is not recognized as the name of a cmdlet, function, script file, or operable program. Check the spelling of the name, or if a path was included, verify that the path is correct and try again. System.Management.Automation.ParseException: At line:3 char:15
+   isSupported(): boolean;
+               ~
An expression was expected after '('.
   at System.Management.Automation.Runspaces.PipelineBase.Invoke(IEnumerable input)
   at Microsoft.PowerShell.Executor.ExecuteCommandHelper(Pipeline tempPipeline, Exception& exceptionThrown, ExecutionOptions options) System.Management.Automation.ParseException: At line:3 char:9
+   close(): Promise<void>;
+         ~
An expression was expected after '('.
   at System.Management.Automation.Runspaces.PipelineBase.Invoke(IEnumerable input)
   at Microsoft.PowerShell.Executor.ExecuteCommandHelper(Pipeline tempPipeline, Exception& exceptionThrown, ExecutionOptions options) The term 'export' is not recognized as the name of a cmdlet, function, script file, or operable program. Check the spelling of the name, or if a path was included, verify that the path is correct and try again. System.Management.Automation.ParseException: At line:2 char:6
+   [key: string]: any;
+      ~
Missing ] at end of attribute or type literal.

At line:2 char:7
+   [key: string]: any;
+       ~
Unexpected token ':' in expression or statement.
   at System.Management.Automation.Runspaces.PipelineBase.Invoke(IEnumerable input)
   at Microsoft.PowerShell.Executor.ExecuteCommandHelper(Pipeline tempPipeline, Exception& exceptionThrown, ExecutionOptions options) System.Management.Automation.ParseException: At line:1 char:6
+ cat << 'EOF' > src/types.ts
+      ~
Missing file specification after redirection operator.

At line:1 char:5
+ cat << 'EOF' > src/types.ts
+     ~
The '<' operator is reserved for future use.

At line:1 char:6
+ cat << 'EOF' > src/types.ts
+      ~
The '<' operator is reserved for future use.
   at System.Management.Automation.Runspaces.PipelineBase.Invoke(IEnumerable input)
   at Microsoft.PowerShell.Executor.ExecuteCommandHelper(Pipeline tempPipeline, Exception& exceptionThrown, ExecutionOptions options) An item with the specified name D:\ReactNative\dqcai-sqlite\src already exists.));
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
          return '';
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
          (error: any) => reject(new Error(Error closing database: ))
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
          reject(new Error(SQLite error: ));
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
      throw new Error(SQLite error: An item with the specified name D:\ReactNative\dqcai-sqlite\src already exists. An item with the specified name D:\ReactNative\dqcai-sqlite\src\adapters already exists. System.Management.Automation.ParseException: At line:1 char:24
+ " | Set-Content -Path "src/types.ts"
+                        ~~~~~~~~~~~~~
Unexpected token 'src/types.ts"
}
  busyTimeout?: number;
  timeout?: number;
  path: string;
export interface SQLiteConfig {

}
  isSupported(): boolean;
  connect(path: string): Promise<SQLiteConnection>;
export interface SQLiteAdapter {

}
  close(): Promise<void>;
  execute(sql: string, params?: any[]): Promise<SQLiteResult>;
export interface SQLiteConnection {

}
  lastInsertRowId?: number;
  rowsAffected: number;
  rows: SQLiteRow[];
export interface SQLiteResult {

}
  [key: string]: any;
export interface SQLiteRow {
"' in expression or statement.
   at System.Management.Automation.Runspaces.PipelineBase.Invoke(IEnumerable input)
   at Microsoft.PowerShell.Executor.ExecuteCommandHelper(Pipeline tempPipeline, Exception& exceptionThrown, ExecutionOptions options) System.Management.Automation.ParseException: At line:1 char:6
+ cat << 'EOF' > src/adapters/base-adapter.ts
+      ~
Missing file specification after redirection operator.

At line:1 char:5
+ cat << 'EOF' > src/adapters/base-adapter.ts
+     ~
The '<' operator is reserved for future use.

At line:1 char:6
+ cat << 'EOF' > src/adapters/base-adapter.ts
+      ~
The '<' operator is reserved for future use.
   at System.Management.Automation.Runspaces.PipelineBase.Invoke(IEnumerable input)
   at Microsoft.PowerShell.Executor.ExecuteCommandHelper(Pipeline tempPipeline, Exception& exceptionThrown, ExecutionOptions options) The term 'EOF' is not recognized as the name of a cmdlet, function, script file, or operable program. Check the spelling of the name, or if a path was included, verify that the path is correct and try again. The term 'export' is not recognized as the name of a cmdlet, function, script file, or operable program. Check the spelling of the name, or if a path was included, verify that the path is correct and try again. System.Management.Automation.ParseException: At line:3 char:15
+   isSupported(): boolean;
+               ~
An expression was expected after '('.
   at System.Management.Automation.Runspaces.PipelineBase.Invoke(IEnumerable input)
   at Microsoft.PowerShell.Executor.ExecuteCommandHelper(Pipeline tempPipeline, Exception& exceptionThrown, ExecutionOptions options) System.Management.Automation.ParseException: At line:3 char:9
+   close(): Promise<void>;
+         ~
An expression was expected after '('.
   at System.Management.Automation.Runspaces.PipelineBase.Invoke(IEnumerable input)
   at Microsoft.PowerShell.Executor.ExecuteCommandHelper(Pipeline tempPipeline, Exception& exceptionThrown, ExecutionOptions options) The term 'export' is not recognized as the name of a cmdlet, function, script file, or operable program. Check the spelling of the name, or if a path was included, verify that the path is correct and try again. System.Management.Automation.ParseException: At line:2 char:6
+   [key: string]: any;
+      ~
Missing ] at end of attribute or type literal.

At line:2 char:7
+   [key: string]: any;
+       ~
Unexpected token ':' in expression or statement.
   at System.Management.Automation.Runspaces.PipelineBase.Invoke(IEnumerable input)
   at Microsoft.PowerShell.Executor.ExecuteCommandHelper(Pipeline tempPipeline, Exception& exceptionThrown, ExecutionOptions options) System.Management.Automation.ParseException: At line:1 char:6
+ cat << 'EOF' > src/types.ts
+      ~
Missing file specification after redirection operator.

At line:1 char:5
+ cat << 'EOF' > src/types.ts
+     ~
The '<' operator is reserved for future use.

At line:1 char:6
+ cat << 'EOF' > src/types.ts
+      ~
The '<' operator is reserved for future use.
   at System.Management.Automation.Runspaces.PipelineBase.Invoke(IEnumerable input)
   at Microsoft.PowerShell.Executor.ExecuteCommandHelper(Pipeline tempPipeline, Exception& exceptionThrown, ExecutionOptions options) An item with the specified name D:\ReactNative\dqcai-sqlite\src already exists.);
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
      throw new Error(SQLite error: An item with the specified name D:\ReactNative\dqcai-sqlite\src already exists. An item with the specified name D:\ReactNative\dqcai-sqlite\src\adapters already exists. System.Management.Automation.ParseException: At line:1 char:24
+ " | Set-Content -Path "src/types.ts"
+                        ~~~~~~~~~~~~~
Unexpected token 'src/types.ts"
}
  busyTimeout?: number;
  timeout?: number;
  path: string;
export interface SQLiteConfig {

}
  isSupported(): boolean;
  connect(path: string): Promise<SQLiteConnection>;
export interface SQLiteAdapter {

}
  close(): Promise<void>;
  execute(sql: string, params?: any[]): Promise<SQLiteResult>;
export interface SQLiteConnection {

}
  lastInsertRowId?: number;
  rowsAffected: number;
  rows: SQLiteRow[];
export interface SQLiteResult {

}
  [key: string]: any;
export interface SQLiteRow {
"' in expression or statement.
   at System.Management.Automation.Runspaces.PipelineBase.Invoke(IEnumerable input)
   at Microsoft.PowerShell.Executor.ExecuteCommandHelper(Pipeline tempPipeline, Exception& exceptionThrown, ExecutionOptions options) System.Management.Automation.ParseException: At line:1 char:6
+ cat << 'EOF' > src/adapters/base-adapter.ts
+      ~
Missing file specification after redirection operator.

At line:1 char:5
+ cat << 'EOF' > src/adapters/base-adapter.ts
+     ~
The '<' operator is reserved for future use.

At line:1 char:6
+ cat << 'EOF' > src/adapters/base-adapter.ts
+      ~
The '<' operator is reserved for future use.
   at System.Management.Automation.Runspaces.PipelineBase.Invoke(IEnumerable input)
   at Microsoft.PowerShell.Executor.ExecuteCommandHelper(Pipeline tempPipeline, Exception& exceptionThrown, ExecutionOptions options) The term 'EOF' is not recognized as the name of a cmdlet, function, script file, or operable program. Check the spelling of the name, or if a path was included, verify that the path is correct and try again. The term 'export' is not recognized as the name of a cmdlet, function, script file, or operable program. Check the spelling of the name, or if a path was included, verify that the path is correct and try again. System.Management.Automation.ParseException: At line:3 char:15
+   isSupported(): boolean;
+               ~
An expression was expected after '('.
   at System.Management.Automation.Runspaces.PipelineBase.Invoke(IEnumerable input)
   at Microsoft.PowerShell.Executor.ExecuteCommandHelper(Pipeline tempPipeline, Exception& exceptionThrown, ExecutionOptions options) System.Management.Automation.ParseException: At line:3 char:9
+   close(): Promise<void>;
+         ~
An expression was expected after '('.
   at System.Management.Automation.Runspaces.PipelineBase.Invoke(IEnumerable input)
   at Microsoft.PowerShell.Executor.ExecuteCommandHelper(Pipeline tempPipeline, Exception& exceptionThrown, ExecutionOptions options) The term 'export' is not recognized as the name of a cmdlet, function, script file, or operable program. Check the spelling of the name, or if a path was included, verify that the path is correct and try again. System.Management.Automation.ParseException: At line:2 char:6
+   [key: string]: any;
+      ~
Missing ] at end of attribute or type literal.

At line:2 char:7
+   [key: string]: any;
+       ~
Unexpected token ':' in expression or statement.
   at System.Management.Automation.Runspaces.PipelineBase.Invoke(IEnumerable input)
   at Microsoft.PowerShell.Executor.ExecuteCommandHelper(Pipeline tempPipeline, Exception& exceptionThrown, ExecutionOptions options) System.Management.Automation.ParseException: At line:1 char:6
+ cat << 'EOF' > src/types.ts
+      ~
Missing file specification after redirection operator.

At line:1 char:5
+ cat << 'EOF' > src/types.ts
+     ~
The '<' operator is reserved for future use.

At line:1 char:6
+ cat << 'EOF' > src/types.ts
+      ~
The '<' operator is reserved for future use.
   at System.Management.Automation.Runspaces.PipelineBase.Invoke(IEnumerable input)
   at Microsoft.PowerShell.Executor.ExecuteCommandHelper(Pipeline tempPipeline, Exception& exceptionThrown, ExecutionOptions options) An item with the specified name D:\ReactNative\dqcai-sqlite\src already exists.);
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
              reject(new Error(SQLite error: ));
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
            reject(new Error(Cannot connect to React Native SQLite-2: ));
          }
        );
      } catch (error) {
        reject(new Error(React Native SQLite-2 not available: An item with the specified name D:\ReactNative\dqcai-sqlite\src already exists. An item with the specified name D:\ReactNative\dqcai-sqlite\src\adapters already exists. System.Management.Automation.ParseException: At line:1 char:24
+ " | Set-Content -Path "src/types.ts"
+                        ~~~~~~~~~~~~~
Unexpected token 'src/types.ts"
}
  busyTimeout?: number;
  timeout?: number;
  path: string;
export interface SQLiteConfig {

}
  isSupported(): boolean;
  connect(path: string): Promise<SQLiteConnection>;
export interface SQLiteAdapter {

}
  close(): Promise<void>;
  execute(sql: string, params?: any[]): Promise<SQLiteResult>;
export interface SQLiteConnection {

}
  lastInsertRowId?: number;
  rowsAffected: number;
  rows: SQLiteRow[];
export interface SQLiteResult {

}
  [key: string]: any;
export interface SQLiteRow {
"' in expression or statement.
   at System.Management.Automation.Runspaces.PipelineBase.Invoke(IEnumerable input)
   at Microsoft.PowerShell.Executor.ExecuteCommandHelper(Pipeline tempPipeline, Exception& exceptionThrown, ExecutionOptions options) System.Management.Automation.ParseException: At line:1 char:6
+ cat << 'EOF' > src/adapters/base-adapter.ts
+      ~
Missing file specification after redirection operator.

At line:1 char:5
+ cat << 'EOF' > src/adapters/base-adapter.ts
+     ~
The '<' operator is reserved for future use.

At line:1 char:6
+ cat << 'EOF' > src/adapters/base-adapter.ts
+      ~
The '<' operator is reserved for future use.
   at System.Management.Automation.Runspaces.PipelineBase.Invoke(IEnumerable input)
   at Microsoft.PowerShell.Executor.ExecuteCommandHelper(Pipeline tempPipeline, Exception& exceptionThrown, ExecutionOptions options) The term 'EOF' is not recognized as the name of a cmdlet, function, script file, or operable program. Check the spelling of the name, or if a path was included, verify that the path is correct and try again. The term 'export' is not recognized as the name of a cmdlet, function, script file, or operable program. Check the spelling of the name, or if a path was included, verify that the path is correct and try again. System.Management.Automation.ParseException: At line:3 char:15
+   isSupported(): boolean;
+               ~
An expression was expected after '('.
   at System.Management.Automation.Runspaces.PipelineBase.Invoke(IEnumerable input)
   at Microsoft.PowerShell.Executor.ExecuteCommandHelper(Pipeline tempPipeline, Exception& exceptionThrown, ExecutionOptions options) System.Management.Automation.ParseException: At line:3 char:9
+   close(): Promise<void>;
+         ~
An expression was expected after '('.
   at System.Management.Automation.Runspaces.PipelineBase.Invoke(IEnumerable input)
   at Microsoft.PowerShell.Executor.ExecuteCommandHelper(Pipeline tempPipeline, Exception& exceptionThrown, ExecutionOptions options) The term 'export' is not recognized as the name of a cmdlet, function, script file, or operable program. Check the spelling of the name, or if a path was included, verify that the path is correct and try again. System.Management.Automation.ParseException: At line:2 char:6
+   [key: string]: any;
+      ~
Missing ] at end of attribute or type literal.

At line:2 char:7
+   [key: string]: any;
+       ~
Unexpected token ':' in expression or statement.
   at System.Management.Automation.Runspaces.PipelineBase.Invoke(IEnumerable input)
   at Microsoft.PowerShell.Executor.ExecuteCommandHelper(Pipeline tempPipeline, Exception& exceptionThrown, ExecutionOptions options) System.Management.Automation.ParseException: At line:1 char:6
+ cat << 'EOF' > src/types.ts
+      ~
Missing file specification after redirection operator.

At line:1 char:5
+ cat << 'EOF' > src/types.ts
+     ~
The '<' operator is reserved for future use.

At line:1 char:6
+ cat << 'EOF' > src/types.ts
+      ~
The '<' operator is reserved for future use.
   at System.Management.Automation.Runspaces.PipelineBase.Invoke(IEnumerable input)
   at Microsoft.PowerShell.Executor.ExecuteCommandHelper(Pipeline tempPipeline, Exception& exceptionThrown, ExecutionOptions options) An item with the specified name D:\ReactNative\dqcai-sqlite\src already exists.));
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
      throw new Error(Cannot connect to React Native Windows SQLite: An item with the specified name D:\ReactNative\dqcai-sqlite\src already exists. An item with the specified name D:\ReactNative\dqcai-sqlite\src\adapters already exists. System.Management.Automation.ParseException: At line:1 char:24
+ " | Set-Content -Path "src/types.ts"
+                        ~~~~~~~~~~~~~
Unexpected token 'src/types.ts"
}
  busyTimeout?: number;
  timeout?: number;
  path: string;
export interface SQLiteConfig {

}
  isSupported(): boolean;
  connect(path: string): Promise<SQLiteConnection>;
export interface SQLiteAdapter {

}
  close(): Promise<void>;
  execute(sql: string, params?: any[]): Promise<SQLiteResult>;
export interface SQLiteConnection {

}
  lastInsertRowId?: number;
  rowsAffected: number;
  rows: SQLiteRow[];
export interface SQLiteResult {

}
  [key: string]: any;
export interface SQLiteRow {
"' in expression or statement.
   at System.Management.Automation.Runspaces.PipelineBase.Invoke(IEnumerable input)
   at Microsoft.PowerShell.Executor.ExecuteCommandHelper(Pipeline tempPipeline, Exception& exceptionThrown, ExecutionOptions options) System.Management.Automation.ParseException: At line:1 char:6
+ cat << 'EOF' > src/adapters/base-adapter.ts
+      ~
Missing file specification after redirection operator.

At line:1 char:5
+ cat << 'EOF' > src/adapters/base-adapter.ts
+     ~
The '<' operator is reserved for future use.

At line:1 char:6
+ cat << 'EOF' > src/adapters/base-adapter.ts
+      ~
The '<' operator is reserved for future use.
   at System.Management.Automation.Runspaces.PipelineBase.Invoke(IEnumerable input)
   at Microsoft.PowerShell.Executor.ExecuteCommandHelper(Pipeline tempPipeline, Exception& exceptionThrown, ExecutionOptions options) The term 'EOF' is not recognized as the name of a cmdlet, function, script file, or operable program. Check the spelling of the name, or if a path was included, verify that the path is correct and try again. The term 'export' is not recognized as the name of a cmdlet, function, script file, or operable program. Check the spelling of the name, or if a path was included, verify that the path is correct and try again. System.Management.Automation.ParseException: At line:3 char:15
+   isSupported(): boolean;
+               ~
An expression was expected after '('.
   at System.Management.Automation.Runspaces.PipelineBase.Invoke(IEnumerable input)
   at Microsoft.PowerShell.Executor.ExecuteCommandHelper(Pipeline tempPipeline, Exception& exceptionThrown, ExecutionOptions options) System.Management.Automation.ParseException: At line:3 char:9
+   close(): Promise<void>;
+         ~
An expression was expected after '('.
   at System.Management.Automation.Runspaces.PipelineBase.Invoke(IEnumerable input)
   at Microsoft.PowerShell.Executor.ExecuteCommandHelper(Pipeline tempPipeline, Exception& exceptionThrown, ExecutionOptions options) The term 'export' is not recognized as the name of a cmdlet, function, script file, or operable program. Check the spelling of the name, or if a path was included, verify that the path is correct and try again. System.Management.Automation.ParseException: At line:2 char:6
+   [key: string]: any;
+      ~
Missing ] at end of attribute or type literal.

At line:2 char:7
+   [key: string]: any;
+       ~
Unexpected token ':' in expression or statement.
   at System.Management.Automation.Runspaces.PipelineBase.Invoke(IEnumerable input)
   at Microsoft.PowerShell.Executor.ExecuteCommandHelper(Pipeline tempPipeline, Exception& exceptionThrown, ExecutionOptions options) System.Management.Automation.ParseException: At line:1 char:6
+ cat << 'EOF' > src/types.ts
+      ~
Missing file specification after redirection operator.

At line:1 char:5
+ cat << 'EOF' > src/types.ts
+     ~
The '<' operator is reserved for future use.

At line:1 char:6
+ cat << 'EOF' > src/types.ts
+      ~
The '<' operator is reserved for future use.
   at System.Management.Automation.Runspaces.PipelineBase.Invoke(IEnumerable input)
   at Microsoft.PowerShell.Executor.ExecuteCommandHelper(Pipeline tempPipeline, Exception& exceptionThrown, ExecutionOptions options) An item with the specified name D:\ReactNative\dqcai-sqlite\src already exists.);
    }
  }

  private async connectExpo(path: string): Promise<SQLiteConnection> {
    try {
      const SQLite = require('expo-sqlite');
      const db = SQLite.openDatabaseSync(path);
      return new ExpoSQLiteConnection(db);
    } catch (error) {
      throw new Error(Cannot connect to Expo SQLite database: An item with the specified name D:\ReactNative\dqcai-sqlite\src already exists. An item with the specified name D:\ReactNative\dqcai-sqlite\src\adapters already exists. System.Management.Automation.ParseException: At line:1 char:24
+ " | Set-Content -Path "src/types.ts"
+                        ~~~~~~~~~~~~~
Unexpected token 'src/types.ts"
}
  busyTimeout?: number;
  timeout?: number;
  path: string;
export interface SQLiteConfig {

}
  isSupported(): boolean;
  connect(path: string): Promise<SQLiteConnection>;
export interface SQLiteAdapter {

}
  close(): Promise<void>;
  execute(sql: string, params?: any[]): Promise<SQLiteResult>;
export interface SQLiteConnection {

}
  lastInsertRowId?: number;
  rowsAffected: number;
  rows: SQLiteRow[];
export interface SQLiteResult {

}
  [key: string]: any;
export interface SQLiteRow {
"' in expression or statement.
   at System.Management.Automation.Runspaces.PipelineBase.Invoke(IEnumerable input)
   at Microsoft.PowerShell.Executor.ExecuteCommandHelper(Pipeline tempPipeline, Exception& exceptionThrown, ExecutionOptions options) System.Management.Automation.ParseException: At line:1 char:6
+ cat << 'EOF' > src/adapters/base-adapter.ts
+      ~
Missing file specification after redirection operator.

At line:1 char:5
+ cat << 'EOF' > src/adapters/base-adapter.ts
+     ~
The '<' operator is reserved for future use.

At line:1 char:6
+ cat << 'EOF' > src/adapters/base-adapter.ts
+      ~
The '<' operator is reserved for future use.
   at System.Management.Automation.Runspaces.PipelineBase.Invoke(IEnumerable input)
   at Microsoft.PowerShell.Executor.ExecuteCommandHelper(Pipeline tempPipeline, Exception& exceptionThrown, ExecutionOptions options) The term 'EOF' is not recognized as the name of a cmdlet, function, script file, or operable program. Check the spelling of the name, or if a path was included, verify that the path is correct and try again. The term 'export' is not recognized as the name of a cmdlet, function, script file, or operable program. Check the spelling of the name, or if a path was included, verify that the path is correct and try again. System.Management.Automation.ParseException: At line:3 char:15
+   isSupported(): boolean;
+               ~
An expression was expected after '('.
   at System.Management.Automation.Runspaces.PipelineBase.Invoke(IEnumerable input)
   at Microsoft.PowerShell.Executor.ExecuteCommandHelper(Pipeline tempPipeline, Exception& exceptionThrown, ExecutionOptions options) System.Management.Automation.ParseException: At line:3 char:9
+   close(): Promise<void>;
+         ~
An expression was expected after '('.
   at System.Management.Automation.Runspaces.PipelineBase.Invoke(IEnumerable input)
   at Microsoft.PowerShell.Executor.ExecuteCommandHelper(Pipeline tempPipeline, Exception& exceptionThrown, ExecutionOptions options) The term 'export' is not recognized as the name of a cmdlet, function, script file, or operable program. Check the spelling of the name, or if a path was included, verify that the path is correct and try again. System.Management.Automation.ParseException: At line:2 char:6
+   [key: string]: any;
+      ~
Missing ] at end of attribute or type literal.

At line:2 char:7
+   [key: string]: any;
+       ~
Unexpected token ':' in expression or statement.
   at System.Management.Automation.Runspaces.PipelineBase.Invoke(IEnumerable input)
   at Microsoft.PowerShell.Executor.ExecuteCommandHelper(Pipeline tempPipeline, Exception& exceptionThrown, ExecutionOptions options) System.Management.Automation.ParseException: At line:1 char:6
+ cat << 'EOF' > src/types.ts
+      ~
Missing file specification after redirection operator.

At line:1 char:5
+ cat << 'EOF' > src/types.ts
+     ~
The '<' operator is reserved for future use.

At line:1 char:6
+ cat << 'EOF' > src/types.ts
+      ~
The '<' operator is reserved for future use.
   at System.Management.Automation.Runspaces.PipelineBase.Invoke(IEnumerable input)
   at Microsoft.PowerShell.Executor.ExecuteCommandHelper(Pipeline tempPipeline, Exception& exceptionThrown, ExecutionOptions options) An item with the specified name D:\ReactNative\dqcai-sqlite\src already exists.);
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
          reject(new Error(Cannot connect to React Native SQLite database: ));
        });
      } catch (error) {
        reject(new Error(React Native SQLite Storage not available: An item with the specified name D:\ReactNative\dqcai-sqlite\src already exists. An item with the specified name D:\ReactNative\dqcai-sqlite\src\adapters already exists. System.Management.Automation.ParseException: At line:1 char:24
+ " | Set-Content -Path "src/types.ts"
+                        ~~~~~~~~~~~~~
Unexpected token 'src/types.ts"
}
  busyTimeout?: number;
  timeout?: number;
  path: string;
export interface SQLiteConfig {

}
  isSupported(): boolean;
  connect(path: string): Promise<SQLiteConnection>;
export interface SQLiteAdapter {

}
  close(): Promise<void>;
  execute(sql: string, params?: any[]): Promise<SQLiteResult>;
export interface SQLiteConnection {

}
  lastInsertRowId?: number;
  rowsAffected: number;
  rows: SQLiteRow[];
export interface SQLiteResult {

}
  [key: string]: any;
export interface SQLiteRow {
"' in expression or statement.
   at System.Management.Automation.Runspaces.PipelineBase.Invoke(IEnumerable input)
   at Microsoft.PowerShell.Executor.ExecuteCommandHelper(Pipeline tempPipeline, Exception& exceptionThrown, ExecutionOptions options) System.Management.Automation.ParseException: At line:1 char:6
+ cat << 'EOF' > src/adapters/base-adapter.ts
+      ~
Missing file specification after redirection operator.

At line:1 char:5
+ cat << 'EOF' > src/adapters/base-adapter.ts
+     ~
The '<' operator is reserved for future use.

At line:1 char:6
+ cat << 'EOF' > src/adapters/base-adapter.ts
+      ~
The '<' operator is reserved for future use.
   at System.Management.Automation.Runspaces.PipelineBase.Invoke(IEnumerable input)
   at Microsoft.PowerShell.Executor.ExecuteCommandHelper(Pipeline tempPipeline, Exception& exceptionThrown, ExecutionOptions options) The term 'EOF' is not recognized as the name of a cmdlet, function, script file, or operable program. Check the spelling of the name, or if a path was included, verify that the path is correct and try again. The term 'export' is not recognized as the name of a cmdlet, function, script file, or operable program. Check the spelling of the name, or if a path was included, verify that the path is correct and try again. System.Management.Automation.ParseException: At line:3 char:15
+   isSupported(): boolean;
+               ~
An expression was expected after '('.
   at System.Management.Automation.Runspaces.PipelineBase.Invoke(IEnumerable input)
   at Microsoft.PowerShell.Executor.ExecuteCommandHelper(Pipeline tempPipeline, Exception& exceptionThrown, ExecutionOptions options) System.Management.Automation.ParseException: At line:3 char:9
+   close(): Promise<void>;
+         ~
An expression was expected after '('.
   at System.Management.Automation.Runspaces.PipelineBase.Invoke(IEnumerable input)
   at Microsoft.PowerShell.Executor.ExecuteCommandHelper(Pipeline tempPipeline, Exception& exceptionThrown, ExecutionOptions options) The term 'export' is not recognized as the name of a cmdlet, function, script file, or operable program. Check the spelling of the name, or if a path was included, verify that the path is correct and try again. System.Management.Automation.ParseException: At line:2 char:6
+   [key: string]: any;
+      ~
Missing ] at end of attribute or type literal.

At line:2 char:7
+   [key: string]: any;
+       ~
Unexpected token ':' in expression or statement.
   at System.Management.Automation.Runspaces.PipelineBase.Invoke(IEnumerable input)
   at Microsoft.PowerShell.Executor.ExecuteCommandHelper(Pipeline tempPipeline, Exception& exceptionThrown, ExecutionOptions options) System.Management.Automation.ParseException: At line:1 char:6
+ cat << 'EOF' > src/types.ts
+      ~
Missing file specification after redirection operator.

At line:1 char:5
+ cat << 'EOF' > src/types.ts
+     ~
The '<' operator is reserved for future use.

At line:1 char:6
+ cat << 'EOF' > src/types.ts
+      ~
The '<' operator is reserved for future use.
   at System.Management.Automation.Runspaces.PipelineBase.Invoke(IEnumerable input)
   at Microsoft.PowerShell.Executor.ExecuteCommandHelper(Pipeline tempPipeline, Exception& exceptionThrown, ExecutionOptions options) An item with the specified name D:\ReactNative\dqcai-sqlite\src already exists.));
      }
    });
  }

  private async connectWebView(path: string): Promise<SQLiteConnection> {
    try {
      const db = window.openDatabase(path, '1.0', 'Database', 2 * 1024 * 1024);
      return new ReactNativeSQLiteConnection(db, path);
    } catch (error) {
      throw new Error(Cannot connect to WebView SQLite database: An item with the specified name D:\ReactNative\dqcai-sqlite\src already exists. An item with the specified name D:\ReactNative\dqcai-sqlite\src\adapters already exists. System.Management.Automation.ParseException: At line:1 char:24
+ " | Set-Content -Path "src/types.ts"
+                        ~~~~~~~~~~~~~
Unexpected token 'src/types.ts"
}
  busyTimeout?: number;
  timeout?: number;
  path: string;
export interface SQLiteConfig {

}
  isSupported(): boolean;
  connect(path: string): Promise<SQLiteConnection>;
export interface SQLiteAdapter {

}
  close(): Promise<void>;
  execute(sql: string, params?: any[]): Promise<SQLiteResult>;
export interface SQLiteConnection {

}
  lastInsertRowId?: number;
  rowsAffected: number;
  rows: SQLiteRow[];
export interface SQLiteResult {

}
  [key: string]: any;
export interface SQLiteRow {
"' in expression or statement.
   at System.Management.Automation.Runspaces.PipelineBase.Invoke(IEnumerable input)
   at Microsoft.PowerShell.Executor.ExecuteCommandHelper(Pipeline tempPipeline, Exception& exceptionThrown, ExecutionOptions options) System.Management.Automation.ParseException: At line:1 char:6
+ cat << 'EOF' > src/adapters/base-adapter.ts
+      ~
Missing file specification after redirection operator.

At line:1 char:5
+ cat << 'EOF' > src/adapters/base-adapter.ts
+     ~
The '<' operator is reserved for future use.

At line:1 char:6
+ cat << 'EOF' > src/adapters/base-adapter.ts
+      ~
The '<' operator is reserved for future use.
   at System.Management.Automation.Runspaces.PipelineBase.Invoke(IEnumerable input)
   at Microsoft.PowerShell.Executor.ExecuteCommandHelper(Pipeline tempPipeline, Exception& exceptionThrown, ExecutionOptions options) The term 'EOF' is not recognized as the name of a cmdlet, function, script file, or operable program. Check the spelling of the name, or if a path was included, verify that the path is correct and try again. The term 'export' is not recognized as the name of a cmdlet, function, script file, or operable program. Check the spelling of the name, or if a path was included, verify that the path is correct and try again. System.Management.Automation.ParseException: At line:3 char:15
+   isSupported(): boolean;
+               ~
An expression was expected after '('.
   at System.Management.Automation.Runspaces.PipelineBase.Invoke(IEnumerable input)
   at Microsoft.PowerShell.Executor.ExecuteCommandHelper(Pipeline tempPipeline, Exception& exceptionThrown, ExecutionOptions options) System.Management.Automation.ParseException: At line:3 char:9
+   close(): Promise<void>;
+         ~
An expression was expected after '('.
   at System.Management.Automation.Runspaces.PipelineBase.Invoke(IEnumerable input)
   at Microsoft.PowerShell.Executor.ExecuteCommandHelper(Pipeline tempPipeline, Exception& exceptionThrown, ExecutionOptions options) The term 'export' is not recognized as the name of a cmdlet, function, script file, or operable program. Check the spelling of the name, or if a path was included, verify that the path is correct and try again. System.Management.Automation.ParseException: At line:2 char:6
+   [key: string]: any;
+      ~
Missing ] at end of attribute or type literal.

At line:2 char:7
+   [key: string]: any;
+       ~
Unexpected token ':' in expression or statement.
   at System.Management.Automation.Runspaces.PipelineBase.Invoke(IEnumerable input)
   at Microsoft.PowerShell.Executor.ExecuteCommandHelper(Pipeline tempPipeline, Exception& exceptionThrown, ExecutionOptions options) System.Management.Automation.ParseException: At line:1 char:6
+ cat << 'EOF' > src/types.ts
+      ~
Missing file specification after redirection operator.

At line:1 char:5
+ cat << 'EOF' > src/types.ts
+     ~
The '<' operator is reserved for future use.

At line:1 char:6
+ cat << 'EOF' > src/types.ts
+      ~
The '<' operator is reserved for future use.
   at System.Management.Automation.Runspaces.PipelineBase.Invoke(IEnumerable input)
   at Microsoft.PowerShell.Executor.ExecuteCommandHelper(Pipeline tempPipeline, Exception& exceptionThrown, ExecutionOptions options) An item with the specified name D:\ReactNative\dqcai-sqlite\src already exists.);
    }
  }
}

