
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
      throw new Error(Cannot connect to browser database: An item with the specified name D:\ReactNative\dqcai-sqlite\src already exists. An item with the specified name D:\ReactNative\dqcai-sqlite\src\adapters already exists. System.Management.Automation.ParseException: At line:1 char:24
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

  private async loadSqlJs(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js';
      script.onload = async () => {
        try {
          this.sqlJs = await window.initSqlJs({
            locateFile: (file: string) => https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/
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
    const stored = localStorage.getItem(sqlite_db_);
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

