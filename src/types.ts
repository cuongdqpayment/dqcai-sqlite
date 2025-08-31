// src/types.ts
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

// Global type declarations for different environments
declare global {
  // Browser environment
  interface Window {
    SQL?: any;
    initSqlJs?: (config?: any) => Promise<any>;
    openDatabase?: (name: string, version: string, displayName: string, estimatedSize: number) => any;
  }

  // Deno environment
  var Deno: {
    env: any;
    version?: { deno: string };
    [key: string]: any;
  } | undefined;

  // Bun environment
  var Bun: {
    version: string;
    [key: string]: any;
  } | undefined;

  // React Native Windows
  var Windows: any;
  
  // React Native Platform
  var Platform: {
    OS: string;
    Version?: string;
  } | undefined;

  // Navigator (React Native detection)
  // var navigator: {
  //   product?: string;
  // } | undefined;
}