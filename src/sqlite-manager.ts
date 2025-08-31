
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
      throw new Error(Failed to connect to SQLite database: An item with the specified name D:\ReactNative\dqcai-sqlite\src already exists. An item with the specified name D:\ReactNative\dqcai-sqlite\src\adapters already exists. System.Management.Automation.ParseException: At line:1 char:24
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

