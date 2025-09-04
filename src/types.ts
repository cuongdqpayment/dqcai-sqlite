// src/types/core.ts
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

// Enhanced schema types based on SQLiteDAO
export interface TypeMappingConfig {
  type_mapping: {
    [targetType: string]: {
      [sourceType: string]: string;
    };
  };
}

export interface ColumnDefinition {
  name: string;
  type: string;
  precision?: number;
  scale?: number;
  option_key?: string;
  description?: string;
  nullable?: boolean;
  default?: any;
  primary_key?: boolean;
  auto_increment?: boolean;
  enum?: string[] | number[];
  unique?: boolean;
  constraints?: string;
  length?: number;
}

export interface Column {
  name: string;
  value?: any;
}

export interface WhereClause {
  name: string;
  value: any;
  operator?: string;
}

export interface OrderByClause {
  name: string;
  direction?: "ASC" | "DESC";
}

export interface LimitOffset {
  limit?: number;
  offset?: number;
}

export interface QueryTable {
  name: string;
  cols: Column[];
  wheres?: WhereClause[];
  orderbys?: OrderByClause[];
  limitOffset?: LimitOffset;
}

export interface JoinClause {
  type: "INNER" | "LEFT" | "RIGHT" | "FULL";
  table: string;
  on: string;
}

export interface IndexDefinition {
  name: string;
  columns: string[];
  unique?: boolean;
  description?: string;
}

export type ForeignKeyAction =
  | "CASCADE"
  | "RESTRICT"
  | "SET NULL"
  | "NO ACTION"
  | undefined;

export interface ForeignKeyDefinition {
  name: string;
  column: string;
  references: {
    table: string;
    column: string;
  };
  on_delete?: string | ForeignKeyAction;
  on_update?: string | ForeignKeyAction;
  description?: string;
}

export interface TableDefinition {
  name: string;
  cols: ColumnDefinition[];
  description?: string;
  indexes?: IndexDefinition[];
  foreign_keys?: ForeignKeyDefinition[];
}

export interface DatabaseSchema {
  version: string;
  database_name: string;
  description?: string;
  type_mapping?: TypeMappingConfig["type_mapping"];
  schemas: Record<
    string,
    {
      description?: string;
      cols: ColumnDefinition[];
      indexes?: IndexDefinition[];
      foreign_keys?: ForeignKeyDefinition[];
    }
  >;
}

// Transaction types
export interface TransactionOperation {
  type: "insert" | "update" | "delete" | "select";
  table: QueryTable;
}

export interface ImportOptions {
  tableName: string;
  data: Record<string, any>[];
  batchSize?: number;
  onProgress?: (processed: number, total: number) => void;
  onError?: (
    error: Error,
    rowIndex: number,
    rowData: Record<string, any>
  ) => void;
  skipErrors?: boolean;
  validateData?: boolean;
  updateOnConflict?: boolean;
  conflictColumns?: string[];
  includeAutoIncrementPK?: boolean;
}

export interface ImportResult {
  totalRows: number;
  successRows: number;
  errorRows: number;
  errors: Array<{
    rowIndex: number;
    error: string;
    rowData: Record<string, any>;
  }>;
  executionTime: number;
}

// Interface cho mapping column
export interface ColumnMapping {
  sourceColumn: string;
  targetColumn: string;
  transform?: (value: any) => any;
}

// Interface for database factory options
export interface DbFactoryOptions {
  config?: DatabaseSchema; // Option 1: Provide a config object directly
  configAsset?: any; // Option 3: Provide a required JSON asset
  dbDirectory?: string; // Optional: Directory to store the .db file
  adapter?: SQLiteAdapter; // Optional: Specific adapter to use
}

// Thêm kiểu kiểm tra sức khỏe của Database
export interface ServiceStatus {
  schemaName: string;
  isOpened: boolean;
  isInitialized: boolean;
  hasDao: boolean;
}

export interface HealthCheckResult {
  healthy: boolean;
  schemaName: string;
  recordCount?: number;
  error?: string;
  timestamp: string;
}

// Global type declarations for different environments
declare global {
  // Browser environment
  interface Window {
    SQL?: any;
    initSqlJs?: (config?: any) => Promise<any>;
    openDatabase?: (
      name: string,
      version: string,
      displayName: string,
      estimatedSize: number
    ) => any;
  }

  // Deno environment
  var Deno:
    | {
        env: any;
        readTextFile?: (path: string) => Promise<string>;
        writeTextFile?: (path: string, data: string) => Promise<void>;
        version?: { deno: string };
        [key: string]: any;
      }
    | undefined;

  // Bun environment
  var Bun:
    | {
        version: string;
        [key: string]: any;
      }
    | undefined;

  // React Native Windows
  var Windows: any;

  // Nodejs
  var process: any;

  // React Native Platform
  var Platform:
    | {
        OS: string;
        Version?: string;
      }
    | undefined;

  // Navigator (React Native detection)
  // var navigator: {
  //   product?: string;
  // } | undefined;
}
