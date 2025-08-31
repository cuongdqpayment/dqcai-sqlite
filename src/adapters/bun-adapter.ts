
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
      throw new Error(Cannot connect to Bun database: An item with the specified name D:\ReactNative\dqcai-sqlite\src already exists. An item with the specified name D:\ReactNative\dqcai-sqlite\src\adapters already exists. System.Management.Automation.ParseException: At line:1 char:24
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

