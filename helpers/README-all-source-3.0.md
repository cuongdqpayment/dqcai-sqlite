```ts
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
  isSupported(): Promise<boolean>;
  name?: string;
  version?: string;
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
  columns: string[];
  references: {
    table: string;
    columns: string[];
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
  tableName: string;
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

export const SQLITE_TYPE_MAPPING = {
  sqlite: {
    // String types
    string: "TEXT",
    varchar: "TEXT",
    char: "TEXT",
    text: "TEXT",
    email: "TEXT",
    url: "TEXT",
    uuid: "TEXT",

    // Numeric types
    integer: "INTEGER",
    int: "INTEGER",
    bigint: "INTEGER",
    smallint: "INTEGER",
    tinyint: "INTEGER",
    number: "REAL",
    decimal: "REAL",
    numeric: "REAL",
    float: "REAL",
    double: "REAL",

    // Boolean
    boolean: "INTEGER",
    bool: "INTEGER",

    // Date/Time types
    timestamp: "TEXT",
    datetime: "TEXT",
    date: "TEXT",
    time: "TEXT",

    // Complex types
    json: "TEXT",
    jsonb: "TEXT",
    array: "TEXT",
    object: "TEXT",

    // Binary types
    blob: "BLOB",
    binary: "BLOB",

    // MongoDB specific (fallback)
    objectid: "TEXT",
  },
};
```

```ts
// src/logger/index.ts

import {
  BaseModule,
  LoggerConfigBuilder,
  CommonModules,
  CommonLoggerConfig,
  createModuleLogger,
} from "@dqcai/logger";

const SQLiteModules = {
  ...CommonModules,
  DATABASE_MANAGER: "DatabaseManager",
  DATABASE_FACTORY: "DatabaseFactory",
  UNIVERSAL_DAO: "UniversalDAO",
  BASE_SERVICE: "BaseService",
  SERVICE_MANAGER: "ServiceManager",
  QUERY_BUILDER: "QueryBuilder",
  BASE_ADAPTER: "BaseAdapter",
  UNIVERSAL_SQLITE: "UniversalSQLite",
  TRANSACTION: "Transaction",
  CONNECTION: "Connection",
};

const config = new LoggerConfigBuilder()
  .setEnabled(true)
  .setDefaultLevel("warn")
  .build();
// cập nhập cấu hình trong dự án này
CommonLoggerConfig.updateConfiguration(config);
// nếu nhúng vào các dự án khác thì cập nhập cấu hình mới là được
// gọi chung instance
export { BaseModule, createModuleLogger, SQLiteModules, CommonLoggerConfig };
```

```ts
// src/adapters/base-adapter.ts
import { SQLiteAdapter, SQLiteConnection } from '../types';
export abstract class BaseAdapter implements SQLiteAdapter {
  abstract connect(path: string): Promise<SQLiteConnection>;
  abstract isSupported(): Promise<boolean>;

  protected sanitizeSQL(sql: string): string {
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
```

```ts
/* eslint-disable quotes */
// ./src/adapters/ReactNativeAdapter.ts
import { BaseAdapter } from "./base-adapter";
import { createModuleLogger, SQLiteModules } from "../logger";
const logger = createModuleLogger(SQLiteModules.BASE_ADAPTER);

// Định nghĩa types để tránh lỗi TypeScript
type SQLiteDatabase = any;
type SQLiteModule = any;
type PlatformModule = any;

export class ReactNativeAdapter extends BaseAdapter {
  private SQLite: SQLiteModule | null = null;
  private Platform: PlatformModule | null = null;

  async isSupported(): Promise<boolean> {
    try {
      // Load Platform module động
      const { Platform } = await import("react-native");
      this.Platform = Platform;

      // Kiểm tra xem có đang chạy trong môi trường React Native không
      return Platform.OS === "ios" || Platform.OS === "android";
    } catch (error) {
      logger.debug("React Native environment not detected", error);
      return false;
    }
  }

  private async loadSQLite(): Promise<SQLiteModule> {
    if (this.SQLite) {
      return this.SQLite;
    }

    try {
      // Dynamic import SQLite module
      const SQLiteModule = (await import("react-native-sqlite-storage"))
        .default;

      // Cấu hình SQLite
      SQLiteModule.DEBUG(false);
      SQLiteModule.enablePromise(true);

      this.SQLite = SQLiteModule;
      return SQLiteModule;
    } catch (error) {
      logger.error("Failed to load react-native-sqlite-storage", error);
      throw new Error(
        "react-native-sqlite-storage is not available in this environment"
      );
    }
  }

  async connect(dbPath: string): Promise<any> {
    try {
      // Kiểm tra môi trường trước
      const supported = await this.isSupported();
      if (!supported) {
        throw new Error("React Native environment is not supported");
      }

      // Load SQLite module động
      const SQLite = await this.loadSQLite();

      // Tạo kết nối đến database
      // React Native SQLite sẽ tự động tạo file database nếu chưa tồn tại
      const database = await SQLite.openDatabase({
        name: dbPath,
        location: "default", // Sử dụng vị trí mặc định
      });

      logger.debug(`Connected to database: ${dbPath}`, database);

      return new ReactNativeConnection(database);
    } catch (error) {
      logger.error(`Failed to connect to database: ${dbPath}`, error);
      throw new Error(`Failed to connect to database: ${error}`);
    }
  }
}

class ReactNativeConnection {
  constructor(private db: SQLiteDatabase) {}

  async execute(sql: string, params: any[] = []): Promise<any> {
    try {
      const isSelect = sql.trim().toUpperCase().startsWith("SELECT");

      if (isSelect) {
        // Xử lý câu lệnh SELECT
        const results = await this.db.executeSql(sql, params);
        const rows: any[] = [];

        if (results && results.length > 0) {
          const result = results[0];
          logger.debug(`SQL SELECT result:`, result);
          // Chuyển đổi ResultSet thành array
          for (let i = 0; i < result.rows.length; i++) {
            rows.push(result.rows.item(i));
          }
          logger.debug(`SQL SELECT rows:`, rows);
        }

        return {
          rows: rows,
          rowsAffected: 0,
        };
      } else {
        // Xử lý các câu lệnh INSERT, UPDATE, DELETE, CREATE, etc.
        const results = await this.db.executeSql(sql, params);

        if (results && results.length > 0) {
          const result = results[0];
          logger.debug(`SQL execution result:`, result);
          return {
            rows: result.rows?.raw() || [],
            rowsAffected: result.rowsAffected || 0,
            lastInsertRowId: result.insertId || undefined,
          };
        }

        return {
          rows: [],
          rowsAffected: 0,
        };
      }
    } catch (error) {
      logger.error(`SQL execution failed`, error);
      throw error;
    }
  }

  async close(): Promise<void> {
    try {
      await this.db.close();
    } catch (error) {
      logger.error(`Close Error:`, error);
      throw error;
    }
  }

  // Phương thức bổ sung để thực hiện transaction
  async transaction(fn: (tx: any) => Promise<void>): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        async (tx: any) => {
          try {
            await fn(new ReactNativeTransaction(tx));
            resolve();
          } catch (error) {
            reject(error);
          }
        },
        (error: any) => {
          reject(error);
        }
      );
    });
  }
}

// Class hỗ trợ cho transaction
class ReactNativeTransaction {
  constructor(private tx: any) {}

  async executeSql(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.tx.executeSql(
        sql,
        params,
        (tx: any, results: any) => {
          const isSelect = sql.trim().toUpperCase().startsWith("SELECT");

          if (isSelect) {
            const rows: any[] = [];
            for (let i = 0; i < results.rows.length; i++) {
              rows.push(results.rows.item(i));
            }
            resolve({
              rows: rows,
              rowsAffected: 0,
            });
          } else {
            resolve({
              rows: [],
              rowsAffected: results.rowsAffected || 0,
              lastInsertRowId: results.insertId || undefined,
            });
          }
        },
        (tx: any, error: any) => {
          reject(error);
        }
      );
    });
  }
}
```

```ts
/* eslint-disable quotes */
// ./srr/adapters/NodeJSAdapter.ts
import { BaseAdapter } from "./base-adapter";
import { createModuleLogger, SQLiteModules } from "../logger";
const logger = createModuleLogger(SQLiteModules.BASE_ADAPTER);

// Định nghĩa types để tránh lỗi TypeScript
type BetterSqlite3Database = any;
type BetterSqlite3Constructor = any;

export class NodeJSAdapter extends BaseAdapter {
  private Database: BetterSqlite3Constructor | null = null;

  async isSupported(): Promise<boolean> {
    try {
      // Kiểm tra xem có đang chạy trong môi trường Node.js không
      return (
        typeof process !== "undefined" &&
        process.versions != null &&
        process.versions.node != null
      );
    } catch (error) {
      logger.debug("Node.js environment not detected", error);
      return false;
    }
  }

  private async loadBetterSqlite3(): Promise<BetterSqlite3Constructor> {
    if (this.Database) {
      return this.Database;
    }

    try {
      // Dynamic import better-sqlite3 module
      const BetterSqlite3 = (await import("better-sqlite3")).default;

      this.Database = BetterSqlite3;
      return BetterSqlite3;
    } catch (error) {
      logger.error("Failed to load better-sqlite3", error);
      throw new Error(
        "better-sqlite3 is not available in this environment"
      );
    }
  }

  async connect(dbPath: string): Promise<any> {
    try {
      // Kiểm tra môi trường trước
      const supported = await this.isSupported();
      if (!supported) {
        throw new Error("Node.js environment is not supported");
      }

      // Load better-sqlite3 module động
      const Database = await this.loadBetterSqlite3();

      // Tạo kết nối đến database
      const database = new Database(dbPath, {
        // verbose: console.log, // Uncomment để debug
      });

      // Cấu hình pragma cho hiệu suất tốt hơn
      database.pragma("journal_mode = WAL");
      database.pragma("synchronous = NORMAL");

      logger.debug(`Connected to database: ${dbPath}`, database);

      return new NodeJSConnection(database);
    } catch (error) {
      logger.error(`Failed to connect to database: ${dbPath}`, error);
      throw new Error(`Failed to connect to database: ${error}`);
    }
  }
}

class NodeJSConnection {
  constructor(private db: BetterSqlite3Database) {}

  async execute(sql: string, params: any[] = []): Promise<any> {
    try {
      const isSelect = sql.trim().toUpperCase().startsWith("SELECT");

      if (isSelect) {
        // Xử lý câu lệnh SELECT
        const stmt = this.db.prepare(sql);
        const rows = stmt.all(...params);

        logger.debug(`SQL SELECT result:`, rows);

        return {
          rows: rows || [],
          rowsAffected: 0,
        };
      } else {
        // Xử lý các câu lệnh INSERT, UPDATE, DELETE, CREATE, etc.
        const stmt = this.db.prepare(sql);
        const result = stmt.run(...params);

        logger.debug(`SQL execution result:`, result);

        return {
          rows: [],
          rowsAffected: result.changes || 0,
          lastInsertRowId: result.lastInsertRowid || undefined,
        };
      }
    } catch (error) {
      logger.error(`SQL execution failed`, error);
      throw error;
    }
  }

  async close(): Promise<void> {
    try {
      this.db.close();
      logger.debug("Database connection closed");
    } catch (error) {
      logger.error(`Close Error:`, error);
      throw error;
    }
  }

  // Phương thức bổ sung để thực hiện transaction
  async transaction(fn: (tx: any) => Promise<void>): Promise<void> {
    const transaction = this.db.transaction(async () => {
      await fn(new NodeJSTransaction(this.db));
    });

    try {
      transaction();
      logger.debug("Transaction completed successfully");
    } catch (error) {
      logger.error("Transaction failed", error);
      throw error;
    }
  }
}

// Class hỗ trợ cho transaction
class NodeJSTransaction {
  constructor(private db: BetterSqlite3Database) {}

  async executeSql(sql: string, params: any[] = []): Promise<any> {
    try {
      const isSelect = sql.trim().toUpperCase().startsWith("SELECT");

      if (isSelect) {
        const stmt = this.db.prepare(sql);
        const rows = stmt.all(...params);

        return {
          rows: rows || [],
          rowsAffected: 0,
        };
      } else {
        const stmt = this.db.prepare(sql);
        const result = stmt.run(...params);

        return {
          rows: [],
          rowsAffected: result.changes || 0,
          lastInsertRowId: result.lastInsertRowid || undefined,
        };
      }
    } catch (error) {
      logger.error("Transaction SQL execution failed", error);
      throw error;
    }
  }
}
```

```ts
// src/query/query-builder.ts
import { UniversalDAO } from "../core/universal-dao";
import { SQLiteResult, SQLiteRow } from "../types";

export interface QueryCondition {
  field: string;
  operator: string;
  value: any;
}

export interface JoinClause {
  type: "INNER" | "LEFT" | "RIGHT" | "FULL OUTER";
  table: string;
  condition: string;
}

export interface SubQuery {
  query: QueryBuilder;
  alias: string;
}

/**
 * Enhanced QueryBuilder with advanced SQL query construction capabilities
 */
export class QueryBuilder {
  private tableName = "";
  private selectFields: string[] = ["*"];
  private joinClauses: JoinClause[] = [];
  private whereConditions: QueryCondition[] = [];
  private groupByFields: string[] = [];
  private havingConditions: QueryCondition[] = [];
  private orderByFields: string[] = [];
  private limitValue: number | null = null;
  private offsetValue: number | null = null;
  private params: any[] = [];
  private unionQueries: QueryBuilder[] = [];
  private subQueries: SubQuery[] = [];
  private cteQueries: Map<string, QueryBuilder> = new Map();
  private dao: UniversalDAO | null = null;

  constructor(dao?: UniversalDAO) {
    this.dao = dao || null;
  }

  static table(name: string, dao?: UniversalDAO): QueryBuilder {
    const builder = new QueryBuilder(dao);
    builder.tableName = name;
    return builder;
  }

  static from(name: string, dao?: UniversalDAO): QueryBuilder {
    return QueryBuilder.table(name, dao);
  }

  // SELECT operations
  select(fields: string | string[]): QueryBuilder {
    this.selectFields = Array.isArray(fields) ? fields : [fields];
    return this;
  }

  selectRaw(raw: string): QueryBuilder {
    this.selectFields = [raw];
    return this;
  }

  selectDistinct(fields: string | string[]): QueryBuilder {
    const fieldList = Array.isArray(fields) ? fields.join(", ") : fields;
    this.selectFields = [`DISTINCT ${fieldList}`];
    return this;
  }

  // JOIN operations
  join(
    table: string,
    condition: string,
    type: JoinClause["type"] = "INNER"
  ): QueryBuilder {
    this.joinClauses.push({ type, table, condition });
    return this;
  }

  innerJoin(table: string, condition: string): QueryBuilder {
    return this.join(table, condition, "INNER");
  }

  leftJoin(table: string, condition: string): QueryBuilder {
    return this.join(table, condition, "LEFT");
  }

  rightJoin(table: string, condition: string): QueryBuilder {
    return this.join(table, condition, "RIGHT");
  }

  fullOuterJoin(table: string, condition: string): QueryBuilder {
    return this.join(table, condition, "FULL OUTER");
  }

  // WHERE conditions
  where(field: string, operator: string, value?: any): QueryBuilder;
  where(field: string, value: any): QueryBuilder;
  where(conditions: Record<string, any>): QueryBuilder;
  where(
    fieldOrConditions: string | Record<string, any>,
    operatorOrValue?: string | any,
    value?: any
  ): QueryBuilder {
    if (typeof fieldOrConditions === "object") {
      // Handle object of conditions
      Object.entries(fieldOrConditions).forEach(([field, val]) => {
        this.whereConditions.push({ field, operator: "=", value: val });
      });
      return this;
    }

    let operator = "=";
    let actualValue = operatorOrValue;

    if (arguments.length === 3) {
      operator = operatorOrValue;
      actualValue = value;
    }

    this.whereConditions.push({
      field: fieldOrConditions,
      operator,
      value: actualValue,
    });

    return this;
  }

  whereEquals(field: string, value: any): QueryBuilder {
    return this.where(field, "=", value);
  }

  whereNot(field: string, value: any): QueryBuilder {
    return this.where(field, "!=", value);
  }

  whereLike(field: string, value: string): QueryBuilder {
    return this.where(field, "LIKE", value);
  }

  whereNotLike(field: string, value: string): QueryBuilder {
    return this.where(field, "NOT LIKE", value);
  }

  whereIn(field: string, values: any[]): QueryBuilder {
    this.whereConditions.push({ field, operator: "IN", value: values });
    return this;
  }

  whereNotIn(field: string, values: any[]): QueryBuilder {
    this.whereConditions.push({ field, operator: "NOT IN", value: values });
    return this;
  }

  whereBetween(field: string, min: any, max: any): QueryBuilder {
    this.whereConditions.push({
      field,
      operator: "BETWEEN",
      value: [min, max],
    });
    return this;
  }

  whereNotBetween(field: string, min: any, max: any): QueryBuilder {
    this.whereConditions.push({
      field,
      operator: "NOT BETWEEN",
      value: [min, max],
    });
    return this;
  }

  whereNull(field: string): QueryBuilder {
    this.whereConditions.push({ field, operator: "IS NULL", value: null });
    return this;
  }

  whereNotNull(field: string): QueryBuilder {
    this.whereConditions.push({ field, operator: "IS NOT NULL", value: null });
    return this;
  }

  whereExists(subquery: QueryBuilder): QueryBuilder {
    this.whereConditions.push({
      field: "",
      operator: "EXISTS",
      value: subquery,
    });
    return this;
  }

  whereNotExists(subquery: QueryBuilder): QueryBuilder {
    this.whereConditions.push({
      field: "",
      operator: "NOT EXISTS",
      value: subquery,
    });
    return this;
  }

  // OR WHERE conditions
  orWhere(field: string, operator: string, value?: any): QueryBuilder;
  orWhere(field: string, value: any): QueryBuilder;
  orWhere(
    field: string,
    operatorOrValue?: string | any,
    value?: any
  ): QueryBuilder {
    // Implementation similar to where() but with OR logic
    // This would require refactoring the condition structure to support AND/OR
    return this.where(field, operatorOrValue as string, value);
  }

  // GROUP BY and HAVING
  groupBy(fields: string | string[]): QueryBuilder {
    this.groupByFields = Array.isArray(fields) ? fields : [fields];
    return this;
  }

  having(field: string, operator: string, value?: any): QueryBuilder {
    let actualOperator = "=";
    let actualValue = operator;

    if (arguments.length === 3) {
      actualOperator = operator;
      actualValue = value;
    }

    this.havingConditions.push({
      field,
      operator: actualOperator,
      value: actualValue,
    });
    return this;
  }

  havingCount(field: string, operator: string, value: number): QueryBuilder {
    return this.having(`COUNT(${field})`, operator, value);
  }

  // ORDER BY
  orderBy(field: string, direction: "ASC" | "DESC" = "ASC"): QueryBuilder {
    this.orderByFields.push(`${field} ${direction}`);
    return this;
  }

  orderByDesc(field: string): QueryBuilder {
    return this.orderBy(field, "DESC");
  }

  orderByRaw(raw: string): QueryBuilder {
    this.orderByFields.push(raw);
    return this;
  }

  latest(field: string = "created_at"): QueryBuilder {
    return this.orderByDesc(field);
  }

  oldest(field: string = "created_at"): QueryBuilder {
    return this.orderBy(field, "ASC");
  }

  // LIMIT and OFFSET
  limit(count: number): QueryBuilder {
    this.limitValue = count;
    return this;
  }

  offset(count: number): QueryBuilder {
    this.offsetValue = count;
    return this;
  }

  skip(count: number): QueryBuilder {
    return this.offset(count);
  }

  take(count: number): QueryBuilder {
    return this.limit(count);
  }

  firstRow(): QueryBuilder {
    return this.limit(1);
  }

  paginate(page: number, perPage: number): QueryBuilder {
    this.limitValue = perPage;
    this.offsetValue = (page - 1) * perPage;
    return this;
  }

  // UNION operations
  union(query: QueryBuilder): QueryBuilder {
    this.unionQueries.push(query);
    return this;
  }

  unionAll(query: QueryBuilder): QueryBuilder {
    // Note: SQLite doesn't differentiate UNION and UNION ALL like other databases
    return this.union(query);
  }

  // CTE (Common Table Expressions)
  with(alias: string, query: QueryBuilder): QueryBuilder {
    this.cteQueries.set(alias, query);
    return this;
  }

  // Subqueries
  whereSubQuery(
    field: string,
    operator: string,
    subquery: QueryBuilder
  ): QueryBuilder {
    this.subQueries.push({ query: subquery, alias: "" });
    this.whereConditions.push({ field, operator, value: subquery });
    return this;
  }

  // Aggregation functions
  count(field: string = "*"): QueryBuilder {
    this.selectFields = [`COUNT(${field}) as count`];
    return this;
  }

  sum(field: string): QueryBuilder {
    this.selectFields = [`SUM(${field}) as sum`];
    return this;
  }

  avg(field: string): QueryBuilder {
    this.selectFields = [`AVG(${field}) as avg`];
    return this;
  }

  max(field: string): QueryBuilder {
    this.selectFields = [`MAX(${field}) as max`];
    return this;
  }

  min(field: string): QueryBuilder {
    this.selectFields = [`MIN(${field}) as min`];
    return this;
  }

  // SQL Generation
  toSQL(): { sql: string; params: any[] } {
    let sql = "";
    const params: any[] = [];

    // CTE queries
    if (this.cteQueries.size > 0) {
      const cteList: string[] = [];
      this.cteQueries.forEach((query, alias) => {
        const { sql: cteSql, params: cteParams } = query.toSQL();
        cteList.push(`${alias} AS (${cteSql})`);
        params.push(...cteParams);
      });
      sql += `WITH ${cteList.join(", ")} `;
    }

    // Main SELECT
    sql += `SELECT ${this.selectFields.join(", ")} FROM ${this.tableName}`;

    // JOINs
    if (this.joinClauses.length > 0) {
      this.joinClauses.forEach((join) => {
        sql += ` ${join.type} JOIN ${join.table} ON ${join.condition}`;
      });
    }

    // WHERE conditions
    if (this.whereConditions.length > 0) {
      const conditions: string[] = [];
      this.whereConditions.forEach((condition) => {
        const { clause, conditionParams } = this.buildCondition(condition);
        conditions.push(clause);
        params.push(...conditionParams);
      });
      sql += ` WHERE ${conditions.join(" AND ")}`;
    }

    // GROUP BY
    if (this.groupByFields.length > 0) {
      sql += ` GROUP BY ${this.groupByFields.join(", ")}`;
    }

    // HAVING
    if (this.havingConditions.length > 0) {
      const conditions: string[] = [];
      this.havingConditions.forEach((condition) => {
        const { clause, conditionParams } = this.buildCondition(condition);
        conditions.push(clause);
        params.push(...conditionParams);
      });
      sql += ` HAVING ${conditions.join(" AND ")}`;
    }

    // ORDER BY
    if (this.orderByFields.length > 0) {
      sql += ` ORDER BY ${this.orderByFields.join(", ")}`;
    }

    // LIMIT
    if (this.limitValue !== null) {
      sql += ` LIMIT ${this.limitValue}`;
    }

    // OFFSET
    if (this.offsetValue !== null) {
      sql += ` OFFSET ${this.offsetValue}`;
    }

    // UNION queries
    if (this.unionQueries.length > 0) {
      this.unionQueries.forEach((unionQuery) => {
        const { sql: unionSql, params: unionParams } = unionQuery.toSQL();
        sql += ` UNION ${unionSql}`;
        params.push(...unionParams);
      });
    }

    return { sql, params };
  }

  private buildCondition(condition: QueryCondition): {
    clause: string;
    conditionParams: any[];
  } {
    const { field, operator, value } = condition;
    const params: any[] = [];

    switch (operator.toUpperCase()) {
      case "IN":
      case "NOT IN":
        const placeholders = (value as any[]).map(() => "?").join(", ");
        params.push(...(value as any[]));
        return {
          clause: `${field} ${operator} (${placeholders})`,
          conditionParams: params,
        };

      case "BETWEEN":
      case "NOT BETWEEN":
        params.push(value[0], value[1]);
        return {
          clause: `${field} ${operator} ? AND ?`,
          conditionParams: params,
        };

      case "IS NULL":
      case "IS NOT NULL":
        return {
          clause: `${field} ${operator}`,
          conditionParams: [],
        };

      case "EXISTS":
      case "NOT EXISTS":
        const { sql: subSql, params: subParams } = (
          value as QueryBuilder
        ).toSQL();
        params.push(...subParams);
        return {
          clause: `${operator} (${subSql})`,
          conditionParams: params,
        };

      default:
        if (value instanceof QueryBuilder) {
          const { sql: subSql, params: subParams } = value.toSQL();
          params.push(...subParams);
          return {
            clause: `${field} ${operator} (${subSql})`,
            conditionParams: params,
          };
        }
        params.push(value);
        return {
          clause: `${field} ${operator} ?`,
          conditionParams: params,
        };
    }
  }

  // Execution methods (require DAO)
  async get(): Promise<SQLiteRow[]> {
    if (!this.dao) {
      throw new Error("DAO instance required for query execution");
    }
    const { sql, params } = this.toSQL();
    const result = await this.dao.execute(sql, params);
    return result.rows;
  }

  async first(): Promise<SQLiteRow | null> {
    this.limit(1);
    const results = await this.get(); // This will apply the limit(1) set by firstRow()
    return results.length > 0 ? results[0] : null;
  }

  async pluck(column: string): Promise<any[]> {
    this.select(column);
    const results = await this.get();
    return results.map((row) => row[column]);
  }

  async exists(): Promise<boolean> {
    this.select("1").limit(1);
    const results = await this.get();
    return results.length > 0;
  }

  async countResult(): Promise<number> {
    this.count();
    const result = await this.first();
    return result ? result.count : 0;
  }

  // Static helper methods for DML operations
  static insert(
    tableName: string,
    data: Record<string, any>
  ): { sql: string; params: any[] } {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map(() => "?").join(", ");

    return {
      sql: `INSERT INTO ${tableName} (${fields.join(
        ", "
      )}) VALUES (${placeholders})`,
      params: values,
    };
  }

  static insertMany(
    tableName: string,
    dataArray: Record<string, any>[]
  ): { sql: string; params: any[] } {
    if (dataArray.length === 0) {
      throw new Error("Data array cannot be empty");
    }

    const fields = Object.keys(dataArray[0]);
    const placeholders = fields.map(() => "?").join(", ");
    const valueGroups = dataArray.map(() => `(${placeholders})`).join(", ");

    const allValues = dataArray.flatMap((data) => Object.values(data));

    return {
      sql: `INSERT INTO ${tableName} (${fields.join(
        ", "
      )}) VALUES ${valueGroups}`,
      params: allValues,
    };
  }

  static update(
    tableName: string,
    data: Record<string, any>,
    where: string,
    whereParams: any[] = []
  ): { sql: string; params: any[] } {
    const sets = Object.keys(data)
      .map((key) => `${key} = ?`)
      .join(", ");
    const params = [...Object.values(data), ...whereParams];

    return {
      sql: `UPDATE ${tableName} SET ${sets} WHERE ${where}`,
      params,
    };
  }

  static delete(
    tableName: string,
    where: string,
    whereParams: any[] = []
  ): { sql: string; params: any[] } {
    return {
      sql: `DELETE FROM ${tableName} WHERE ${where}`,
      params: whereParams,
    };
  }

  static upsert(
    tableName: string,
    data: Record<string, any>,
    conflictColumns: string[]
  ): { sql: string; params: any[] } {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map(() => "?").join(", ");

    const updateColumns = fields.filter(
      (field) => !conflictColumns.includes(field)
    );
    const updateClause =
      updateColumns.length > 0
        ? updateColumns.map((col) => `${col} = excluded.${col}`).join(", ")
        : "";

    let sql = `INSERT INTO ${tableName} (${fields.join(
      ", "
    )}) VALUES (${placeholders})`;

    if (updateColumns.length > 0) {
      sql += ` ON CONFLICT(${conflictColumns.join(
        ", "
      )}) DO UPDATE SET ${updateClause}`;
    } else {
      sql += ` ON CONFLICT(${conflictColumns.join(", ")}) DO NOTHING`;
    }

    return { sql, params: values };
  }

  // Utility methods
  clone(): QueryBuilder {
    if (!this.dao)
      throw new Error("DAO instance required for cloning QueryBuilder");
    const cloned = new QueryBuilder(this.dao);
    cloned.tableName = this.tableName;
    cloned.selectFields = [...this.selectFields];
    cloned.joinClauses = [...this.joinClauses];
    cloned.whereConditions = [...this.whereConditions];
    cloned.groupByFields = [...this.groupByFields];
    cloned.havingConditions = [...this.havingConditions];
    cloned.orderByFields = [...this.orderByFields];
    cloned.limitValue = this.limitValue;
    cloned.offsetValue = this.offsetValue;
    cloned.unionQueries = [...this.unionQueries];
    cloned.subQueries = [...this.subQueries];
    cloned.cteQueries = new Map(this.cteQueries);
    return cloned;
  }

  toRawSQL(): string {
    const { sql, params } = this.toSQL();
    let rawSql = sql;
    params.forEach((param) => {
      if (typeof param === "string") {
        rawSql = rawSql.replace("?", `'${param.replace(/'/g, "''")}'`);
      } else if (param === null || param === undefined) {
        rawSql = rawSql.replace("?", "NULL");
      } else {
        rawSql = rawSql.replace("?", String(param));
      }
    });
    return rawSql;
  }

  explain(): QueryBuilder {
    this.selectFields = ["EXPLAIN QUERY PLAN " + this.selectFields.join(", ")];
    return this;
  }
}
```

```ts

// src/core/universal-dao.ts
import {
  ColumnDefinition,
  DatabaseSchema,
  ImportOptions,
  ImportResult,
  IndexDefinition,
  QueryTable,
  SQLiteAdapter,
  SQLiteConnection,
  SQLiteResult,
  SQLiteRow,
  TableDefinition,
  TypeMappingConfig,
  WhereClause,
  ColumnMapping,
} from "../types";

// Import logger configuration for internal use
import { SQLiteModules, createModuleLogger } from "../logger";
const logger = createModuleLogger(SQLiteModules.UNIVERSAL_DAO);

export class UniversalDAO {
  private connection: SQLiteConnection | null = null;
  private isConnected: boolean = false;
  private inTransaction: boolean = false;
  private typeMappingConfig: TypeMappingConfig["type_mapping"] | null = null;
  private createIfNotExists: boolean = false;
  private forceRecreate: boolean = false;

  constructor(
    private adapter: SQLiteAdapter,
    private dbPath: string,
    private options?: {
      createIfNotExists?: boolean; // Mặc định false - không tạo mới nếu đã tồn tại
      forceRecreate?: boolean; // Mặc định false - ép tạo lại = true
    }
  ) {
    this.createIfNotExists = options?.createIfNotExists ?? false;
    this.forceRecreate = options?.forceRecreate ?? false;

    logger.trace("UniversalDAO constructor initialized", {
      dbPath: this.dbPath,
      createIfNotExists: this.createIfNotExists,
      forceRecreate: this.forceRecreate,
    });
  }

  async connect(): Promise<void> {
    logger.trace("Attempting to connect to database", {
      dbPath: this.dbPath,
    });

    if (this.isConnected) {
      logger.debug("Already connected to database, skipping connection");
      return;
    }

    try {
      this.connection = await this.adapter.connect(this.dbPath);
      this.isConnected = true;
      logger.info("Successfully connected to database", {
        dbPath: this.dbPath,
      });
    } catch (error) {
      logger.error("Failed to connect to database", {
        dbPath: this.dbPath,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    logger.trace("Attempting to disconnect from database");

    if (this.connection && this.isConnected) {
      try {
        await this.connection.close();
        this.connection = null;
        this.isConnected = false;
        logger.info("Successfully disconnected from database");
      } catch (error) {
        logger.error("Error during database disconnection", {
          error: error instanceof Error ? error.message : error,
        });
        throw error;
      }
    } else {
      logger.debug("Database was not connected, nothing to disconnect");
    }
  }

  async close(): Promise<void> {
    logger.trace("Closing database connection");
    await this.disconnect();
  }

  // Type mapping utilities
  setTypeMappingConfig(config: TypeMappingConfig["type_mapping"]): void {
    logger.trace("Setting type mapping configuration", { config });
    this.typeMappingConfig = config;
    logger.debug("Type mapping configuration updated");
  }

  private convertToSQLiteType(genericType: string): string {
    logger.trace("Converting generic type to SQLite type", {
      genericType,
    });

    if (!this.typeMappingConfig || !this.typeMappingConfig.sqlite) {
      const defaultType = this.getDefaultSQLiteType(genericType);
      logger.debug("Using default type mapping", {
        genericType,
        sqliteType: defaultType,
      });
      return defaultType;
    }

    const sqliteMapping = this.typeMappingConfig.sqlite;
    const mappedType = sqliteMapping[genericType.toLowerCase()] || "TEXT";
    logger.debug("Using custom type mapping", {
      genericType,
      sqliteType: mappedType,
    });
    return mappedType;
  }

  private getDefaultSQLiteType(genericType: string): string {
    const defaultMapping: Record<string, string> = {
      string: "TEXT",
      varchar: "TEXT",
      char: "TEXT",
      email: "TEXT",
      url: "TEXT",
      uuid: "TEXT",
      integer: "INTEGER",
      bigint: "INTEGER",
      smallint: "INTEGER",
      tinyint: "INTEGER",
      decimal: "REAL",
      numeric: "REAL",
      float: "REAL",
      double: "REAL",
      boolean: "INTEGER",
      timestamp: "TEXT",
      datetime: "TEXT",
      date: "TEXT",
      time: "TEXT",
      json: "TEXT",
      array: "TEXT",
      blob: "BLOB",
      binary: "BLOB",
    };
    return defaultMapping[genericType.toLowerCase()] || "TEXT";
  }

  private processColumnDefinition(col: ColumnDefinition): ColumnDefinition {
    logger.trace("Processing column definition", {
      columnName: col.name,
      originalType: col.type,
    });

    const processedCol: ColumnDefinition = { ...col };
    processedCol.type = this.convertToSQLiteType(col.type);

    const options: string[] = [];
    if (col.constraints) {
      logger.trace("Processing column constraints", {
        columnName: col.name,
        constraints: col.constraints,
      });

      const constraints = col.constraints.toUpperCase().split(" ");
      if (constraints.includes("PRIMARY")) {
        options.push("PRIMARY KEY");
        processedCol.primary_key = true;
      }
      if (
        constraints.includes("AUTO_INCREMENT") ||
        constraints.includes("AUTOINCREMENT")
      ) {
        if (processedCol.primary_key) options.push("AUTOINCREMENT");
        processedCol.auto_increment = true;
      }
      if (constraints.includes("NOT") && constraints.includes("NULL")) {
        options.push("NOT NULL");
        processedCol.nullable = false;
      }
      if (constraints.includes("UNIQUE")) {
        if (!processedCol.primary_key) options.push("UNIQUE");
        processedCol.unique = true;
      }
      // Handle DEFAULT values
      const defaultIndex = constraints.indexOf("DEFAULT");
      if (defaultIndex !== -1 && constraints.length > defaultIndex + 1) {
        const defaultValue = constraints[defaultIndex + 1];
        options.push(`DEFAULT ${defaultValue}`);
        processedCol.default = defaultValue;
      }
    }

    processedCol.option_key = options.join(" ").trim();
    logger.debug("Column definition processed", {
      columnName: col.name,
      finalType: processedCol.type,
      options: processedCol.option_key,
    });

    return processedCol;
  }

  // Schema initialization with enhanced options
  async initializeFromSchema(schema: DatabaseSchema): Promise<void> {
    logger.info("Initializing database schema", {
      schemaVersion: schema.version,
      tableCount: Object.keys(schema.schemas).length,
    });

    this.ensureConnected();

    // Check if schema already exists
    let hasExistingSchema = false;
    try {
      const result = await this.execute(
        "SELECT version FROM _schema_info ORDER BY applied_at DESC LIMIT 1"
      );
      hasExistingSchema = result.rows.length > 0;
      if (hasExistingSchema) {
        logger.debug("Existing schema detected", {
          currentVersion: result.rows[0]?.version,
        });
      }
    } catch (error) {
      logger.debug(
        "The first time for init from Schema! No existing schema detected"
      );
      hasExistingSchema = false;
    }

    // Handle existing schema based on options
    if (hasExistingSchema && !this.createIfNotExists && !this.forceRecreate) {
      logger.info(
        "Schema exists and no recreation options set, using existing schema"
      );
      if (schema.type_mapping) {
        this.setTypeMappingConfig(schema.type_mapping);
      }
      return;
    }

    if (hasExistingSchema && this.forceRecreate) {
      logger.warn(
        "Force recreate option enabled, dropping all existing tables"
      );
      await this.dropAllTables();
    }

    if (schema.type_mapping) {
      this.setTypeMappingConfig(schema.type_mapping);
    }

    try {
      logger.debug("Enabling foreign key constraints");
      await this.execute("PRAGMA foreign_keys = ON");
    } catch (error) {
      logger.warn("Failed to enable foreign key constraints", {
        error: error instanceof Error ? error.message : error,
      });
    }

    await this.beginTransaction();

    try {
      logger.info("Creating tables from schema");
      for (const [tableName, tableConfig] of Object.entries(schema.schemas)) {
        logger.debug("Creating table", {
          tableName,
          columnCount: tableConfig.cols.length,
        });

        const tableDefinition: TableDefinition = {
          name: tableName,
          cols: tableConfig.cols.map((col) =>
            this.processColumnDefinition(col)
          ),
          description: tableConfig.description,
          indexes: tableConfig.indexes,
          foreign_keys: tableConfig.foreign_keys,
        };
        await this.createTableWithForeignKeys(tableDefinition);
      }

      logger.info("Creating indexes for tables");
      for (const [tableName, tableConfig] of Object.entries(schema.schemas)) {
        if (tableConfig.indexes?.length) {
          logger.debug("Creating indexes for table", {
            tableName,
            indexCount: tableConfig.indexes.length,
          });
          await this.createIndexesForTable(tableName, tableConfig.indexes);
        }
      }

      await this.setSchemaVersion(schema.version);
      await this.commitTransaction();
      logger.info("Schema initialization completed successfully", {
        version: schema.version,
      });
    } catch (error) {
      logger.error("Schema initialization failed, rolling back transaction", {
        error: error instanceof Error ? error.message : error,
      });
      await this.rollbackTransaction();
      throw error;
    }
  }

  private async dropAllTables(): Promise<void> {
    logger.info("Dropping all existing tables");

    const tables = await this.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    );

    logger.debug("Found tables to drop", {
      tableCount: tables.rows.length,
    });

    await this.beginTransaction();

    try {
      for (const table of tables.rows) {
        logger.trace("Dropping table", { tableName: table.name });
        await this.execute(`DROP TABLE IF EXISTS ${table.name}`);
      }
      await this.commitTransaction();
      logger.info("All tables dropped successfully");
    } catch (error) {
      logger.error("Failed to drop tables, rolling back", {
        error: error instanceof Error ? error.message : error,
      });
      await this.rollbackTransaction();
      throw error;
    }
  }

  private async createTableWithForeignKeys(
    table: TableDefinition
  ): Promise<void> {
    logger.trace("Creating table with foreign keys", {
      tableName: table.name,
    });

    const columnDefs = table.cols.map((col) =>
      `${col.name} ${col.type} ${col.option_key || ""}`.trim()
    );

    const foreignKeyDefs: string[] = [];

    // Hỗ trợ cả foreign_keys và foreignKeys
    const foreignKeys = table.foreign_keys;

    if (foreignKeys) {
      logger.debug("Processing foreign keys", {
        tableName: table.name,
        fkCount: foreignKeys.length,
      });

      for (const fk of foreignKeys) {
        // Lấy column(s) - hỗ trợ cả snake_case và camelCase, số ít và số nhiều
        const columns: string[] = fk.columns
          ? Array.isArray(fk.columns)
            ? (fk.columns as any)
            : [fk.columns]
          : [];

        if (columns.length === 0) {
          logger.warn("Foreign key without columns found", {
            tableName: table.name,
            foreignKey: fk,
          });
          continue;
        }

        // Lấy reference table
        const refTable = fk.references?.table;

        // Lấy reference column(s) - hỗ trợ cả số ít và số nhiều
        const refColumns: string[] = fk.references?.columns
          ? Array.isArray(fk.references?.columns)
            ? (fk.references?.columns as any)
            : [fk.references?.columns]
          : [];

        if (!refTable || refColumns.length === 0) {
          logger.warn("Invalid foreign key reference", {
            tableName: table.name,
            foreignKey: fk,
          });
          continue;
        }

        // Tạo foreign key SQL
        let fkSql = `FOREIGN KEY (${columns.join(
          ", "
        )}) REFERENCES ${refTable}(${refColumns.join(", ")})`;

        // Hỗ trợ cả on_delete/onDelete và on_update/onUpdate
        const onDelete = fk.on_delete;
        const onUpdate = fk.on_update;

        if (onDelete) fkSql += ` ON DELETE ${onDelete}`;
        if (onUpdate) fkSql += ` ON UPDATE ${onUpdate}`;

        foreignKeyDefs.push(fkSql);
      }
    }

    const allDefs = [...columnDefs, ...foreignKeyDefs];
    const sql = `CREATE TABLE IF NOT EXISTS ${table.name} (${allDefs.join(
      ", "
    )})`;

    try {
      await this.execute(sql);
      logger.debug("Table created successfully", {
        tableName: table.name,
      });
    } catch (error) {
      logger.error("Failed to create table", {
        tableName: table.name,
        sql,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  private async createIndexesForTable(
    tableName: string,
    indexes: IndexDefinition[]
  ): Promise<void> {
    logger.trace("Creating indexes for table", {
      tableName,
      indexCount: indexes.length,
    });

    for (const index of indexes) {
      const columns = index.columns.join(", ");
      const isUnique = index.unique || false;
      const sql = `CREATE ${isUnique ? "UNIQUE" : ""} INDEX IF NOT EXISTS ${
        index.name
      } ON ${tableName} (${columns})`;

      try {
        await this.execute(sql);
        logger.debug("Index created successfully", {
          indexName: index.name,
          tableName,
          columns: index.columns,
          unique: isUnique,
        });
      } catch (error) {
        logger.error("Failed to create index", {
          indexName: index.name,
          tableName,
          sql,
          error: error instanceof Error ? error.message : error,
        });
        throw error;
      }
    }
  }

  // Transaction management
  async beginTransaction(): Promise<void> {
    logger.trace("Beginning transaction");

    if (this.inTransaction) {
      const error = new Error("Transaction already in progress");
      logger.error("Cannot begin transaction", { error: error.message });
      throw error;
    }

    try {
      await this.execute("BEGIN TRANSACTION");
      this.inTransaction = true;
      logger.debug("Transaction started successfully");
    } catch (error) {
      logger.error("Failed to begin transaction", {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  async commitTransaction(): Promise<void> {
    logger.trace("Committing transaction");

    if (!this.inTransaction) {
      const error = new Error("No transaction in progress");
      logger.error("Cannot commit transaction", { error: error.message });
      throw error;
    }

    try {
      await this.execute("COMMIT");
      this.inTransaction = false;
      logger.debug("Transaction committed successfully");
    } catch (error) {
      logger.error("Failed to commit transaction", {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  async rollbackTransaction(): Promise<void> {
    logger.trace("Rolling back transaction");

    if (!this.inTransaction) {
      const error = new Error("No transaction in progress");
      logger.error("Cannot rollback transaction", {
        error: error.message,
      });
      throw error;
    }

    try {
      await this.execute("ROLLBACK");
      this.inTransaction = false;
      logger.debug("Transaction rolled back successfully");
    } catch (error) {
      logger.error("Failed to rollback transaction", {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  // Schema management
  async getSchemaVersion(): Promise<string> {
    logger.trace("Getting schema version");

    try {
      const result = await this.getRst(
        "SELECT version FROM _schema_info ORDER BY applied_at DESC LIMIT 1"
      );
      const version = result.version || "0";
      logger.debug("Schema version retrieved", { version });
      return version;
    } catch (error) {
      logger.debug("No schema version found, returning default", {
        defaultVersion: "0",
      });
      return "0";
    }
  }

  async setSchemaVersion(version: string): Promise<void> {
    logger.trace("Setting schema version", { version });

    try {
      await this.execute(`CREATE TABLE IF NOT EXISTS _schema_info (
        version TEXT NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);
      await this.execute(`INSERT INTO _schema_info (version) VALUES (?)`, [
        version,
      ]);
      logger.info("Schema version set successfully", { version });
    } catch (error) {
      logger.error("Failed to set schema version", {
        version,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  // CRUD Operations
  async insert(insertTable: QueryTable): Promise<SQLiteResult> {
    logger.trace("Performing insert operation", {
      tableName: insertTable.name,
    });

    const validCols = insertTable.cols.filter(
      (col) => col.value !== undefined && col.value !== null
    );

    if (validCols.length === 0) {
      const error = new Error("No valid columns to insert");
      logger.error("Insert operation failed", {
        tableName: insertTable.name,
        error: error.message,
      });
      throw error;
    }

    const columnNames = validCols.map((col) => col.name).join(", ");
    const placeholders = validCols.map(() => "?").join(", ");
    const params = validCols.map((col) =>
      typeof col.value === "object" ? JSON.stringify(col.value) : col.value
    );

    const sql = `INSERT INTO ${insertTable.name} (${columnNames}) VALUES (${placeholders})`;

    logger.debug("Executing insert query", {
      tableName: insertTable.name,
      columnCount: validCols.length,
      sql,
    });

    try {
      const result = await this.execute(sql, params);
      logger.info("Insert operation completed successfully", {
        tableName: insertTable.name,
        rowsAffected: result.rowsAffected,
        lastInsertRowid: result.lastInsertRowId,
      });
      return result;
    } catch (error) {
      logger.error("Insert operation failed", {
        tableName: insertTable.name,
        sql,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  async update(updateTable: QueryTable): Promise<SQLiteResult> {
    logger.trace("Performing update operation", {
      tableName: updateTable.name,
    });

    const setCols = updateTable.cols.filter(
      (col) =>
        col.value !== undefined &&
        !updateTable.wheres?.some((w) => w.name === col.name)
    );

    if (setCols.length === 0) {
      const error = new Error("No columns to update");
      logger.error("Update operation failed", {
        tableName: updateTable.name,
        error: error.message,
      });
      throw error;
    }

    const setClause = setCols.map((col) => `${col.name} = ?`).join(", ");
    const params = setCols.map((col) =>
      typeof col.value === "object" ? JSON.stringify(col.value) : col.value
    );

    let sql = `UPDATE ${updateTable.name} SET ${setClause}`;
    const whereClause = this.buildWhereClause(updateTable.wheres);

    if (!whereClause.sql) {
      const error = new Error("WHERE clause is required for UPDATE operation");
      logger.error("Update operation failed", {
        tableName: updateTable.name,
        error: error.message,
      });
      throw error;
    }

    sql += whereClause.sql;
    params.push(...whereClause.params);

    logger.debug("Executing update query", {
      tableName: updateTable.name,
      updateColumnCount: setCols.length,
      whereConditions: updateTable.wheres?.length || 0,
      sql,
    });

    try {
      const result = await this.execute(sql, params);
      logger.info("Update operation completed successfully", {
        tableName: updateTable.name,
        rowsAffected: result.rowsAffected,
      });
      return result;
    } catch (error) {
      logger.error("Update operation failed", {
        tableName: updateTable.name,
        sql,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  async delete(deleteTable: QueryTable): Promise<SQLiteResult> {
    logger.trace("Performing delete operation", {
      tableName: deleteTable.name,
    });

    let sql = `DELETE FROM ${deleteTable.name}`;
    const whereClause = this.buildWhereClause(deleteTable.wheres);

    if (!whereClause.sql) {
      const error = new Error("WHERE clause is required for DELETE operation");
      logger.error("Delete operation failed", {
        tableName: deleteTable.name,
        error: error.message,
      });
      throw error;
    }

    sql += whereClause.sql;

    logger.debug("Executing delete query", {
      tableName: deleteTable.name,
      whereConditions: deleteTable.wheres?.length || 0,
      sql,
    });

    try {
      const result = await this.execute(sql, whereClause.params);
      logger.info("Delete operation completed successfully", {
        tableName: deleteTable.name,
        rowsAffected: result.rowsAffected,
      });
      return result;
    } catch (error) {
      logger.error("Delete operation failed", {
        tableName: deleteTable.name,
        sql,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  async select(selectTable: QueryTable): Promise<SQLiteRow> {
    logger.trace("Performing select single operation", {
      tableName: selectTable.name,
    });

    const { sql, params } = this.buildSelectQuery(selectTable, " LIMIT 1");

    logger.debug("Executing select single query", {
      tableName: selectTable.name,
      sql,
    });

    try {
      const result = await this.execute(sql, params);
      const row = result.rows[0] || {};
      logger.debug("Select single operation completed", {
        tableName: selectTable.name,
        hasResult: !!result.rows[0],
      });
      return row;
    } catch (error) {
      logger.error("Select single operation failed", {
        tableName: selectTable.name,
        sql,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  async selectAll(selectTable: QueryTable): Promise<SQLiteRow[]> {
    logger.trace("Performing select all operation", {
      tableName: selectTable.name,
    });

    const { sql, params } = this.buildSelectQuery(selectTable);

    logger.debug("Executing select all query", {
      tableName: selectTable.name,
      sql,
    });

    try {
      const result = await this.execute(sql, params);
      logger.debug("Select all operation completed", {
        tableName: selectTable.name,
        rowCount: result.rows.length,
      });
      return result.rows;
    } catch (error) {
      logger.error("Select all operation failed", {
        tableName: selectTable.name,
        sql,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  // Utility methods
  private buildSelectQuery(
    selectTable: QueryTable,
    suffix: string = ""
  ): { sql: string; params: any[] } {
    const columns =
      selectTable.cols.length > 0
        ? selectTable.cols.map((col) => col.name).join(", ")
        : "*";

    let sql = `SELECT ${columns} FROM ${selectTable.name}`;
    const whereClause = this.buildWhereClause(selectTable.wheres);
    sql += whereClause.sql;

    if (selectTable.orderbys?.length) {
      const orderBy = selectTable.orderbys
        .map((o) => `${o.name} ${o.direction || "ASC"}`)
        .join(", ");
      sql += ` ORDER BY ${orderBy}`;
    }

    if (selectTable.limitOffset) {
      if (selectTable.limitOffset.limit)
        sql += ` LIMIT ${selectTable.limitOffset.limit}`;
      if (selectTable.limitOffset.offset)
        sql += ` OFFSET ${selectTable.limitOffset.offset}`;
    }

    sql += suffix;
    return { sql, params: whereClause.params };
  }

  private buildWhereClause(
    wheres?: WhereClause[],
    clause: string = "WHERE"
  ): { sql: string; params: any[] } {
    if (!wheres || wheres.length === 0) {
      return { sql: "", params: [] };
    }

    const conditions: string[] = [];
    const params: any[] = [];

    for (const where of wheres) {
      const operator = where.operator || "=";
      conditions.push(`${where.name} ${operator} ?`);
      params.push(where.value);
    }

    return { sql: ` ${clause} ${conditions.join(" AND ")}`, params };
  }

  convertJsonToQueryTable(
    tableName: string,
    json: Record<string, any>,
    idFields: string[] = ["id"]
  ): QueryTable {
    logger.trace("Converting JSON to QueryTable", {
      tableName,
      fieldCount: Object.keys(json).length,
      idFields,
    });

    const queryTable: QueryTable = { name: tableName, cols: [], wheres: [] };

    for (const [key, value] of Object.entries(json)) {
      queryTable.cols.push({ name: key, value });
      if (idFields.includes(key) && value !== undefined) {
        queryTable.wheres?.push({ name: key, value });
      }
    }

    logger.debug("JSON converted to QueryTable", {
      tableName,
      columnCount: queryTable.cols.length,
      whereCount: queryTable.wheres?.length || 0,
    });

    return queryTable;
  }

  // Enhanced Data Import functionality
  async importData(options: ImportOptions): Promise<ImportResult> {
    logger.info("Starting data import operation", {
      tableName: options.tableName,
      totalRows: options.data.length,
      batchSize: options.batchSize || 1000,
      validateData: options.validateData,
      updateOnConflict: options.updateOnConflict,
      skipErrors: options.skipErrors,
    });

    const startTime = Date.now();
    const result: ImportResult = {
      totalRows: options.data.length,
      successRows: 0,
      errorRows: 0,
      errors: [],
      executionTime: 0,
    };

    if (!this.isConnected) {
      const error = new Error("Database is not connected");
      logger.error("Import failed - database not connected");
      throw error;
    }

    if (!options.data || options.data.length === 0) {
      logger.warn("No data provided for import, returning empty result");
      result.executionTime = Date.now() - startTime;
      return result;
    }

    const tableInfo = await this.getTableInfo(options.tableName);
    if (tableInfo.length === 0) {
      const error = new Error(`Table '${options.tableName}' does not exist`);
      logger.error("Import failed - table does not exist", {
        tableName: options.tableName,
      });
      throw error;
    }

    logger.debug("Table info retrieved for import", {
      tableName: options.tableName,
      columnCount: tableInfo.length,
    });

    const columnMap = new Map(
      tableInfo.map((col) => [col.name.toLowerCase(), col])
    );
    const batchSize = options.batchSize || 1000;
    let processedCount = 0;
    const skipAutoIncrementPK = !options.includeAutoIncrementPK;

    try {
      await this.beginTransaction();

      for (let i = 0; i < options.data.length; i += batchSize) {
        const batch = options.data.slice(i, i + batchSize);
        logger.debug("Processing import batch", {
          batchNumber: Math.floor(i / batchSize) + 1,
          batchSize: batch.length,
          totalBatches: Math.ceil(options.data.length / batchSize),
        });

        for (let j = 0; j < batch.length; j++) {
          const rowIndex = i + j;
          const rowData = batch[j];

          try {
            const processedData = options.validateData
              ? this.validateAndTransformRow(
                  rowData,
                  columnMap,
                  options.tableName,
                  skipAutoIncrementPK
                )
              : this.transformRowData(rowData, columnMap, skipAutoIncrementPK);

            if (options.updateOnConflict && options.conflictColumns) {
              await this.insertOrUpdate(
                options.tableName,
                processedData,
                options.conflictColumns
              );
            } else {
              await this.insertRow(options.tableName, processedData);
            }

            result.successRows++;
          } catch (error) {
            result.errorRows++;
            const errorInfo = {
              rowIndex,
              error: error instanceof Error ? error.message : String(error),
              rowData,
            };
            result.errors.push(errorInfo);

            logger.warn("Row import failed", {
              rowIndex,
              tableName: options.tableName,
              error: error instanceof Error ? error.message : error,
            });

            if (options.onError) {
              options.onError(
                error instanceof Error ? error : new Error(String(error)),
                rowIndex,
                rowData
              );
            }

            if (!options.skipErrors) {
              logger.error(
                "Import operation stopped due to error and skipErrors=false"
              );
              throw error;
            }
          }

          processedCount++;
          if (options.onProgress && processedCount % 100 === 0) {
            options.onProgress(processedCount, options.data.length);
          }
        }
      }

      await this.commitTransaction();
      logger.info("Data import completed successfully", {
        tableName: options.tableName,
        totalRows: result.totalRows,
        successRows: result.successRows,
        errorRows: result.errorRows,
        executionTime: Date.now() - startTime,
      });
    } catch (error) {
      logger.error("Import operation failed, rolling back transaction", {
        tableName: options.tableName,
        processedCount,
        error: error instanceof Error ? error.message : error,
      });
      await this.rollbackTransaction();
      throw error;
    }

    if (options.onProgress) {
      options.onProgress(processedCount, options.data.length);
    }

    result.executionTime = Date.now() - startTime;
    return result;
  }

  // Import with column mapping
  async importDataWithMapping(
    tableName: string,
    data: Record<string, any>[],
    columnMappings: ColumnMapping[],
    options: Partial<ImportOptions> = {}
  ): Promise<ImportResult> {
    logger.info("Starting data import with column mapping", {
      tableName,
      dataRows: data.length,
      mappingCount: columnMappings.length,
    });

    const transformedData = data.map((row, index) => {
      logger.trace("Transforming row with column mappings", {
        rowIndex: index,
      });
      const newRow: Record<string, any> = {};

      columnMappings.forEach((mapping) => {
        if (row.hasOwnProperty(mapping.sourceColumn)) {
          let value = row[mapping.sourceColumn];

          if (mapping.transform) {
            try {
              value = mapping.transform(value);
            } catch (error) {
              logger.warn("Column transformation failed", {
                rowIndex: index,
                sourceColumn: mapping.sourceColumn,
                targetColumn: mapping.targetColumn,
                error: error instanceof Error ? error.message : error,
              });
            }
          }

          newRow[mapping.targetColumn] = value;
        }
      });

      return newRow;
    });

    logger.debug("Data transformation completed", {
      originalRowCount: data.length,
      transformedRowCount: transformedData.length,
    });

    return await this.importData({
      tableName,
      data: transformedData,
      ...options,
    });
  }

  // Import from CSV
  async importFromCSV(
    tableName: string,
    csvData: string,
    options: {
      delimiter?: string;
      hasHeader?: boolean;
      columnMappings?: ColumnMapping[];
    } & Partial<ImportOptions> = {}
  ): Promise<ImportResult> {
    logger.info("Starting CSV import", {
      tableName,
      csvLength: csvData.length,
      delimiter: options.delimiter || ",",
      hasHeader: options.hasHeader !== false,
    });

    const delimiter = options.delimiter || ",";
    const hasHeader = options.hasHeader !== false;

    const lines = csvData.split("\n").filter((line) => line.trim());
    if (lines.length === 0) {
      const error = new Error("CSV data is empty");
      logger.error("CSV import failed - empty data");
      throw error;
    }

    let headers: string[] = [];
    let dataStartIndex = 0;

    if (hasHeader) {
      headers = lines[0]
        .split(delimiter)
        .map((h) => h.trim().replace(/^["']|["']$/g, ""));
      dataStartIndex = 1;
      logger.debug("CSV headers extracted", {
        headers,
        headerCount: headers.length,
      });
    } else {
      const firstRowCols = lines[0].split(delimiter).length;
      headers = Array.from(
        { length: firstRowCols },
        (_, i) => `column_${i + 1}`
      );
      logger.debug("Generated column headers for headerless CSV", {
        columnCount: firstRowCols,
        headers,
      });
    }

    const data: Record<string, any>[] = [];
    for (let i = dataStartIndex; i < lines.length; i++) {
      const values = lines[i]
        .split(delimiter)
        .map((v) => v.trim().replace(/^["']|["']$/g, ""));
      const row: Record<string, any> = {};

      headers.forEach((header, index) => {
        row[header] = values[index] || null;
      });

      data.push(row);
    }

    logger.debug("CSV data parsed", {
      totalLines: lines.length,
      dataRows: data.length,
      skipHeader: hasHeader,
    });

    if (options.columnMappings) {
      logger.debug("Using column mappings for CSV import");
      return await this.importDataWithMapping(
        tableName,
        data,
        options.columnMappings,
        options
      );
    } else {
      return await this.importData({
        tableName,
        data,
        ...options,
      });
    }
  }

  private validateAndTransformRow(
    rowData: Record<string, any>,
    columnMap: Map<string, any>,
    tableName: string,
    skipAutoIncrementPK: boolean = true
  ): Record<string, any> {
    logger.trace("Validating and transforming row data", { tableName });

    const processedRow: Record<string, any> = {};

    for (const [columnName, columnInfo] of columnMap.entries()) {
      const isRequired = columnInfo.notnull === 1 && !columnInfo.dflt_value;
      const isPrimaryKey = columnInfo.pk === 1;
      const isAutoIncrementPK =
        isPrimaryKey && columnInfo.type.toLowerCase().includes("integer");

      if (skipAutoIncrementPK && isAutoIncrementPK) {
        continue;
      }

      const value = this.findValueForColumn(rowData, columnName);

      if (isRequired && (value === null || value === undefined)) {
        const error = new Error(
          `Required column '${columnName}' is missing or null in table '${tableName}'`
        );
        logger.error("Row validation failed", {
          tableName,
          columnName,
          error: error.message,
        });
        throw error;
      }

      if (value !== null && value !== undefined) {
        try {
          processedRow[columnName] = this.convertValueToColumnType(
            value,
            columnInfo.type
          );
        } catch (error) {
          logger.error("Value conversion failed during validation", {
            tableName,
            columnName,
            value,
            columnType: columnInfo.type,
            error: error instanceof Error ? error.message : error,
          });
          throw error;
        }
      }
    }

    return processedRow;
  }

  private transformRowData(
    rowData: Record<string, any>,
    columnMap: Map<string, any>,
    skipAutoIncrementPK: boolean = true
  ): Record<string, any> {
    logger.trace("Transforming row data without validation");

    const processedRow: Record<string, any> = {};

    for (const [key, value] of Object.entries(rowData)) {
      const columnName = key.toLowerCase();
      const columnInfo = columnMap.get(columnName);

      if (!columnInfo) {
        logger.trace("Column not found in table schema, skipping", {
          columnName: key,
        });
        continue;
      }

      const isPrimaryKey = columnInfo.pk === 1;
      const isAutoIncrementPK =
        isPrimaryKey && columnInfo.type.toLowerCase().includes("integer");

      if (skipAutoIncrementPK && isAutoIncrementPK) {
        continue;
      }

      if (value !== null && value !== undefined) {
        try {
          processedRow[key] = this.convertValueToColumnType(
            value,
            columnInfo.type
          );
        } catch (error) {
          logger.warn("Value conversion failed during transformation", {
            columnName: key,
            value,
            columnType: columnInfo.type,
            error: error instanceof Error ? error.message : error,
          });
          // Continue processing other columns
        }
      }
    }

    return processedRow;
  }

  private findValueForColumn(
    rowData: Record<string, any>,
    columnName: string
  ): any {
    if (rowData.hasOwnProperty(columnName)) {
      return rowData[columnName];
    }

    const lowerColumnName = columnName.toLowerCase();
    for (const [key, value] of Object.entries(rowData)) {
      if (key.toLowerCase() === lowerColumnName) {
        return value;
      }
    }

    return undefined;
  }

  private convertValueToColumnType(value: any, columnType: string): any {
    if (value === null || value === undefined) {
      return null;
    }

    const type = columnType.toLowerCase();

    try {
      if (type.includes("integer") || type.includes("int")) {
        if (typeof value === "boolean") {
          return value ? 1 : 0;
        }
        const num = parseInt(String(value));
        return isNaN(num) ? null : num;
      }

      if (
        type.includes("real") ||
        type.includes("float") ||
        type.includes("decimal")
      ) {
        const num = parseFloat(String(value));
        return isNaN(num) ? null : num;
      }

      if (type.includes("boolean")) {
        if (typeof value === "boolean") {
          return value ? 1 : 0;
        }
        if (typeof value === "string") {
          const lower = value.toLowerCase();
          return lower === "true" || lower === "1" || lower === "yes" ? 1 : 0;
        }
        return value ? 1 : 0;
      }

      if (type.includes("json")) {
        if (typeof value === "object") {
          return JSON.stringify(value);
        }
        if (typeof value === "string") {
          try {
            JSON.parse(value);
            return value;
          } catch {
            throw new Error(
              `Invalid JSON format for column type '${columnType}'`
            );
          }
        }
        return JSON.stringify(value);
      }

      if (type.includes("timestamp") || type.includes("datetime")) {
        if (value instanceof Date) {
          return value.toISOString();
        }
        if (typeof value === "string" || typeof value === "number") {
          const date = new Date(value);
          return isNaN(date.getTime()) ? value : date.toISOString();
        }
        return String(value);
      }

      return String(value);
    } catch (error) {
      throw new Error(
        `Cannot convert value '${value}' to column type '${columnType}'`
      );
    }
  }

  private async insertRow(
    tableName: string,
    data: Record<string, any>
  ): Promise<void> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map(() => "?").join(", ");

    const sql = `INSERT INTO ${tableName} (${columns.join(
      ", "
    )}) VALUES (${placeholders})`;

    try {
      await this.execute(sql, values);
    } catch (error) {
      logger.trace("Insert row failed", {
        tableName,
        columns,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  private async insertOrUpdate(
    tableName: string,
    data: Record<string, any>,
    conflictColumns: string[]
  ): Promise<void> {
    logger.trace("Attempting insert or update", {
      tableName,
      conflictColumns,
    });

    try {
      await this.insertRow(tableName, data);
    } catch (error) {
      if (this.isConflictError(error)) {
        logger.debug("Insert conflict detected, attempting update", {
          tableName,
        });
        await this.updateRowByColumns(tableName, data, conflictColumns);
      } else {
        throw error;
      }
    }
  }

  private async updateRowByColumns(
    tableName: string,
    data: Record<string, any>,
    conflictColumns: string[]
  ): Promise<void> {
    const allColumns = Object.keys(data);
    const updateColumns = allColumns.filter(
      (col) => !conflictColumns.includes(col)
    );
    const whereColumns = conflictColumns;

    if (updateColumns.length === 0) {
      logger.debug("No columns to update, skipping update operation", {
        tableName,
      });
      return;
    }

    const setClause = updateColumns.map((col) => `${col} = ?`).join(", ");
    const whereClause = whereColumns.map((col) => `${col} = ?`).join(" AND ");

    const updateValues = updateColumns.map((col) => data[col]);
    const whereValues = whereColumns.map((col) => data[col]);
    const allValues = [...updateValues, ...whereValues];

    const sql = `UPDATE ${tableName} SET ${setClause} WHERE ${whereClause}`;

    try {
      await this.execute(sql, allValues);
      logger.trace("Update by columns completed", {
        tableName,
        updateColumns,
        whereColumns,
      });
    } catch (error) {
      logger.error("Update by columns failed", {
        tableName,
        sql,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  private isConflictError(error: any): boolean {
    return (
      error.code === "SQLITE_CONSTRAINT_UNIQUE" ||
      error.code === "SQLITE_CONSTRAINT_PRIMARYKEY" ||
      (error.message && error.message.includes("UNIQUE constraint failed"))
    );
  }

  // Database info methods
  async getDatabaseInfo(): Promise<any> {
    logger.trace("Getting database information");

    try {
      const tables = await this.execute(
        "SELECT name FROM sqlite_master WHERE type='table'"
      );
      const version = await this.getSchemaVersion();

      const info = {
        name: this.dbPath,
        tables: tables.rows.map((t) => t.name),
        isConnected: this.isConnected,
        version,
      };

      logger.debug("Database information retrieved", {
        tableCount: info.tables.length,
        isConnected: info.isConnected,
        version: info.version,
      });

      return info;
    } catch (error) {
      logger.error("Failed to get database information", {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  async getTableInfo(tableName: string): Promise<any[]> {
    logger.trace("Getting table information", { tableName });

    try {
      const result = await this.execute(`PRAGMA table_info(${tableName})`);
      logger.debug("Table information retrieved", {
        tableName,
        columnCount: result.rows.length,
      });
      return result.rows;
    } catch (error) {
      logger.error("Failed to get table information", {
        tableName,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  async dropTable(tableName: string): Promise<void> {
    logger.info("Dropping table", { tableName });

    const sql = `DROP TABLE IF EXISTS ${tableName}`;

    try {
      await this.execute(sql);
      logger.info("Table dropped successfully", { tableName });
    } catch (error) {
      logger.error("Failed to drop table", {
        tableName,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  // Connection check method
  isConnectionOpen(): boolean {
    const isOpen = this.isConnected && !!this.connection;
    logger.trace("Connection status checked", { isOpen });
    return isOpen;
  }

  async ensureConnected(): Promise<void> {
    if (!this.isConnectionOpen()) {
      logger.debug("Connection not open, attempting to connect");
      await this.connect();
    }
  }

  async execute(sql: string, params: any[] = []): Promise<SQLiteResult> {
    logger.trace("Executing SQL query", {
      sql: sql.substring(0, 100) + (sql.length > 100 ? "..." : ""),
      paramCount: params.length,
    });

    this.ensureConnected();

    try {
      const result = await this.connection!.execute(sql, params);
      logger.trace("SQL query executed successfully", {
        rowsAffected: result.rowsAffected,
        rowsReturned: result.rows?.length || 0,
      });
      return result;
    } catch (error) {
      logger.error("SQL query execution failed", {
        sql: sql.substring(0, 200) + (sql.length > 200 ? "..." : ""),
        paramCount: params.length,
        error, // trả về nguyên trạng lỗi thay vì ghi là [object Object]
      });
      throw error;
    }
  }

  async getRst(sql: string, params: any[] = []): Promise<SQLiteRow> {
    const result = await this.execute(sql, params);
    return result.rows[0] || {};
  }

  async getRsts(sql: string, params: any[] = []): Promise<SQLiteRow[]> {
    const result = await this.execute(sql, params);
    return result.rows;
  }
}

```

```ts

// src/core/database-factory.ts
import { SQLiteAdapter, DatabaseSchema, DbFactoryOptions } from "../types";
import { UniversalDAO } from "./universal-dao";

import { createModuleLogger, SQLiteModules } from "../logger";
const logger = createModuleLogger(SQLiteModules.DATABASE_FACTORY);

/**
 * Universal DatabaseFactory - A powerful utility class designed to create and manage
 * UniversalDAO instances from JSON schema across all operating systems and frameworks
 * using TypeScript and JavaScript. It provides methods for creating new, opening existing
 * databases, checking integrity, and managing database lifecycle.
 */
export class DatabaseFactory {
  private static adapters: SQLiteAdapter[] = [];

  /**
   * Register a SQLite adapter for use by the factory
   * @param adapter The SQLite adapter to register
   */
  static registerAdapter(adapter: SQLiteAdapter): void {
    logger.info(`Registering SQLite adapter: ${adapter.constructor.name}`, {
      adapterName: adapter.constructor.name,
      totalAdapters: this.adapters.length + 1,
    });

    this.adapters.push(adapter);

    logger.debug(
      `Successfully registered adapter. Total adapters: ${this.adapters.length}`
    );
  }

  /**
   * Get information about the current runtime environment
   * @returns A string describing the current environment
   */
  static getEnvironmentInfo(): string {
    logger.trace("Detecting runtime environment");

    let environment: string;

    if (
      typeof navigator !== "undefined" &&
      navigator.product === "ReactNative"
    ) {
      environment = "React Native";
    } else if (typeof globalThis.Bun !== "undefined") {
      environment = "Bun";
    } else if (typeof globalThis.Deno !== "undefined") {
      environment = "Deno";
    } else if (typeof window !== "undefined") {
      environment = "Browser";
    } else if (typeof process !== "undefined") {
      environment = "Node.js";
    } else {
      environment = "Unknown";
    }

    logger.debug(`Detected runtime environment: ${environment}`);
    return environment;
  }

  /**
   * Detect the best available SQLite adapter for the current environment
   * @returns The best available SQLite adapter
   * @throws Error if no supported adapter is found
   */
  private static async detectBestAdapter(): Promise<SQLiteAdapter> {
    logger.trace("Detecting best available SQLite adapter", {
      totalAdapters: this.adapters.length,
      environment: this.getEnvironmentInfo(),
    });

    for (const adapter of this.adapters) {
      logger.trace(`Testing adapter: ${adapter.constructor.name}`);

      if (await adapter.isSupported()) {
        logger.info(`Selected adapter: ${adapter.constructor.name}`, {
          adapterName: adapter.constructor.name,
          environment: this.getEnvironmentInfo(),
        });
        return adapter;
      }

      logger.debug(
        `Adapter ${adapter.constructor.name} is not supported in current environment`
      );
    }

    logger.error("No supported SQLite adapter found", {
      totalAdapters: this.adapters.length,
      environment: this.getEnvironmentInfo(),
    });

    throw new Error("No supported SQLite adapter found");
  }

  /**
   * Validate schema version compatibility between database and config
   * @param dao The UniversalDAO instance
   * @param schema The database schema configuration
   */
  private static async validateSchemaVersion(
    dao: UniversalDAO,
    schema: DatabaseSchema
  ): Promise<void> {
    logger.trace("Validating schema version compatibility", {
      databaseName: schema.database_name,
      configVersion: schema.version,
    });

    try {
      const dbInfo = await dao.getDatabaseInfo();
      logger.debug("Retrieved database info", {
        databaseVersion: dbInfo.version,
        configVersion: schema.version,
      });

      if (dbInfo.version !== schema.version) {
        const errorMsg = `Schema version mismatch: database (${dbInfo.version}) vs config (${schema.version})`;
        logger.error("Schema version mismatch", {
          databaseName: schema.database_name,
          databaseVersion: dbInfo.version,
          configVersion: schema.version,
        });
        throw new Error(errorMsg);
      }

      logger.debug("Schema version validation successful", {
        databaseName: schema.database_name,
        version: schema.version,
      });
    } catch (error) {
      logger.error("Error during schema version validation", {
        databaseName: schema.database_name,
        error: (error as Error).message,
      });

      throw new Error(
        `Error validating schema version for ${schema.database_name}: ${
          (error as Error).message
        }`
      );
    }
  }

  /**
   * Validate the provided schema object to ensure it has minimum required properties
   * @param schema The schema object to validate
   * @returns True if the schema is valid, otherwise throws an error
   */
  private static validateSchema(schema: any): schema is DatabaseSchema {
    logger.trace("Validating database schema configuration");

    if (!schema) {
      logger.error("Schema validation failed: null or undefined schema");
      throw new Error("Schema configuration is null or undefined.");
    }

    if (
      typeof schema.database_name !== "string" ||
      schema.database_name.trim() === ""
    ) {
      logger.error("Schema validation failed: invalid database_name", {
        databaseName: schema.database_name,
        type: typeof schema.database_name,
      });
      throw new Error(
        "Invalid or missing 'database_name' in schema. This is required to name the database file."
      );
    }

    if (
      typeof schema.schemas !== "object" ||
      schema.schemas === null ||
      Object.keys(schema.schemas).length === 0
    ) {
      logger.error("Schema validation failed: invalid schemas object", {
        databaseName: schema.database_name,
        schemasType: typeof schema.schemas,
        schemasCount: schema.schemas ? Object.keys(schema.schemas).length : 0,
      });
      throw new Error(
        "Invalid or missing 'schemas' object in schema. At least one table definition is required."
      );
    }

    logger.debug("Schema validation successful", {
      databaseName: schema.database_name,
      tablesCount: Object.keys(schema.schemas).length,
      version: schema.version,
    });

    return true;
  }

  /**
   * Create a new UniversalDAO instance (equivalent to SQLiteDAO)
   * @param dbPath Path to the database file
   * @param options Configuration options
   * @returns A new UniversalDAO instance
   */
  static async createDAO(
    dbPath: string,
    options?: {
      adapter?: SQLiteAdapter;
      createIfNotExists?: boolean;
      forceRecreate?: boolean;
    }
  ): Promise<UniversalDAO> {
    logger.info("Creating new UniversalDAO instance", {
      dbPath,
      hasCustomAdapter: !!options?.adapter,
      createIfNotExists: options?.createIfNotExists ?? false,
      forceRecreate: options?.forceRecreate ?? false,
    });

    let adapter: SQLiteAdapter;

    if (options?.adapter) {
      logger.debug("Using provided custom adapter", {
        adapterName: options.adapter.constructor.name,
      });
      adapter = options.adapter;
    } else {
      logger.debug("Detecting best adapter automatically");
      adapter = await this.detectBestAdapter();
    }

    const dao = new UniversalDAO(adapter, dbPath, {
      createIfNotExists: options?.createIfNotExists ?? false,
      forceRecreate: options?.forceRecreate ?? false,
    });

    logger.debug("UniversalDAO instance created successfully", {
      dbPath,
      adapterName: adapter.constructor.name,
    });

    return dao;
  }

  /**
   * Opens an existing database without initializing its schema.
   * Includes integrity check to detect corrupted files.
   * @param dbName The name of the database (e.g., 'core.db' or 'core').
   * @param options Additional options for database connection.
   * @returns A promise that resolves to a connected UniversalDAO instance.
   */
  public static async openExisting(
    dbName: string,
    options: Omit<
      DbFactoryOptions,
      "config" | "configAsset" | "configPath"
    > = {}
  ): Promise<UniversalDAO> {
    logger.info("Opening existing database", { dbName, options });

    // Determine the database file path
    const dbFileName = dbName.endsWith(".db") ? dbName : `${dbName}.db`;
    logger.debug("Resolved database filename", {
      originalName: dbName,
      resolvedName: dbFileName,
    });

    // Create and connect DAO instance
    const dao = await this.createDAO(dbFileName, options);

    try {
      logger.debug("Connecting to database", { dbFileName });
      await dao.connect();

      logger.debug("Running integrity check", { dbFileName });
      await dao.execute("PRAGMA integrity_check");

      logger.info("Database opened successfully", { dbFileName });
      return dao;
    } catch (error) {
      logger.error("Error opening database", {
        dbFileName,
        error: (error as Error).message,
      });

      try {
        await dao.close();
      } catch (closeError) {
        logger.warn("Error closing DAO after failed open", {
          dbFileName,
          closeError: (closeError as Error).message,
        });
      }

      throw new Error(
        `Error opening database '${dbFileName}': ${(error as Error).message}`
      );
    }
  }

  /**
   * Internal method to create or open database with various options
   * @param options Configuration options
   * @param isForceInit Allow re-initialization of existing database
   * @param isForceDelete Force delete and recreate database
   * @returns Promise that resolves to initialized UniversalDAO
   */
  private static async createOrOpenInternal(
    options: DbFactoryOptions,
    isForceInit: boolean = false,
    isForceDelete: boolean = false
  ): Promise<UniversalDAO> {
    logger.info("Creating or opening database internally", {
      isForceInit,
      isForceDelete,
      hasConfig: !!options.config,
      hasConfigAsset: !!options.configAsset,
    });

    let schema: DatabaseSchema;

    // Step 1: Load schema
    logger.trace("Loading database schema");
    if (options.config) {
      logger.debug("Using provided config object");
      schema = options.config;
    } else if (options.configAsset) {
      logger.debug("Using provided config asset");
      schema = options.configAsset;
    } else {
      logger.error("No database schema configuration provided");
      throw new Error(
        "Either 'config', 'configAsset', or 'configPath' must be provided to the factory."
      );
    }

    // Step 2: Validate schema
    logger.trace("Validating schema configuration");
    this.validateSchema(schema);

    // Step 3: Determine database path
    const dbFileName = schema.database_name.endsWith(".db")
      ? schema.database_name
      : `${schema.database_name}.db`;

    logger.debug("Database filename resolved", {
      originalName: schema.database_name,
      resolvedName: dbFileName,
    });

    // Step 4: Create DAO instance
    logger.debug("Creating DAO instance", {
      dbFileName,
      hasCustomAdapter: !!options.adapter,
      createIfNotExists: isForceInit,
      forceRecreate: isForceDelete,
    });

    const dao = await this.createDAO(dbFileName, {
      adapter: options.adapter,
      createIfNotExists: isForceInit,
      forceRecreate: isForceDelete,
    });

    try {
      // Step 5: Connect to database
      logger.debug("Connecting to database", { dbFileName });
      await dao.connect();

      // Step 6: Initialize schema if needed
      logger.debug("Initializing database schema", { dbFileName });
      await dao.initializeFromSchema(schema);

      // Step 7: Validate schema version compatibility
      logger.debug("Validating schema version compatibility");
      try {
        await this.validateSchemaVersion(dao, schema);
      } catch (schemaError: any) {
        logger.error("Schema version validation failed", {
          dbFileName,
          error: schemaError.message,
        });

        await dao.close();
        throw new Error(
          `Schema mismatch in existing database. Use forceRecreate=true to recreate with updated schema. Error: ${schemaError.message}`
        );
      }

      logger.info("Database created/opened successfully", {
        dbFileName,
        databaseName: schema.database_name,
        version: schema.version,
      });

      return dao;
    } catch (error) {
      logger.error("Error during database creation/opening", {
        dbFileName,
        error: (error as Error).message,
      });

      if (dao.isConnectionOpen()) {
        try {
          await dao.close();
        } catch (closeError) {
          logger.warn("Error closing DAO after failed operation", {
            dbFileName,
            closeError: (closeError as Error).message,
          });
        }
      }
      throw error;
    }
  }

  /**
   * Create a new database (DANGEROUS - will delete existing database)
   * Only use this for migrations or development, not in production
   * @param options Configuration options
   * @returns Promise that resolves to initialized UniversalDAO
   */
  public static async create(options: DbFactoryOptions): Promise<UniversalDAO> {
    logger.warn(
      "Creating database with force recreate - this will delete existing database",
      {
        databaseName:
          options.config?.database_name || options.configAsset?.database_name,
      }
    );

    return this.createOrOpenInternal(options, true, true);
  }

  /**
   * Smart method to create or open database
   * Only creates new tables if they don't exist and initializes file initially
   * Will check if file exists and is valid before deciding to create new or open existing
   * @param options Database configuration options
   * @param isForceInit Force re-initialization of tables even if they exist (default: false)
   * @returns Promise that resolves to initialized UniversalDAO
   */
  public static async createOrOpen(
    options: DbFactoryOptions,
    isForceInit: boolean = false
  ): Promise<UniversalDAO> {
    logger.info("Smart create or open database", {
      databaseName:
        options.config?.database_name || options.configAsset?.database_name,
      isForceInit,
    });

    return this.createOrOpenInternal(options, isForceInit);
  }

  /**
   * Convenience method to create a database from a JSON asset
   * @param configAsset The imported/required JSON configuration
   * @param options Additional options for database creation
   * @returns Promise that resolves to initialized UniversalDAO
   */
  public static async createFromAsset(
    configAsset: DatabaseSchema,
    options: Omit<
      DbFactoryOptions,
      "config" | "configAsset" | "configPath"
    > = {}
  ): Promise<UniversalDAO> {
    logger.info("Creating database from asset", {
      databaseName: configAsset.database_name,
      version: configAsset.version,
    });

    try {
      return await this.create({
        ...options,
        configAsset,
      });
    } catch (error) {
      logger.error("Error creating database from asset", {
        databaseName: configAsset.database_name,
        error: (error as Error).message,
      });

      throw new Error(
        `Error creating database from asset: ${(error as Error).message}`
      );
    }
  }

  /**
   * Convenience method to create a database from a configuration object
   * @param config The database schema configuration object
   * @param options Additional options for database creation
   * @returns Promise that resolves to initialized UniversalDAO
   */
  public static async createFromConfig(
    config: DatabaseSchema,
    options: Omit<
      DbFactoryOptions,
      "config" | "configAsset" | "configPath"
    > = {}
  ): Promise<UniversalDAO> {
    logger.info("Creating database from config", {
      databaseName: config.database_name,
      version: config.version,
    });

    try {
      return await this.create({
        ...options,
        config,
      });
    } catch (error) {
      logger.error("Error creating database from config", {
        databaseName: config.database_name,
        error: (error as Error).message,
      });

      throw new Error(
        `Error creating database from config: ${(error as Error).message}`
      );
    }
  }
}

export default DatabaseFactory;

```

```ts
// src/core/database-manager.ts

import {
  DatabaseSchema,
  ImportOptions,
  ImportResult,
  ColumnMapping,
} from "../types";
import { DatabaseFactory } from "./database-factory";
import { UniversalDAO } from "./universal-dao";
import { createModuleLogger, SQLiteModules } from "../logger/logger-config";

const logger = createModuleLogger(SQLiteModules.DATABASE_MANAGER);

export type DatabaseConnections = {
  [key: string]: UniversalDAO;
};

export interface RoleConfig {
  roleName: string;
  requiredDatabases: string[];
  optionalDatabases?: string[];
  priority?: number;
}

export type RoleRegistry = {
  [roleName: string]: RoleConfig;
};

export interface DatabaseImportConfig {
  databaseKey: string;
  tableName: string;
  data: Record<string, any>[];
  options?: Partial<ImportOptions>;
  columnMappings?: ColumnMapping[];
}

export interface BulkImportResult {
  totalDatabases: number;
  successDatabases: number;
  results: Record<string, ImportResult>;
  errors: Record<string, Error>;
  executionTime: number;
}

export interface SchemaManager {
  getSchema(key: string): DatabaseSchema | undefined;
  registerSchema(key: string, schema: DatabaseSchema): void;
  getAllSchemaKeys(): string[];
  hasSchema(key: string): boolean;
}

export class DatabaseManager {
  private static maxConnections = 10;
  private static connections: DatabaseConnections = {};
  private static isInitialized = false;
  private static roleRegistry: RoleRegistry = {};
  private static currentRole: string | null = null;
  private static currentUserRoles: string[] = [];
  private static activeDatabases: Set<string> = new Set();
  private static isClosingConnections = false;

  // Schema management - support dynamic schemas
  private static schemaConfigurations: Record<string, DatabaseSchema> = {};
  private static schemaManager: SchemaManager | null = null;

  // Event system for database reconnection
  private static eventListeners: Map<
    string,
    Array<(dao: UniversalDAO) => void>
  > = new Map();

  /**
   * Get the maximum number of allowed database connections
   */
  public static getMaxConnections(): number {
    logger.trace("Getting max connections", {
      maxConnections: this.maxConnections,
    });
    return this.maxConnections;
  }

  /**
   * Set the maximum number of allowed database connections
   * @param maxConnections - The maximum number of connections (must be positive)
   * @throws Error if maxConnections is not positive or if current connections exceed the new limit
   */
  public static setMaxConnections(maxConnections: number): void {
    logger.debug("Setting max connections", {
      newMaxConnections: maxConnections,
      currentMax: this.maxConnections,
    });

    if (maxConnections <= 0) {
      logger.error("Invalid max connections value", { maxConnections });
      throw new Error("Maximum connections must be a positive number");
    }

    const currentConnectionCount = Object.keys(this.connections).length;
    if (currentConnectionCount > maxConnections) {
      logger.error(
        "Cannot set max connections - would exceed current active connections",
        {
          requestedMax: maxConnections,
          currentActiveConnections: currentConnectionCount,
          activeConnectionKeys: Object.keys(this.connections),
        }
      );
      throw new Error(
        `Cannot set maximum connections to ${maxConnections}. ` +
          `Current active connections (${currentConnectionCount}) exceed the new limit. ` +
          `Please close some connections first.`
      );
    }

    this.maxConnections = maxConnections;
    logger.info("Max connections updated successfully", {
      newMaxConnections: maxConnections,
      currentActiveConnections: currentConnectionCount,
    });
  }

  /**
   * Set a schema manager for dynamic schema handling
   */
  public static setSchemaManager(manager: SchemaManager): void {
    logger.debug("Setting schema manager", {
      hadPreviousManager: this.schemaManager !== null,
    });
    this.schemaManager = manager;
    logger.info("Schema manager set successfully");
  }

  /**
   * Register a schema configuration dynamically
   */
  public static registerSchema(key: string, schema: DatabaseSchema): void {
    logger.debug("Registering schema", {
      key,
      schemaName: schema.database_name,
    });
    this.schemaConfigurations[key] = schema;
    logger.info("Schema registered successfully", {
      key,
      schemaName: schema.database_name,
    });
  }

  /**
   * Register multiple schemas at once
   */
  public static registerSchemas(schemas: Record<string, DatabaseSchema>): void {
    const schemaKeys = Object.keys(schemas);
    logger.debug("Registering multiple schemas", {
      count: schemaKeys.length,
      keys: schemaKeys,
    });

    Object.entries(schemas).forEach(([key, schema]) => {
      this.registerSchema(key, schema);
    });

    logger.info("Multiple schemas registered successfully", {
      count: schemaKeys.length,
    });
  }

  /**
   * Get schema from internal store or external manager
   */
  private static getSchema(key: string): DatabaseSchema | undefined {
    logger.trace("Getting schema", { key });

    // Try internal schemas first
    if (this.schemaConfigurations[key]) {
      logger.trace("Schema found in internal configurations", { key });
      return this.schemaConfigurations[key];
    }

    // Try external schema manager
    if (this.schemaManager) {
      logger.trace("Checking external schema manager", { key });
      const schema = this.schemaManager.getSchema(key);
      if (schema) {
        logger.trace("Schema found in external manager", { key });
        return schema;
      }
    }

    logger.warn("Schema not found", { key });
    return undefined;
  }

  /**
   * Get all available schema keys
   */
  public static getAvailableSchemas(): string[] {
    const internalKeys = Object.keys(this.schemaConfigurations);
    const externalKeys = this.schemaManager?.getAllSchemaKeys() || [];
    const allKeys = [...new Set([...internalKeys, ...externalKeys])];

    logger.trace("Getting available schemas", {
      internalCount: internalKeys.length,
      externalCount: externalKeys.length,
      totalUnique: allKeys.length,
    });

    return allKeys;
  }

  /**
   * Register a role configuration
   */
  public static registerRole(roleConfig: RoleConfig): void {
    logger.debug("Registering role", {
      roleName: roleConfig.roleName,
      requiredDatabases: roleConfig.requiredDatabases,
      optionalDatabases: roleConfig.optionalDatabases,
      priority: roleConfig.priority,
    });

    this.roleRegistry[roleConfig.roleName] = roleConfig;
    logger.info("Role registered successfully", {
      roleName: roleConfig.roleName,
    });
  }

  /**
   * Register multiple roles
   */
  public static registerRoles(roleConfigs: RoleConfig[]): void {
    logger.debug("Registering multiple roles", { count: roleConfigs.length });
    roleConfigs.forEach((config) => this.registerRole(config));
    logger.info("Multiple roles registered successfully", {
      count: roleConfigs.length,
    });
  }

  /**
   * Get all registered roles
   */
  public static getRegisteredRoles(): RoleRegistry {
    logger.trace("Getting registered roles", {
      count: Object.keys(this.roleRegistry).length,
    });
    return { ...this.roleRegistry };
  }

  /**
   * Get databases for a specific role
   */
  public static getRoleDatabases(roleName: string): string[] {
    logger.trace("Getting role databases", { roleName });

    const roleConfig = this.roleRegistry[roleName];
    if (!roleConfig) {
      logger.error("Role not found in registry", {
        roleName,
        availableRoles: Object.keys(this.roleRegistry),
      });
      throw new Error(`Role '${roleName}' is not registered.`);
    }

    const databases = [
      ...roleConfig.requiredDatabases,
      ...(roleConfig.optionalDatabases || []),
    ];

    logger.trace("Role databases retrieved", { roleName, databases });
    return databases;
  }

  /**
   * Get databases for current user roles
   */
  public static getCurrentUserDatabases(): string[] {
    logger.trace("Getting current user databases", {
      currentUserRoles: this.currentUserRoles,
    });

    const allDatabases = new Set<string>();
    allDatabases.add("core"); // Core database is always included

    for (const roleName of this.currentUserRoles) {
      const roleConfig = this.roleRegistry[roleName];
      if (roleConfig) {
        roleConfig.requiredDatabases.forEach((db) => allDatabases.add(db));
        if (roleConfig.optionalDatabases) {
          roleConfig.optionalDatabases.forEach((db) => allDatabases.add(db));
        }
      } else {
        logger.warn("Role config not found for current user role", {
          roleName,
        });
      }
    }

    const result = Array.from(allDatabases);
    logger.debug("Current user databases calculated", {
      userRoles: this.currentUserRoles,
      databases: result,
    });
    return result;
  }

  /**
   * Initialize core database connection
   */
  public static async initializeCoreConnection(): Promise<void> {
    logger.debug("Initializing core database connection");

    if (this.connections["core"]) {
      logger.debug("Core connection already exists");
      return;
    }

    try {
      const coreSchema = this.getSchema("core");
      if (!coreSchema) {
        logger.error("Core database schema not found");
        throw new Error("Core database schema not found.");
      }

      logger.debug("Creating core database connection", {
        schemaName: coreSchema.database_name,
      });
      const dao = await DatabaseFactory.createOrOpen(
        { config: coreSchema },
        false
      );

      await dao.execute("PRAGMA integrity_check");
      this.connections["core"] = dao;
      logger.info("Core database connection initialized successfully");
    } catch (error) {
      logger.error("Error initializing core database", {
        error: (error as Error).message,
      });
      throw new Error(
        `Error initializing core database: ${(error as Error).message}`
      );
    }
  }

  /**
   * Set current user roles and initialize connections
   */
  public static async setCurrentUserRoles(
    userRoles: string[],
    primaryRole?: string
  ): Promise<void> {
    logger.debug("Setting current user roles", { userRoles, primaryRole });

    // Validate roles exist
    for (const roleName of userRoles) {
      if (!this.roleRegistry[roleName]) {
        logger.error("Role not registered", {
          roleName,
          availableRoles: Object.keys(this.roleRegistry),
        });
        throw new Error(
          `Role '${roleName}' is not registered. Please register it first.`
        );
      }
    }

    const previousRoles = [...this.currentUserRoles];
    this.currentUserRoles = userRoles;
    this.currentRole = primaryRole || userRoles[0] || null;

    logger.info("User roles updated", {
      previousRoles,
      newRoles: userRoles,
      primaryRole: this.currentRole,
    });

    try {
      await this.initializeUserRoleConnections();
      await this.cleanupUnusedConnections(previousRoles);
      logger.info("User role connections initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize user role connections", {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get current user roles
   */
  public static getCurrentUserRoles(): string[] {
    logger.trace("Getting current user roles", {
      roles: this.currentUserRoles,
    });
    return [...this.currentUserRoles];
  }

  /**
   * Get current primary role
   */
  public static getCurrentRole(): string | null {
    logger.trace("Getting current primary role", { role: this.currentRole });
    return this.currentRole;
  }

  /**
   * Initialize connections for current user roles
   */
  private static async initializeUserRoleConnections(): Promise<void> {
    const requiredDatabases = this.getCurrentUserDatabases();
    logger.debug("Initializing user role connections", { requiredDatabases });

    const failedInitializations: { key: string; error: Error }[] = [];

    const initPromises = requiredDatabases.map(async (dbKey) => {
      if (this.connections[dbKey]) {
        logger.trace("Database already connected", { dbKey });
        return; // Already connected
      }

      try {
        logger.debug("Initializing database connection", { dbKey });
        const schema = this.getSchema(dbKey);
        if (!schema) {
          throw new Error(
            `Database key '${dbKey}' not found in schema configurations.`
          );
        }

        const dao = await DatabaseFactory.createOrOpen(
          { config: schema },
          false
        );
        await dao.execute("PRAGMA integrity_check");
        this.connections[dbKey] = dao;
        logger.info("Database connection initialized", {
          dbKey,
          schemaName: schema.database_name,
        });
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error("Failed to initialize database connection", {
          dbKey,
          error: err.message,
        });

        // Check if database is required for any role
        const isRequired = this.currentUserRoles.some((roleName) => {
          const roleConfig = this.roleRegistry[roleName];
          return roleConfig && roleConfig.requiredDatabases.includes(dbKey);
        });

        if (isRequired) {
          failedInitializations.push({ key: dbKey, error: err });
        } else {
          logger.warn("Optional database initialization failed", {
            dbKey,
            error: err.message,
          });
        }
        // Optional databases that fail are ignored
      }
    });

    await Promise.all(initPromises);

    if (failedInitializations.length > 0) {
      const errorSummary = failedInitializations
        .map((f) => `  - ${f.key}: ${f.error.message}`)
        .join("\n");
      logger.error("Failed to initialize required databases", {
        failedDatabases: failedInitializations.map((f) => f.key),
        errorSummary,
      });
      throw new Error(
        `Failed to initialize required databases for user roles:\n${errorSummary}`
      );
    }
  }

  /**
   * Cleanup unused connections
   */
  private static async cleanupUnusedConnections(
    previousRoles: string[]
  ): Promise<void> {
    logger.debug("Cleaning up unused connections", { previousRoles });

    const previousDatabases = new Set<string>();
    previousDatabases.add("core");

    for (const roleName of previousRoles) {
      const roleConfig = this.roleRegistry[roleName];
      if (roleConfig) {
        roleConfig.requiredDatabases.forEach((db) => previousDatabases.add(db));
        if (roleConfig.optionalDatabases) {
          roleConfig.optionalDatabases.forEach((db) =>
            previousDatabases.add(db)
          );
        }
      }
    }

    const currentDatabases = new Set(this.getCurrentUserDatabases());
    const databasesToClose = Array.from(previousDatabases).filter(
      (db) => !currentDatabases.has(db)
    );

    logger.debug("Databases to cleanup", {
      databasesToClose,
      previousDatabaseCount: previousDatabases.size,
      currentDatabaseCount: currentDatabases.size,
    });

    if (databasesToClose.length > 0) {
      for (const dbKey of databasesToClose) {
        if (this.connections[dbKey]) {
          try {
            logger.debug("Closing unused database connection", { dbKey });
            await this.connections[dbKey].close();
            delete this.connections[dbKey];
            logger.info("Database connection closed", { dbKey });
          } catch (error) {
            logger.error("Error closing database connection during cleanup", {
              dbKey,
              error: (error as Error).message,
            });
            // Log error but continue cleanup
          }
        }
      }
      logger.info("Cleanup completed", { closedConnections: databasesToClose });
    } else {
      logger.debug("No connections to cleanup");
    }
  }

  /**
   * Check if current user has access to database
   */
  public static hasAccessToDatabase(dbKey: string): boolean {
    const hasAccess = this.getSchema(dbKey) !== undefined;
    logger.trace("Checking database access", { dbKey, hasAccess });
    return hasAccess;
  }

  /**
   * Get database connection
   */
  public static get(key: string): UniversalDAO {
    logger.trace("Getting database connection", { key });

    if (!this.hasAccessToDatabase(key)) {
      logger.error("Access denied to database", { key });
      throw new Error(`Access denied: Database '${key}' is not accessible.`);
    }

    const dao = this.connections[key];
    if (!dao) {
      logger.error("Database not connected", {
        key,
        availableConnections: Object.keys(this.connections),
      });
      throw new Error(
        `Database '${key}' is not connected. Please ensure it's initialized.`
      );
    }

    logger.trace("Database connection retrieved successfully", { key });
    return dao;
  }

  /**
   * Register event listener for database reconnection
   */
  public static onDatabaseReconnect(
    schemaName: string,
    callback: (dao: UniversalDAO) => void
  ): void {
    logger.debug("Registering database reconnect listener", { schemaName });

    if (!this.eventListeners.has(schemaName)) {
      this.eventListeners.set(schemaName, []);
    }
    this.eventListeners.get(schemaName)!.push(callback);

    logger.trace("Database reconnect listener registered", {
      schemaName,
      listenerCount: this.eventListeners.get(schemaName)!.length,
    });
  }

  /**
   * Remove event listener for database reconnection
   */
  public static offDatabaseReconnect(
    schemaName: string,
    callback: (dao: UniversalDAO) => void
  ): void {
    logger.debug("Removing database reconnect listener", { schemaName });

    const listeners = this.eventListeners.get(schemaName);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
        logger.trace("Database reconnect listener removed", {
          schemaName,
          remainingListeners: listeners.length,
        });
      } else {
        logger.warn("Database reconnect listener not found for removal", {
          schemaName,
        });
      }
    } else {
      logger.warn("No listeners found for schema", { schemaName });
    }
  }

  /**
   * Notify listeners of database reconnection
   */
  private static notifyDatabaseReconnect(
    schemaName: string,
    dao: UniversalDAO
  ): void {
    const listeners = this.eventListeners.get(schemaName);
    if (listeners) {
      logger.debug("Notifying database reconnect listeners", {
        schemaName,
        listenerCount: listeners.length,
      });

      listeners.forEach((callback, index) => {
        try {
          callback(dao);
          logger.trace("Database reconnect listener notified", {
            schemaName,
            listenerIndex: index,
          });
        } catch (error) {
          logger.error("Error in database reconnect listener", {
            schemaName,
            listenerIndex: index,
            error: (error as Error).message,
          });
          // Handle callback errors gracefully
        }
      });
    } else {
      logger.trace("No listeners to notify for database reconnection", {
        schemaName,
      });
    }
  }

  /**
   * Close all connections
   */
  private static async closeAllConnections(): Promise<void> {
    if (this.isClosingConnections) {
      logger.debug("Already closing connections, skipping");
      return;
    }

    logger.info("Closing all database connections", {
      connectionCount: Object.keys(this.connections).length,
    });

    this.isClosingConnections = true;
    try {
      // Save active databases
      const currentActiveDb = Object.keys(this.connections);
      currentActiveDb.forEach((dbKey) => this.activeDatabases.add(dbKey));

      logger.debug("Saving active database list for potential reconnection", {
        activeDatabases: currentActiveDb,
      });

      const closePromises = Object.entries(this.connections).map(
        async ([dbKey, dao]) => {
          try {
            logger.debug("Closing database connection", { dbKey });
            await dao.close();
            logger.trace("Database connection closed", { dbKey });
          } catch (error) {
            logger.error("Error closing database connection", {
              dbKey,
              error: (error as Error).message,
            });
            // Log error but continue closing
          }
        }
      );

      await Promise.all(closePromises);
      this.connections = {};
      logger.info("All database connections closed successfully");
    } finally {
      this.isClosingConnections = false;
    }
  }

  /**
   * Reopen connections
   */
  public static async reopenConnections(): Promise<void> {
    logger.info("Reopening database connections");

    try {
      await this.initializeCoreConnection();

      if (this.currentUserRoles.length > 0) {
        await this.initializeUserRoleConnections();
      }

      // Reinitialize previously active databases
      const activeDbArray = Array.from(this.activeDatabases);
      logger.debug("Reinitializing previously active databases", {
        activeDatabases: activeDbArray,
      });

      if (activeDbArray.length > 0) {
        for (const dbKey of activeDbArray) {
          if (!this.connections[dbKey]) {
            const schema = this.getSchema(dbKey);
            if (schema) {
              try {
                logger.debug("Reopening database connection", { dbKey });
                const dao = await DatabaseFactory.createOrOpen(
                  { config: schema },
                  false
                );
                await dao.connect();
                this.connections[dbKey] = dao;
                this.notifyDatabaseReconnect(dbKey, dao);
                logger.info("Database connection reopened", { dbKey });
              } catch (error) {
                logger.error("Failed to reopen database connection", {
                  dbKey,
                  error: (error as Error).message,
                });
                // Log error but continue
              }
            } else {
              logger.warn("Schema not found for previously active database", {
                dbKey,
              });
            }
          } else if (this.connections[dbKey]) {
            // Database exists, notify services
            logger.trace("Database already connected, notifying listeners", {
              dbKey,
            });
            this.notifyDatabaseReconnect(dbKey, this.connections[dbKey]);
          }
        }
      }

      logger.info("Database connections reopened successfully");
    } catch (error) {
      logger.error("Failed to reopen database connections", {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Ensure database connection exists and is active
   */
  public static async ensureDatabaseConnection(
    key: string
  ): Promise<UniversalDAO> {
    logger.debug("Ensuring database connection", { key });
    this.activeDatabases.add(key);

    if (!this.hasAccessToDatabase(key)) {
      logger.error("Access denied when ensuring database connection", { key });
      throw new Error(`Access denied: Database '${key}' is not accessible.`);
    }

    if (this.connections[key]) {
      try {
        const isConnected = this.connections[key].isConnectionOpen();
        if (isConnected) {
          logger.trace("Database connection already active", { key });
          return this.connections[key];
        } else {
          // Clean up inactive connection
          logger.warn("Database connection inactive, cleaning up", { key });
          try {
            await this.connections[key].close().catch(() => {});
          } catch (error) {
            logger.debug("Error during connection cleanup", {
              key,
              error: (error as Error).message,
            });
            // Ignore cleanup errors
          }
          delete this.connections[key];
        }
      } catch (error) {
        logger.error("Error checking connection status", {
          key,
          error: (error as Error).message,
        });
        delete this.connections[key];
      }
    }

    // Create new connection
    logger.debug("Creating new database connection", { key });
    return await this.getLazyLoading(key);
  }

  /**
   * Get all connections
   */
  public static getConnections(): DatabaseConnections {
    logger.trace("Getting all connections", {
      count: Object.keys(this.connections).length,
    });
    return { ...this.connections };
  }

  /**
   * Open all existing databases
   */
  public static async openAllExisting(
    databaseKeys: string[]
  ): Promise<boolean> {
    logger.info("Opening all existing databases", { databaseKeys });
    const failedOpens: { key: string; error: Error }[] = [];

    for (const key of databaseKeys) {
      try {
        logger.debug("Opening database", { key });
        const schema = this.getSchema(key);
        if (!schema) {
          throw new Error(`Invalid database key: ${key}. Schema not found.`);
        }

        const dao = await DatabaseFactory.createOrOpen(
          { config: schema },
          false
        );
        await dao.execute("PRAGMA integrity_check");
        this.connections[key] = dao;
        logger.info("Database opened successfully", {
          key,
          schemaName: schema.database_name,
        });
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error("Failed to open database", { key, error: err.message });
        failedOpens.push({ key, error: err });
      }
    }

    if (failedOpens.length > 0) {
      const errorSummary = failedOpens
        .map((f) => `  - ${f.key}: ${f.error.message}`)
        .join("\n");
      logger.error("Failed to open one or more databases", {
        failedDatabases: failedOpens.map((f) => f.key),
        errorSummary,
      });
      throw new Error(`Failed to open one or more databases:\n${errorSummary}`);
    }

    this.isInitialized = true;
    logger.info("All databases opened successfully", {
      count: databaseKeys.length,
    });
    return true;
  }

  /**
   * Initialize databases lazily
   */
  public static async initLazySchema(databaseKeys: string[]): Promise<boolean> {
    logger.debug("Initializing databases lazily", { databaseKeys });

    const invalidKeys = databaseKeys.filter((key) => !this.getSchema(key));
    if (invalidKeys.length > 0) {
      logger.error("Invalid database keys found", { invalidKeys });
      throw new Error(
        `Invalid database keys: ${invalidKeys.join(", ")}. Schemas not found.`
      );
    }

    const newConnectionsCount = databaseKeys.filter(
      (key) => !this.connections[key]
    ).length;
    const currentConnectionsCount = Object.keys(this.connections).length;

    if (currentConnectionsCount + newConnectionsCount > this.maxConnections) {
      logger.error("Would exceed maximum connections", {
        currentConnections: currentConnectionsCount,
        newConnections: newConnectionsCount,
        maxConnections: this.maxConnections,
      });
      throw new Error(
        `Cannot initialize ${newConnectionsCount} new connections. Would exceed maximum of ${this.maxConnections} connections. Current: ${currentConnectionsCount}`
      );
    }

    const failedInitializations: { key: string; error: Error }[] = [];
    const initPromises = databaseKeys.map(async (key) => {
      if (this.connections[key]) {
        logger.trace("Database already initialized", { key });
        return; // Already initialized
      }

      try {
        logger.debug("Initializing database", { key });
        const schema = this.getSchema(key)!;
        const dao = await DatabaseFactory.createOrOpen(
          { config: schema },
          false
        );
        await dao.execute("PRAGMA integrity_check");
        this.connections[key] = dao;
        logger.info("Database initialized successfully", {
          key,
          schemaName: schema.database_name,
        });
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error("Failed to initialize database", {
          key,
          error: err.message,
        });
        failedInitializations.push({ key, error: err });
      }
    });

    await Promise.all(initPromises);

    if (failedInitializations.length > 0) {
      const errorSummary = failedInitializations
        .map((f) => `  - ${f.key}: ${f.error.message}`)
        .join("\n");
      logger.error("Failed to initialize one or more databases", {
        failedDatabases: failedInitializations.map((f) => f.key),
        errorSummary,
      });
      throw new Error(
        `Failed to initialize one or more databases:\n${errorSummary}`
      );
    }

    if (Object.keys(this.connections).length > 0) {
      this.isInitialized = true;
      logger.info("Lazy schema initialization completed", {
        initializedCount: databaseKeys.length - failedInitializations.length,
      });
    }

    return true;
  }

  /**
   * Initialize all available databases
   */
  public static async initializeAll(): Promise<void> {
    if (this.isInitialized) {
      logger.debug("Database manager already initialized");
      return;
    }

    const availableSchemas = this.getAvailableSchemas();
    logger.info("Initializing all available databases", {
      schemaCount: availableSchemas.length,
      schemas: availableSchemas,
    });

    const failedInitializations: { key: string; error: Error }[] = [];

    const initPromises = availableSchemas.map(async (key) => {
      try {
        logger.debug("Initializing schema", { key });
        const schema = this.getSchema(key)!;
        const dao = await DatabaseFactory.createOrOpen(
          { config: schema },
          false
        );
        this.connections[key] = dao;
        logger.info("Schema initialized successfully", {
          key,
          schemaName: schema.database_name,
        });
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error("Failed to initialize schema", {
          key,
          error: err.message,
        });
        failedInitializations.push({ key, error: err });
      }
    });

    await Promise.all(initPromises);

    if (failedInitializations.length > 0) {
      this.isInitialized = false;
      const errorSummary = failedInitializations
        .map((f) => `  - ${f.key}: ${f.error.message}`)
        .join("\n");
      logger.error("Failed to initialize one or more databases", {
        failedDatabases: failedInitializations.map((f) => f.key),
        errorSummary,
      });
      throw new Error(
        `Failed to initialize one or more databases:\n${errorSummary}`
      );
    }

    this.isInitialized = true;
    logger.info("All databases initialized successfully", {
      totalSchemas: availableSchemas.length,
    });
  }

  /**
   * Get database with lazy loading
   */
  public static async getLazyLoading(key: string): Promise<UniversalDAO> {
    logger.debug("Getting database with lazy loading", { key });
    this.activeDatabases.add(key);

    if (!this.hasAccessToDatabase(key)) {
      logger.error("Access denied for lazy loading", { key });
      throw new Error(`Access denied: Database '${key}' is not accessible.`);
    }

    if (!this.connections[key]) {
      const schema = this.getSchema(key);
      if (!schema) {
        logger.error("Schema not found for lazy loading", { key });
        throw new Error(`Invalid database key: ${key}. Schema not found.`);
      }

      if (Object.keys(this.connections).length >= this.maxConnections) {
        logger.error("Maximum connections reached", {
          currentConnections: Object.keys(this.connections).length,
          maxConnections: this.maxConnections,
        });
        throw new Error("Maximum number of database connections reached");
      }

      logger.debug("Creating new connection for lazy loading", {
        key,
        schemaName: schema.database_name,
      });
      const dao = await DatabaseFactory.createOrOpen({ config: schema }, false);
      await dao.connect();
      this.connections[key] = dao;
      logger.info("Database connection created via lazy loading", { key });
    }

    this.isInitialized = true;
    return this.connections[key];
  }

  /**
   * Execute cross-schema transaction
   */
  public static async executeCrossSchemaTransaction(
    schemas: string[],
    callback: (daos: Record<string, UniversalDAO>) => Promise<void>
  ): Promise<void> {
    logger.debug("Executing cross-schema transaction", { schemas });

    for (const key of schemas) {
      if (!this.hasAccessToDatabase(key)) {
        logger.error("Access denied for cross-schema transaction", {
          key,
          schemas,
        });
        throw new Error(`Access denied: Database '${key}' is not accessible.`);
      }
    }

    const daos = schemas.reduce((acc, key) => {
      acc[key] = this.get(key);
      return acc;
    }, {} as Record<string, UniversalDAO>);

    logger.debug("Starting cross-schema transaction", { schemas });

    try {
      await Promise.all(
        Object.values(daos).map((dao) => dao.beginTransaction())
      );
      logger.trace("All transactions started successfully");

      await callback(daos);
      logger.trace("Transaction callback completed successfully");

      await Promise.all(
        Object.values(daos).map((dao) => dao.commitTransaction())
      );
      logger.info("Cross-schema transaction completed successfully", {
        schemas,
      });
    } catch (error) {
      logger.error("Cross-schema transaction failed, rolling back", {
        schemas,
        error: (error as Error).message,
      });

      await Promise.all(
        Object.values(daos).map((dao) => dao.rollbackTransaction())
      );
      logger.debug("Cross-schema transaction rolled back");
      throw error;
    }
  }

  /**
   * Import data to table
   */
  public static async importDataToTable(
    databaseKey: string,
    tableName: string,
    data: Record<string, any>[],
    options: Partial<ImportOptions> = {}
  ): Promise<ImportResult> {
    logger.debug("Importing data to table", {
      databaseKey,
      tableName,
      recordCount: data.length,
      options,
    });

    if (!this.hasAccessToDatabase(databaseKey)) {
      logger.error("Access denied for data import", { databaseKey, tableName });
      throw new Error(
        `Access denied: Database '${databaseKey}' is not accessible.`
      );
    }

    const dao = this.get(databaseKey);
    try {
      const result = await dao.importData({
        tableName,
        data,
        ...options,
      });
      logger.info("Data import completed successfully", {
        databaseKey,
        tableName,
        importedRows: result.successRows,
        skippedRows: result.errorRows,
      });
      return result;
    } catch (error) {
      logger.error("Data import failed", {
        databaseKey,
        tableName,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Import data with column mapping
   */
  public static async importDataWithMapping(
    databaseKey: string,
    tableName: string,
    data: Record<string, any>[],
    columnMappings: ColumnMapping[],
    options: Partial<ImportOptions> = {}
  ): Promise<ImportResult> {
    logger.debug("Importing data with column mapping", {
      databaseKey,
      tableName,
      recordCount: data.length,
      mappingCount: columnMappings.length,
      options,
    });

    if (!this.hasAccessToDatabase(databaseKey)) {
      logger.error("Access denied for data import with mapping", {
        databaseKey,
        tableName,
      });
      throw new Error(
        `Access denied: Database '${databaseKey}' is not accessible.`
      );
    }

    const dao = this.get(databaseKey);
    try {
      const result = await dao.importDataWithMapping(
        tableName,
        data,
        columnMappings,
        options
      );
      logger.info("Data import with mapping completed successfully", {
        databaseKey,
        tableName,
        importedRows: result.successRows,
        skippedRows: result.errorRows,
      });
      return result;
    } catch (error) {
      logger.error("Data import with mapping failed", {
        databaseKey,
        tableName,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Bulk import data
   */
  public static async bulkImport(
    importConfigs: DatabaseImportConfig[]
  ): Promise<BulkImportResult> {
    const startTime = Date.now();
    logger.info("Starting bulk import", {
      configCount: importConfigs.length,
      configs: importConfigs.map((c) => ({
        databaseKey: c.databaseKey,
        tableName: c.tableName,
        recordCount: c.data.length,
      })),
    });

    const result: BulkImportResult = {
      totalDatabases: importConfigs.length,
      successDatabases: 0,
      results: {},
      errors: {},
      executionTime: 0,
    };

    for (const config of importConfigs) {
      const configKey = `${config.databaseKey}.${config.tableName}`;
      logger.debug("Processing bulk import config", { configKey });

      try {
        if (!this.hasAccessToDatabase(config.databaseKey)) {
          throw new Error(
            `Access denied: Database '${config.databaseKey}' is not accessible.`
          );
        }

        const dao = this.get(config.databaseKey);
        let importResult: ImportResult;

        if (config.columnMappings) {
          logger.trace("Using column mappings for import", { configKey });
          importResult = await dao.importDataWithMapping(
            config.tableName,
            config.data,
            config.columnMappings,
            config.options
          );
        } else {
          logger.trace("Using direct import", { configKey });
          importResult = await dao.importData({
            tableName: config.tableName,
            data: config.data,
            ...config.options,
          });
        }

        result.results[configKey] = importResult;
        result.successDatabases++;
        logger.info("Bulk import config completed successfully", {
          configKey,
          importedRows: importResult.successRows,
          skippedRows: importResult.errorRows,
        });
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error("Bulk import config failed", {
          configKey,
          error: err.message,
        });
        result.errors[configKey] = err;
      }
    }

    result.executionTime = Date.now() - startTime;
    logger.info("Bulk import completed", {
      totalConfigs: result.totalDatabases,
      successfulConfigs: result.successDatabases,
      failedConfigs: Object.keys(result.errors).length,
      executionTimeMs: result.executionTime,
    });

    return result;
  }

  /**
   * Import from CSV
   */
  public static async importFromCSV(
    databaseKey: string,
    tableName: string,
    csvData: string,
    options: {
      delimiter?: string;
      hasHeader?: boolean;
      columnMappings?: ColumnMapping[];
    } & Partial<ImportOptions> = {}
  ): Promise<ImportResult> {
    logger.debug("Importing from CSV", {
      databaseKey,
      tableName,
      csvSize: csvData.length,
      options,
    });

    if (!this.hasAccessToDatabase(databaseKey)) {
      logger.error("Access denied for CSV import", { databaseKey, tableName });
      throw new Error(
        `Access denied: Database '${databaseKey}' is not accessible.`
      );
    }

    const dao = this.get(databaseKey);
    try {
      const result = await dao.importFromCSV(tableName, csvData, options);
      logger.info("CSV import completed successfully", {
        databaseKey,
        tableName,
        importedRows: result.successRows,
        skippedRows: result.errorRows,
      });
      return result;
    } catch (error) {
      logger.error("CSV import failed", {
        databaseKey,
        tableName,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get connection count
   */
  public static getConnectionCount(): number {
    const count = Object.keys(this.connections).length;
    logger.trace("Getting connection count", { count });
    return count;
  }

  /**
   * List all active connections
   */
  public static listConnections(): string[] {
    const connections = Object.keys(this.connections);
    logger.trace("Listing connections", { connections });
    return connections;
  }

  /**
   * Close specific connection
   */
  public static async closeConnection(dbKey: string): Promise<void> {
    logger.debug("Closing specific connection", { dbKey });

    const dao = this.connections[dbKey];
    if (dao) {
      try {
        await dao.disconnect();
        delete this.connections[dbKey];
        logger.info("Database connection closed successfully", { dbKey });
      } catch (error) {
        logger.error("Error closing database connection", {
          dbKey,
          error: (error as Error).message,
        });
        throw error;
      }
    } else {
      logger.warn("Attempted to close non-existent connection", { dbKey });
    }
  }

  /**
   * Close all connections and reset state
   */
  public static async closeAll(): Promise<void> {
    logger.info("Closing all connections and resetting state");

    await this.closeAllConnections();

    this.currentUserRoles = [];
    this.currentRole = null;
    this.isInitialized = false;
    this.activeDatabases.clear();
    this.eventListeners.clear();
    this.isClosingConnections = false;

    logger.info("All connections closed and state reset successfully");
  }

  /**
   * Logout user - close role-specific connections
   */
  public static async logout(): Promise<void> {
    logger.info("Logging out user", {
      currentUserRoles: this.currentUserRoles,
    });

    const connectionsToClose = Object.keys(this.connections).filter(
      (key) => key !== "core"
    );

    logger.debug("Closing role-specific connections", { connectionsToClose });

    for (const dbKey of connectionsToClose) {
      try {
        await this.connections[dbKey].close();
        delete this.connections[dbKey];
        logger.debug("Role-specific connection closed", { dbKey });
      } catch (error) {
        logger.error("Error closing connection during logout", {
          dbKey,
          error: (error as Error).message,
        });
        // Log error but continue cleanup
      }
    }

    this.currentUserRoles = [];
    this.currentRole = null;

    logger.info("User logout completed successfully", {
      closedConnections: connectionsToClose.length,
    });
  }
}
```

```ts
// src/core/base-service.ts
import {
  QueryTable,
  WhereClause,
  OrderByClause,
  ImportResult,
  ColumnMapping,
  ImportOptions,
  ServiceStatus,
  HealthCheckResult,
} from "../types";
import { UniversalDAO } from "./universal-dao";
import { DatabaseManager } from "./database-manager";
import { createModuleLogger, SQLiteModules } from "../logger/logger-config";

const logger = createModuleLogger(SQLiteModules.BASE_SERVICE);

export interface FindOptions {
  where?: WhereClause[];
  orderBy?: OrderByClause[];
  limit?: number;
  offset?: number;
  columns?: string[];
}

export type ErrorHandler = (error: Error) => void;
export type EventHandler = (data: any) => void;

/**
 * Universal BaseService - An enhanced abstract base class designed to provide
 * comprehensive CRUD operations and database management features across all
 * operating systems and frameworks using TypeScript and JavaScript.
 */
export abstract class BaseService<T = any> {
  protected dao: UniversalDAO | null = null;
  protected schemaName: string;
  protected tableName: string;
  protected isOpened: boolean = false;
  protected isInitialized: boolean = false;
  protected errorHandlers: Map<string, ErrorHandler> = new Map();
  protected eventListeners: Map<string, EventHandler[]> = new Map();
  protected primaryKeyFields: string[] = ["id"];
  private cache: Map<string, any> = new Map();
  private reconnectHandler: (dao: UniversalDAO) => void;

  constructor(schemaName: string, tableName?: string) {
    this.schemaName = schemaName;
    this.tableName = tableName || schemaName;

    logger.debug("Creating BaseService instance", {
      schemaName: this.schemaName,
      tableName: this.tableName,
      primaryKeyFields: this.primaryKeyFields,
    });

    // Register reconnect listener for database reconnection
    this.reconnectHandler = (newDao: UniversalDAO) => {
      logger.info("Database reconnected for service", {
        schemaName: this.schemaName,
        tableName: this.tableName,
      });

      this.dao = newDao;
      this._emit("daoReconnected", { schemaName: this.schemaName });
    };

    DatabaseManager.onDatabaseReconnect(schemaName, this.reconnectHandler);
    this.bindMethods();

    logger.trace("BaseService instance created successfully", {
      schemaName: this.schemaName,
      tableName: this.tableName,
    });
  }

  private bindMethods(): void {
    logger.trace("Binding service methods", {
      schemaName: this.schemaName,
      tableName: this.tableName,
    });

    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(this));
    methods.forEach((method) => {
      if (
        typeof (this as any)[method] === "function" &&
        method !== "constructor"
      ) {
        (this as any)[method] = (this as any)[method].bind(this);
      }
    });
  }

  /**
   * Set primary key fields for the service
   */
  setPrimaryKeyFields(fields: string[]): this {
    logger.debug("Setting primary key fields", {
      schemaName: this.schemaName,
      tableName: this.tableName,
      previousFields: this.primaryKeyFields,
      newFields: fields,
    });

    this.primaryKeyFields = fields;
    return this;
  }

  /**
   * Initialize the service and establish database connection
   */
  async init(): Promise<this> {
    logger.info("Initializing BaseService", {
      schemaName: this.schemaName,
      tableName: this.tableName,
      isInitialized: this.isInitialized,
    });

    try {
      if (this.isInitialized) {
        logger.debug("Service already initialized, skipping", {
          schemaName: this.schemaName,
        });
        return this;
      }

      logger.debug("Getting DAO from DatabaseManager", {
        schemaName: this.schemaName,
      });

      this.dao = await DatabaseManager.getLazyLoading(this.schemaName);

      if (!this.dao) {
        const errorMsg = `Failed to initialize DAO for schema: ${this.schemaName}`;
        logger.error(errorMsg, {
          schemaName: this.schemaName,
        });
        throw new Error(errorMsg);
      }

      if (!this.dao.isConnectionOpen()) {
        logger.debug("DAO connection not open, connecting", {
          schemaName: this.schemaName,
        });
        await this.dao.connect();
      }

      this.isOpened = true;
      this.isInitialized = true;

      logger.info("BaseService initialized successfully", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        isOpened: this.isOpened,
        isInitialized: this.isInitialized,
      });

      this._emit("initialized", { schemaName: this.schemaName });

      return this;
    } catch (error) {
      logger.error("Error initializing BaseService", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        error: (error as Error).message,
      });

      this._handleError("INIT_ERROR", error as Error);
      throw error;
    }
  }

  /**
   * Create a new record - Safe version với comprehensive error handling
   */
  async create(data: Partial<T>): Promise<T | null> {
    logger.debug("Creating new record", {
      schemaName: this.schemaName,
      tableName: this.tableName,
      hasData: !!data,
      dataKeys: data ? Object.keys(data) : [],
    });

    await this._ensureInitialized();
    await this.ensureValidConnection();

    try {
      this._validateData(data);

      logger.trace("Building data table for insert", {
        schemaName: this.schemaName,
        tableName: this.tableName,
      });

      const queryTable = this.buildDataTable(data as Record<string, any>);
      const result = await this.dao!.insert(queryTable);

      if (result.rowsAffected === 0) {
        const errorMsg = "Insert operation failed - no rows affected";
        logger.error(errorMsg, {
          schemaName: this.schemaName,
          tableName: this.tableName,
          result,
        });
        throw new Error(errorMsg);
      }

      logger.debug("Insert operation successful", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        rowsAffected: result.rowsAffected,
        lastInsertRowId: result.lastInsertRowId,
      });

      let createdRecord: T | null = null;
      const primaryKeyValue = data[this.primaryKeyFields[0] as keyof T];

      try {
        if (primaryKeyValue !== undefined && primaryKeyValue !== null) {
          logger.trace("Retrieving created record by primary key", {
            schemaName: this.schemaName,
            tableName: this.tableName,
            primaryKeyField: this.primaryKeyFields[0],
            primaryKeyValue,
          });
          createdRecord = await this.findById(primaryKeyValue as any);
        } else if (result.lastInsertRowId) {
          logger.trace("Retrieving created record by last insert ID", {
            schemaName: this.schemaName,
            tableName: this.tableName,
            lastInsertRowId: result.lastInsertRowId,
          });
          createdRecord = await this.findById(result.lastInsertRowId);
        }
      } catch (findError) {
        logger.warn("Could not retrieve created record", {
          schemaName: this.schemaName,
          tableName: this.tableName,
          findError: (findError as Error).message,
        });
      }

      if (!createdRecord) {
        logger.debug("Using original data as created record", {
          schemaName: this.schemaName,
          tableName: this.tableName,
        });
        createdRecord = data as T;
      }

      logger.info("Record created successfully", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        recordRetrieved: !!createdRecord,
      });

      this._emit("dataCreated", { operation: "create", data: createdRecord });
      return createdRecord;
    } catch (error) {
      logger.error("Error creating record", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        error: (error as Error).message,
      });

      this._handleError("CREATE_ERROR", error as Error);
      throw error;
    }
  }

  /**
   * Update an existing record
   */
  async update(id: any, data: Partial<T>): Promise<T | null> {
    logger.debug("Updating record", {
      schemaName: this.schemaName,
      tableName: this.tableName,
      id,
      hasData: !!data,
      dataKeys: data ? Object.keys(data) : [],
    });

    await this._ensureInitialized();

    try {
      if (!id) {
        const errorMsg = "ID is required for update";
        logger.error(errorMsg, {
          schemaName: this.schemaName,
          tableName: this.tableName,
        });
        throw new Error(errorMsg);
      }

      this._validateData(data);

      const updateData = {
        ...data,
        [this.primaryKeyFields[0]]: id,
      };

      logger.trace("Building update query table", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        id,
      });

      const queryTable = this.buildDataTable(updateData as Record<string, any>);
      await this.dao!.update(queryTable);

      logger.debug("Update operation completed", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        id,
      });

      const result = await this.findById(id);

      logger.info("Record updated successfully", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        id,
        recordFound: !!result,
      });

      this._emit("dataUpdated", { operation: "update", id, data: result });
      return result;
    } catch (error) {
      logger.error("Error updating record", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        id,
        error: (error as Error).message,
      });

      this._handleError("UPDATE_ERROR", error as Error);
      throw error;
    }
  }

  /**
   * Delete a record by ID
   */
  async delete(id: any): Promise<boolean> {
    logger.debug("Deleting record", {
      schemaName: this.schemaName,
      tableName: this.tableName,
      id,
    });

    await this._ensureInitialized();

    try {
      if (!id) {
        const errorMsg = "ID is required for delete";
        logger.error(errorMsg, {
          schemaName: this.schemaName,
          tableName: this.tableName,
        });
        throw new Error(errorMsg);
      }

      const queryTable: QueryTable = {
        name: this.tableName,
        cols: [],
        wheres: [{ name: this.primaryKeyFields[0], value: id }],
      };

      logger.trace("Executing delete operation", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        id,
        primaryKeyField: this.primaryKeyFields[0],
      });

      const result = await this.dao!.delete(queryTable);
      const success = result.rowsAffected > 0;

      if (success) {
        logger.info("Record deleted successfully", {
          schemaName: this.schemaName,
          tableName: this.tableName,
          id,
          rowsAffected: result.rowsAffected,
        });
        this._emit("dataDeleted", { operation: "delete", id });
      } else {
        logger.warn("Delete operation completed but no rows affected", {
          schemaName: this.schemaName,
          tableName: this.tableName,
          id,
        });
      }

      return success;
    } catch (error) {
      logger.error("Error deleting record", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        id,
        error: (error as Error).message,
      });

      this._handleError("DELETE_ERROR", error as Error);
      throw error;
    }
  }

  /**
   * Find a record by ID
   */
  async findById(id: any): Promise<T | null> {
    logger.debug("Finding record by ID", {
      schemaName: this.schemaName,
      tableName: this.tableName,
      id,
    });

    await this._ensureInitialized();

    try {
      if (!id) {
        const errorMsg = "ID is required";
        logger.error(errorMsg, {
          schemaName: this.schemaName,
          tableName: this.tableName,
        });
        throw new Error(errorMsg);
      }

      const conditions = { [this.primaryKeyFields[0]]: id };

      logger.trace("Building select query", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        conditions,
      });

      const queryTable = this.buildSelectTable(conditions);
      const result = await this.dao!.select(queryTable);

      const record = Object.keys(result).length > 0 ? (result as T) : null;

      logger.debug("Find by ID completed", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        id,
        recordFound: !!record,
      });

      this._emit("dataFetched", { operation: "findById", id });
      return record;
    } catch (error) {
      logger.error("Error finding record by ID", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        id,
        error: (error as Error).message,
      });

      this._handleError("FIND_BY_ID_ERROR", error as Error);
      throw error;
    }
  }

  /**
   * Find the first record matching conditions
   */
  async findFirst(conditions: Record<string, any> = {}): Promise<T | null> {
    logger.debug("Finding first record", {
      schemaName: this.schemaName,
      tableName: this.tableName,
      conditionsCount: Object.keys(conditions).length,
      conditions,
    });

    await this._ensureInitialized();

    try {
      logger.trace("Building select query for findFirst", {
        schemaName: this.schemaName,
        tableName: this.tableName,
      });

      const queryTable = this.buildSelectTable(conditions);
      const result = await this.dao!.select(queryTable);

      const record = Object.keys(result).length > 0 ? (result as T) : null;

      logger.debug("Find first completed", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        recordFound: !!record,
      });

      this._emit("dataFetched", { operation: "findFirst" });
      return record;
    } catch (error) {
      logger.error("Error finding first record", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        conditions,
        error: (error as Error).message,
      });

      this._handleError("FIND_FIRST_ERROR", error as Error);
      throw error;
    }
  }

  /**
   * Find all records matching conditions
   */
  async findAll(
    conditions: Record<string, any> = {},
    options: FindOptions = {}
  ): Promise<T[]> {
    logger.debug("Finding all records", {
      schemaName: this.schemaName,
      tableName: this.tableName,
      conditionsCount: Object.keys(conditions).length,
      hasLimit: !!options.limit,
      hasOffset: !!options.offset,
      hasOrderBy: !!(options.orderBy && options.orderBy.length > 0),
      limit: options.limit,
      offset: options.offset,
    });

    await this._ensureInitialized();

    try {
      // Build where clauses from conditions
      const whereFromConditions = this.buildWhereFromObject(conditions);
      const allWheres = [...whereFromConditions, ...(options.where || [])];

      logger.trace("Building query for findAll", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        totalWheres: allWheres.length,
        hasColumns: !!(options.columns && options.columns.length > 0),
      });

      const queryTable: QueryTable = {
        name: this.tableName,
        cols: options.columns ? options.columns.map((name) => ({ name })) : [],
        wheres: allWheres,
        orderbys: options.orderBy,
        limitOffset: {
          limit: options.limit,
          offset: options.offset,
        },
      };

      const results = await this.dao!.selectAll(queryTable);

      logger.info("Find all completed", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        recordsFound: results.length,
        conditionsCount: Object.keys(conditions).length,
      });

      this._emit("dataFetched", {
        operation: "findAll",
        count: results.length,
      });
      return results as T[];
    } catch (error) {
      logger.error("Error finding all records", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        conditions,
        options,
        error: (error as Error).message,
      });

      this._handleError("FIND_ALL_ERROR", error as Error);
      throw error;
    }
  }

  /**
   * Count records matching conditions
   */
  async count(where?: WhereClause[] | Record<string, any>): Promise<number> {
    logger.debug("Counting records", {
      schemaName: this.schemaName,
      tableName: this.tableName,
      hasWhere: !!where,
      whereType: where ? (Array.isArray(where) ? "array" : "object") : "none",
    });

    await this._ensureInitialized();

    try {
      let whereConditions: WhereClause[] = [];

      if (Array.isArray(where)) {
        whereConditions = where;
        logger.trace("Using array where conditions", {
          schemaName: this.schemaName,
          whereCount: whereConditions.length,
        });
      } else if (where && typeof where === "object") {
        whereConditions = this.buildWhereFromObject(where);
        logger.trace("Built where conditions from object", {
          schemaName: this.schemaName,
          whereCount: whereConditions.length,
        });
      }

      const queryTable: QueryTable = {
        name: this.tableName,
        cols: [{ name: "COUNT(*) as count" }],
        wheres: whereConditions,
      };

      const result = await this.dao!.select(queryTable);
      const count = result.count || 0;

      logger.debug("Count completed", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        count,
      });

      return count;
    } catch (error) {
      logger.error("Error counting records", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        where,
        error: (error as Error).message,
      });

      this._handleError("COUNT_ERROR", error as Error);
      throw error;
    }
  }

  /**
   * Check if a record exists by ID
   */
  async exists(id: any): Promise<boolean> {
    logger.debug("Checking if record exists", {
      schemaName: this.schemaName,
      tableName: this.tableName,
      id,
    });

    const item = await this.findById(id);
    const exists = item !== null;

    logger.debug("Existence check completed", {
      schemaName: this.schemaName,
      tableName: this.tableName,
      id,
      exists,
    });

    return exists;
  }

  /**
   * Truncate table (delete all records and reset auto-increment)
   */
  async truncate(): Promise<void> {
    logger.warn("Truncating table - this will delete all data", {
      schemaName: this.schemaName,
      tableName: this.tableName,
    });

    await this._ensureInitialized();

    try {
      logger.debug("Executing truncate operations", {
        schemaName: this.schemaName,
        tableName: this.tableName,
      });

      await this.dao!.execute(`DELETE FROM ${this.tableName}`);
      await this.dao!.execute(
        `DELETE FROM sqlite_sequence WHERE name='${this.tableName}'`
      );

      logger.info("Table truncated successfully", {
        schemaName: this.schemaName,
        tableName: this.tableName,
      });

      this._emit("tableTruncated", { tableName: this.tableName });
    } catch (error) {
      logger.error("Error truncating table", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        error: (error as Error).message,
      });

      this._handleError("TRUNCATE_ERROR", error as Error);
      throw error;
    }
  }

  /**
   * Bulk insert records
   */
  async bulkInsert(items: Partial<T>[]): Promise<ImportResult> {
    logger.info("Starting bulk insert", {
      schemaName: this.schemaName,
      tableName: this.tableName,
      itemsCount: items.length,
    });

    await this._ensureInitialized();

    try {
      if (!Array.isArray(items) || items.length === 0) {
        const errorMsg = "Items must be a non-empty array";
        logger.error(errorMsg, {
          schemaName: this.schemaName,
          tableName: this.tableName,
          itemsType: typeof items,
          itemsLength: Array.isArray(items) ? items.length : "N/A",
        });
        throw new Error(errorMsg);
      }

      logger.debug("Executing bulk insert operation", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        itemsCount: items.length,
      });

      const result = await this.dao!.importData({
        tableName: this.tableName,
        data: items as Record<string, any>[],
        batchSize: 1000,
        skipErrors: false,
        validateData: true,
      });

      logger.info("Bulk insert completed", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        totalRows: result.totalRows,
        successRows: result.successRows,
        errorRows: result.errorRows,
      });

      this._emit("dataBulkCreated", {
        operation: "bulkInsert",
        count: result.successRows,
      });
      return result;
    } catch (error) {
      logger.error("Error during bulk insert", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        itemsCount: items.length,
        error: (error as Error).message,
      });

      this._handleError("BULK_INSERT_ERROR", error as Error);
      throw error;
    }
  }

  /**
   * Bulk create records with transaction support
   */
  async bulkCreate(dataArray: Record<string, any>[]): Promise<T[]> {
    logger.info("Starting bulk create with transaction", {
      schemaName: this.schemaName,
      tableName: this.tableName,
      itemsCount: dataArray.length,
    });

    await this._ensureInitialized();

    try {
      if (!Array.isArray(dataArray) || dataArray.length === 0) {
        const errorMsg = "Data must be a non-empty array";
        logger.error(errorMsg, {
          schemaName: this.schemaName,
          tableName: this.tableName,
          dataType: typeof dataArray,
          dataLength: Array.isArray(dataArray) ? dataArray.length : "N/A",
        });
        throw new Error(errorMsg);
      }

      const results: T[] = [];

      logger.debug("Executing bulk create in transaction", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        itemsCount: dataArray.length,
      });

      await this.executeTransaction(async () => {
        for (let i = 0; i < dataArray.length; i++) {
          const data = dataArray[i];

          if (i % 100 === 0) {
            logger.trace("Bulk create progress", {
              schemaName: this.schemaName,
              tableName: this.tableName,
              processed: i,
              total: dataArray.length,
            });
          }

          this._validateData(data);
          const queryTable = this.buildDataTable(data);
          await this.dao!.insert(queryTable);
          results.push(data as T);
        }
      });

      logger.info("Bulk create completed successfully", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        recordsCreated: results.length,
      });

      this._emit("dataBulkCreated", {
        operation: "bulkCreate",
        count: results.length,
      });
      return results;
    } catch (error) {
      logger.error("Error during bulk create", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        itemsCount: dataArray.length,
        error: (error as Error).message,
      });

      this._handleError("BULK_CREATE_ERROR", error as Error);
      throw error;
    }
  }

  /**
   * Execute operations within a transaction
   */
  async executeTransaction(callback: () => Promise<any>): Promise<any> {
    logger.debug("Starting transaction", {
      schemaName: this.schemaName,
      tableName: this.tableName,
    });

    await this._ensureInitialized();

    try {
      logger.trace("Beginning database transaction", {
        schemaName: this.schemaName,
      });

      await this.dao!.beginTransaction();
      const result = await callback();

      logger.trace("Committing transaction", {
        schemaName: this.schemaName,
      });

      await this.dao!.commitTransaction();

      logger.info("Transaction completed successfully", {
        schemaName: this.schemaName,
        tableName: this.tableName,
      });

      this._emit("transactionCompleted", { operation: "transaction" });
      return result;
    } catch (error) {
      logger.error("Transaction failed, rolling back", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        error: (error as Error).message,
      });

      try {
        await this.dao!.rollbackTransaction();
        logger.debug("Transaction rollback successful", {
          schemaName: this.schemaName,
        });
      } catch (rollbackError) {
        logger.error("Error during transaction rollback", {
          schemaName: this.schemaName,
          rollbackError: (rollbackError as Error).message,
        });
        this._handleError("ROLLBACK_ERROR", rollbackError as Error);
      }

      this._handleError("TRANSACTION_ERROR", error as Error);
      throw error;
    }
  }

  /**
   * Import data from CSV
   */
  async importFromCSV(
    csvData: string,
    options: {
      delimiter?: string;
      hasHeader?: boolean;
      columnMappings?: ColumnMapping[];
    } & Partial<ImportOptions> = {}
  ): Promise<ImportResult> {
    logger.info("Starting CSV import", {
      schemaName: this.schemaName,
      tableName: this.tableName,
      csvDataLength: csvData.length,
      delimiter: options.delimiter,
      hasHeader: options.hasHeader,
      hasMappings: !!(
        options.columnMappings && options.columnMappings.length > 0
      ),
    });

    await this._ensureInitialized();

    try {
      const result = await this.dao!.importFromCSV(
        this.tableName,
        csvData,
        options
      );

      logger.info("CSV import completed", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        totalRows: result.totalRows,
        successRows: result.successRows,
        errorRows: result.errorRows,
      });

      this._emit("dataImported", { operation: "importFromCSV", result });
      return result;
    } catch (error) {
      logger.error("Error during CSV import", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        csvDataLength: csvData.length,
        error: (error as Error).message,
      });

      this._handleError("IMPORT_CSV_ERROR", error as Error);
      throw error;
    }
  }

  /**
   * Import data with column mapping
   */
  async importDataWithMapping(
    data: Record<string, any>[],
    columnMappings: ColumnMapping[],
    options: Partial<ImportOptions> = {}
  ): Promise<ImportResult> {
    logger.info("Starting import with column mapping", {
      schemaName: this.schemaName,
      tableName: this.tableName,
      dataCount: data.length,
      mappingsCount: columnMappings.length,
    });

    await this._ensureInitialized();

    try {
      const result = await this.dao!.importDataWithMapping(
        this.tableName,
        data,
        columnMappings,
        options
      );

      logger.info("Import with mapping completed", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        totalRows: result.totalRows,
        successRows: result.successRows,
        errorRows: result.errorRows,
      });

      this._emit("dataImported", { operation: "importWithMapping", result });
      return result;
    } catch (error) {
      logger.error("Error during import with mapping", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        dataCount: data.length,
        mappingsCount: columnMappings.length,
        error: (error as Error).message,
      });

      this._handleError("IMPORT_MAPPING_ERROR", error as Error);
      throw error;
    }
  }

  // Utility methods
  protected buildSelectTable(
    conditions: Record<string, any> = {},
    options: FindOptions = {}
  ): QueryTable {
    logger.trace("Building select table query", {
      schemaName: this.schemaName,
      tableName: this.tableName,
      conditionsCount: Object.keys(conditions).length,
      hasOptions: Object.keys(options).length > 0,
    });

    const queryTable: QueryTable = {
      name: this.tableName,
      cols: [],
      wheres: [],
      orderbys: options.orderBy || [],
      limitOffset: {},
    };

    if (options.columns && options.columns.length > 0) {
      queryTable.cols = options.columns.map((name) => ({ name }));
    }

    if (conditions && Object.keys(conditions).length > 0) {
      queryTable.wheres = Object.entries(conditions).map(([key, value]) => ({
        name: key,
        value,
        operator: "=",
      }));
    }

    if (options.limit !== undefined) {
      queryTable.limitOffset!.limit = options.limit;
    }
    if (options.offset !== undefined) {
      queryTable.limitOffset!.offset = options.offset;
    }

    return queryTable;
  }

  protected buildDataTable(data: Record<string, any>): QueryTable {
    logger.trace("Building data table for query", {
      schemaName: this.schemaName,
      tableName: this.tableName,
      dataKeys: Object.keys(data),
    });

    return this.dao!.convertJsonToQueryTable(
      this.tableName,
      data,
      this.primaryKeyFields
    );
  }

  protected buildWhereFromObject(obj: Record<string, any>): WhereClause[] {
    const wheres = Object.entries(obj)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => ({ name: key, value }));

    logger.trace("Built where clauses from object", {
      schemaName: this.schemaName,
      originalKeys: Object.keys(obj).length,
      filteredWheres: wheres.length,
    });

    return wheres;
  }

  // Event system
  on(event: string, handler: EventHandler): this {
    logger.trace("Adding event listener", {
      schemaName: this.schemaName,
      tableName: this.tableName,
      event,
    });

    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(handler);
    return this;
  }

  off(event: string, handler: EventHandler): this {
    logger.trace("Removing event listener", {
      schemaName: this.schemaName,
      tableName: this.tableName,
      event,
    });

    const handlers = this.eventListeners.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
    return this;
  }

  protected _emit(event: string, data: any): void {
    logger.trace("Emitting event", {
      schemaName: this.schemaName,
      tableName: this.tableName,
      event,
      hasData: !!data,
    });

    const handlers = this.eventListeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          logger.error("Error in event handler", {
            schemaName: this.schemaName,
            tableName: this.tableName,
            event,
            error: (error as Error).message,
          });
        }
      });
    }
  }

  // Error handling
  setErrorHandler(errorType: string, handler: ErrorHandler): this {
    logger.debug("Setting error handler", {
      schemaName: this.schemaName,
      tableName: this.tableName,
      errorType,
    });

    this.errorHandlers.set(errorType, handler);
    return this;
  }

  protected _handleError(errorType: string, error: Error): void {
    logger.error("Handling service error", {
      schemaName: this.schemaName,
      tableName: this.tableName,
      errorType,
      error: error.message,
    });

    const handler = this.errorHandlers.get(errorType);
    if (handler) {
      try {
        handler(error);
      } catch (handlerError) {
        logger.error("Error in error handler", {
          schemaName: this.schemaName,
          tableName: this.tableName,
          errorType,
          handlerError: (handlerError as Error).message,
        });
      }
    }
    this._emit("error", { errorType, error });
  }

  protected _validateData(data: any): void {
    if (!data || typeof data !== "object") {
      const errorMsg = "Data must be a valid object";
      logger.error("Data validation failed", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        dataType: typeof data,
        isNull: data === null,
      });
      throw new Error(errorMsg);
    }
  }

  protected async _ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      logger.debug("Service not initialized, initializing now", {
        schemaName: this.schemaName,
        tableName: this.tableName,
      });
      await this.init();
    }
  }

  private async ensureValidConnection(): Promise<void> {
    logger.trace("Ensuring valid database connection", {
      schemaName: this.schemaName,
      tableName: this.tableName,
    });

    try {
      const isConnected = this.dao?.isConnectionOpen();
      if (!isConnected) {
        logger.debug("Connection not valid, getting new connection", {
          schemaName: this.schemaName,
        });
        this.dao = await DatabaseManager.ensureDatabaseConnection(
          this.schemaName
        );
      }
    } catch (error) {
      logger.warn("Error checking connection, getting new connection", {
        schemaName: this.schemaName,
        error: (error as Error).message,
      });
      this.dao = await DatabaseManager.ensureDatabaseConnection(
        this.schemaName
      );
    }
  }

  // Information and status methods
  async getDatabaseInfo(): Promise<any> {
    logger.trace("Getting database info", {
      schemaName: this.schemaName,
      tableName: this.tableName,
    });

    await this._ensureInitialized();
    return await this.dao!.getDatabaseInfo();
  }

  async getTableInfo(): Promise<any[]> {
    logger.trace("Getting table info", {
      schemaName: this.schemaName,
      tableName: this.tableName,
    });

    await this._ensureInitialized();
    return await this.dao!.getTableInfo(this.tableName);
  }

  getStatus(): ServiceStatus {
    const status = {
      schemaName: this.schemaName,
      tableName: this.tableName,
      isOpened: this.isOpened,
      isInitialized: this.isInitialized,
      hasDao: !!this.dao,
    };

    logger.trace("Getting service status", status);
    return status;
  }

  async healthCheck(): Promise<HealthCheckResult> {
    logger.debug("Performing health check", {
      schemaName: this.schemaName,
      tableName: this.tableName,
    });

    try {
      await this._ensureInitialized();
      const count = await this.count();

      const result = {
        healthy: true,
        schemaName: this.schemaName,
        recordCount: count,
        timestamp: new Date().toISOString(),
      };

      logger.info("Health check passed", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        recordCount: count,
      });

      return result;
    } catch (error) {
      const result = {
        healthy: false,
        schemaName: this.schemaName,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      };

      logger.error("Health check failed", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        error: (error as Error).message,
      });

      return result;
    }
  }

  // Lifecycle management
  async close(): Promise<boolean> {
    logger.info("Closing BaseService", {
      schemaName: this.schemaName,
      tableName: this.tableName,
      isOpened: this.isOpened,
      isInitialized: this.isInitialized,
    });

    try {
      if (this.dao) {
        await this.dao.close();
        logger.debug("DAO closed successfully", {
          schemaName: this.schemaName,
        });
      }

      this.isOpened = false;
      this.isInitialized = false;
      this.eventListeners.clear();
      this.errorHandlers.clear();
      this.cache.clear();

      logger.info("BaseService closed successfully", {
        schemaName: this.schemaName,
        tableName: this.tableName,
      });

      this._emit("closed", { schemaName: this.schemaName });
      return true;
    } catch (error) {
      logger.error("Error closing BaseService", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        error: (error as Error).message,
      });

      this._handleError("CLOSE_ERROR", error as Error);
      throw error;
    }
  }

  public destroy(): void {
    logger.debug("Destroying BaseService", {
      schemaName: this.schemaName,
      tableName: this.tableName,
    });

    // Remove reconnect listener
    DatabaseManager.offDatabaseReconnect(
      this.schemaName,
      this.reconnectHandler
    );

    // Clear all resources
    this.eventListeners.clear();
    this.errorHandlers.clear();
    this.cache.clear();

    logger.trace("BaseService destroyed", {
      schemaName: this.schemaName,
      tableName: this.tableName,
    });
  }

  // Alias methods for backward compatibility
  async getAll(
    conditions: Record<string, any> = {},
    options: FindOptions = {}
  ): Promise<T[]> {
    logger.trace("Using getAll alias", {
      schemaName: this.schemaName,
      tableName: this.tableName,
    });
    return this.findAll(conditions, options);
  }

  async getById(id: string | number): Promise<T | null> {
    logger.trace("Using getById alias", {
      schemaName: this.schemaName,
      tableName: this.tableName,
      id,
    });
    return this.findById(id);
  }

  async getFirst(conditions: Record<string, any> = {}): Promise<T | null> {
    logger.trace("Using getFirst alias", {
      schemaName: this.schemaName,
      tableName: this.tableName,
    });
    return this.findFirst(conditions);
  }
}
```

```ts
// src/core/service-manager.ts
import { BaseService } from "./base-service";
import { ServiceStatus, HealthCheckResult } from "../types";

import { createModuleLogger, SQLiteModules } from "../logger/logger-config";

const logger = createModuleLogger(SQLiteModules.SERVICE_MANAGER);

// Concrete service class mặc định
export class DefaultService extends BaseService {
  // BaseService đã cung cấp đầy đủ functionality
}

// Interface cho cấu hình service
export interface ServiceConfig {
  schemaName: string;
  tableName: string;
  primaryKeyFields?: string[];
  serviceClass?: new (schemaName: string, tableName: string) => BaseService;
}

// Interface cho trạng thái service
export interface ServiceInfo {
  key: string;
  schemaName: string;
  tableName: string;
  status: ServiceStatus;
  isRegistered: boolean;
  createdAt: string;
  lastAccessed?: string;
}

// Interface cho báo cáo sức khỏe
export interface HealthReport {
  totalServices: number;
  healthyServices: number;
  unhealthyServices: number;
  services: Array<HealthCheckResult & { serviceKey: string }>;
  timestamp: string;
  overallHealth: boolean;
}

// Event types cho ServiceManager
export interface ServiceManagerEvent {
  type:
    | "SERVICE_CREATED"
    | "SERVICE_DESTROYED"
    | "SERVICE_ERROR"
    | "HEALTH_CHECK_COMPLETED";
  serviceKey: string;
  schemaName: string;
  tableName: string;
  timestamp: string;
  data?: any;
  error?: Error;
}

export type ServiceManagerEventHandler = (event: ServiceManagerEvent) => void;

/**
 * ServiceManager - Quản lý vòng đời các service con kế thừa từ BaseService
 * Không can thiệp vào DatabaseManager, chỉ tập trung quản lý service instances
 */
export class ServiceManager {
  private static instance: ServiceManager | null = null;

  // Service registry
  private services: Map<string, BaseService> = new Map();
  private serviceConfigs: Map<string, ServiceConfig> = new Map();
  private serviceMetadata: Map<
    string,
    { createdAt: string; lastAccessed?: string }
  > = new Map();

  // Event system
  private eventHandlers: Map<string, ServiceManagerEventHandler[]> = new Map();

  // Lifecycle management
  private isShuttingDown = false;
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    logger.info("ServiceManager instance created");
    this.bindMethods();
    this.startPeriodicCleanup();
  }

  /**
   * Singleton instance
   */
  public static getInstance(): ServiceManager {
    if (!ServiceManager.instance) {
      logger.debug("Creating new ServiceManager singleton instance");
      ServiceManager.instance = new ServiceManager();
    } else {
      logger.trace("Returning existing ServiceManager singleton instance");
    }
    return ServiceManager.instance;
  }

  /**
   * Reset singleton (chủ yếu cho testing)
   */
  public static resetInstance(): void {
    logger.warn("Resetting ServiceManager singleton instance");
    if (ServiceManager.instance) {
      ServiceManager.instance.destroy();
      ServiceManager.instance = null;
      logger.info("ServiceManager singleton instance reset successfully");
    } else {
      logger.debug("No ServiceManager instance to reset");
    }
  }

  private bindMethods(): void {
    logger.trace("Binding ServiceManager methods");
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(this));
    methods.forEach((method) => {
      if (
        typeof (this as any)[method] === "function" &&
        method !== "constructor"
      ) {
        (this as any)[method] = (this as any)[method].bind(this);
      }
    });
    logger.trace("ServiceManager methods bound successfully", {
      methodCount: methods.length,
    });
  }

  /**
   * Tạo service key duy nhất
   */
  private createServiceKey(schemaName: string, tableName: string): string {
    const key = `${schemaName}:${tableName}`;
    logger.trace("Created service key", { schemaName, tableName, key });
    return key;
  }

  /**
   * Validate service config
   */
  private validateServiceConfig(config: ServiceConfig): void {
    logger.trace("Validating service config", {
      schemaName: config.schemaName,
      tableName: config.tableName,
    });

    if (!config.schemaName?.trim()) {
      logger.error("Invalid service config: schema name missing", { config });
      throw new Error("Schema name is required and cannot be empty");
    }
    if (!config.tableName?.trim()) {
      logger.error("Invalid service config: table name missing", { config });
      throw new Error("Table name is required and cannot be empty");
    }

    logger.trace("Service config validation passed", {
      schemaName: config.schemaName,
      tableName: config.tableName,
    });
  }

  /**
   * Đăng ký cấu hình service
   */
  public registerService(config: ServiceConfig): this {
    logger.debug("Registering service", {
      schemaName: config.schemaName,
      tableName: config.tableName,
      primaryKeyFields: config.primaryKeyFields,
      hasCustomServiceClass: !!config.serviceClass,
    });

    this.validateServiceConfig(config);

    const serviceKey = this.createServiceKey(
      config.schemaName,
      config.tableName
    );

    // Normalize config
    const normalizedConfig: ServiceConfig = {
      schemaName: config.schemaName.trim(),
      tableName: config.tableName.trim(),
      primaryKeyFields: config.primaryKeyFields || ["id"],
      serviceClass: config.serviceClass || DefaultService,
    };

    const wasAlreadyRegistered = this.serviceConfigs.has(serviceKey);
    this.serviceConfigs.set(serviceKey, normalizedConfig);

    if (wasAlreadyRegistered) {
      logger.info("Service configuration updated", { serviceKey });
    } else {
      logger.info("Service registered successfully", { serviceKey });
    }

    return this;
  }

  /**
   * Đăng ký nhiều services
   */
  public registerServices(configs: ServiceConfig[]): this {
    logger.debug("Registering multiple services", { count: configs.length });

    configs.forEach((config, index) => {
      try {
        this.registerService(config);
      } catch (error) {
        logger.error("Failed to register service in batch", {
          index,
          config,
          error: (error as Error).message,
        });
        throw error;
      }
    });

    logger.info("Multiple services registered successfully", {
      count: configs.length,
    });
    return this;
  }

  /**
   * Tạo service instance từ config
   */
  private async createServiceInstance(
    config: ServiceConfig
  ): Promise<BaseService> {
    logger.debug("Creating service instance", {
      schemaName: config.schemaName,
      tableName: config.tableName,
      serviceClassName: config.serviceClass?.name || "DefaultService",
      serviceClass: config.serviceClass, // Thêm dòng này
      isDefaultService: config.serviceClass === DefaultService,
    });

    const ServiceClass = config.serviceClass || DefaultService;

    // Thêm validation
    if (!ServiceClass) {
      logger.error("ServiceClass is undefined", { config });
      throw new Error("ServiceClass is undefined");
    }

    logger.debug("About to instantiate service", {
      ServiceClassConstructor: ServiceClass,
      ServiceClassName: ServiceClass.name,
    });

    const service: any = new ServiceClass(config.schemaName, config.tableName);

    // Verify instance type
    logger.debug("Service instance created", {
      serviceConstructor: service.constructor.name,
      servicePrototype: Object.getPrototypeOf(service).constructor.name,
      hasFindByStoreId: typeof service.findByStoreId === "function",
    });

    if (config.primaryKeyFields) {
      logger.trace("Setting primary key fields", {
        schemaName: config.schemaName,
        tableName: config.tableName,
        primaryKeyFields: config.primaryKeyFields,
      });
      service.setPrimaryKeyFields(config.primaryKeyFields);
    }

    logger.info("Service instance created successfully", {
      schemaName: config.schemaName,
      tableName: config.tableName,
    });

    return service;
  }

  /**
   * Lấy service (tự động tạo nếu chưa tồn tại)
   */
  public async getService(
    schemaName: string,
    tableName: string
  ): Promise<BaseService> {
    if (this.isShuttingDown) {
      logger.error("ServiceManager is shutting down, cannot get service", {
        schemaName,
        tableName,
      });
      throw new Error("ServiceManager is shutting down");
    }

    const serviceKey = this.createServiceKey(schemaName, tableName);
    logger.debug("Getting service", { serviceKey });

    // Update access time
    const metadata = this.serviceMetadata.get(serviceKey);
    if (metadata) {
      metadata.lastAccessed = new Date().toISOString();
      logger.trace("Updated service access time", { serviceKey });
    }

    // Return existing service
    if (this.services.has(serviceKey)) {
      logger.trace("Returning existing service", { serviceKey });
      return this.services.get(serviceKey)!;
    }

    // Get or create default config
    let config = this.serviceConfigs.get(serviceKey);
    if (!config) {
      logger.debug("Creating default config for unregistered service", {
        serviceKey,
      });
      config = {
        schemaName,
        tableName,
        primaryKeyFields: ["id"],
        serviceClass: DefaultService,
      };
      this.serviceConfigs.set(serviceKey, config);
    }

    try {
      const service = await this.createServiceInstance(config);
      this.services.set(serviceKey, service);

      // Track metadata
      this.serviceMetadata.set(serviceKey, {
        createdAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
      });

      this.emit("SERVICE_CREATED", {
        serviceKey,
        schemaName,
        tableName,
      });

      logger.info("Service created and cached successfully", { serviceKey });
      return service;
    } catch (error) {
      logger.error("Failed to create service", {
        serviceKey,
        error: (error as Error).message,
      });

      this.emit("SERVICE_ERROR", {
        serviceKey,
        schemaName,
        tableName,
        error: error as Error,
      });
      throw error;
    }
  }

  /**
   * Lấy service đã tồn tại (không tự động tạo)
   */
  public getExistingService(
    schemaName: string,
    tableName: string
  ): BaseService | null {
    const serviceKey = this.createServiceKey(schemaName, tableName);
    logger.trace("Getting existing service", { serviceKey });

    const service = this.services.get(serviceKey) || null;
    if (service) {
      logger.trace("Existing service found", { serviceKey });
    } else {
      logger.trace("Existing service not found", { serviceKey });
    }

    return service;
  }

  /**
   * Khởi tạo service
   */
  public async initializeService(
    schemaName: string,
    tableName: string
  ): Promise<BaseService> {
    const serviceKey = this.createServiceKey(schemaName, tableName);
    logger.debug("Initializing service", { serviceKey });

    try {
      const service = await this.getService(schemaName, tableName);
      await service.init();
      logger.info("Service initialized successfully", { serviceKey });
      return service;
    } catch (error) {
      logger.error("Failed to initialize service", {
        serviceKey,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Hủy service instance
   */
  public async destroyService(
    schemaName: string,
    tableName: string
  ): Promise<boolean> {
    const serviceKey = this.createServiceKey(schemaName, tableName);
    logger.debug("Destroying service", { serviceKey });

    const service = this.services.get(serviceKey);

    if (!service) {
      logger.warn("Service not found for destruction", { serviceKey });
      return false;
    }

    try {
      await service.close();
      service.destroy();

      this.services.delete(serviceKey);
      this.serviceMetadata.delete(serviceKey);

      this.emit("SERVICE_DESTROYED", {
        serviceKey,
        schemaName,
        tableName,
      });

      logger.info("Service destroyed successfully", { serviceKey });
      return true;
    } catch (error) {
      logger.error("Failed to destroy service", {
        serviceKey,
        error: (error as Error).message,
      });

      this.emit("SERVICE_ERROR", {
        serviceKey,
        schemaName,
        tableName,
        error: error as Error,
      });
      return false;
    }
  }

  /**
   * Lấy danh sách services theo schema
   */
  public getServicesBySchema(schemaName: string): BaseService[] {
    logger.trace("Getting services by schema", { schemaName });

    const services: BaseService[] = [];

    for (const [serviceKey, service] of this.services) {
      const [keySchema] = serviceKey.split(":");
      if (keySchema === schemaName) {
        services.push(service);
      }
    }

    logger.debug("Found services for schema", {
      schemaName,
      count: services.length,
    });
    return services;
  }

  /**
   * Lấy danh sách service keys theo schema
   */
  public getServiceKeysBySchema(schemaName: string): string[] {
    logger.trace("Getting service keys by schema", { schemaName });

    const keys: string[] = [];

    for (const serviceKey of this.services.keys()) {
      const [keySchema] = serviceKey.split(":");
      if (keySchema === schemaName) {
        keys.push(serviceKey);
      }
    }

    logger.debug("Found service keys for schema", { schemaName, keys });
    return keys;
  }

  /**
   * Hủy tất cả services trong một schema
   */
  public async destroyServicesBySchema(schemaName: string): Promise<void> {
    const serviceKeys = this.getServiceKeysBySchema(schemaName);
    logger.debug("Destroying services by schema", { schemaName, serviceKeys });

    if (serviceKeys.length === 0) {
      logger.debug("No services found to destroy for schema", { schemaName });
      return;
    }

    const destroyPromises = serviceKeys.map(async (serviceKey) => {
      const [, tableName] = serviceKey.split(":");
      try {
        const result = await this.destroyService(schemaName, tableName);
        logger.trace("Service destroy result", { serviceKey, result });
        return result;
      } catch (error) {
        logger.error("Error destroying service in schema cleanup", {
          serviceKey,
          error: (error as Error).message,
        });
        return false;
      }
    });

    const results = await Promise.all(destroyPromises);
    const successCount = results.filter(Boolean).length;

    logger.info("Schema services destruction completed", {
      schemaName,
      totalServices: serviceKeys.length,
      successfulDestroys: successCount,
    });
  }

  /**
   * Lấy thông tin tất cả services
   */
  public getAllServiceInfo(): ServiceInfo[] {
    logger.trace("Getting all service info");

    const infos: ServiceInfo[] = [];

    // Registered services
    for (const [serviceKey, config] of this.serviceConfigs) {
      const service = this.services.get(serviceKey);
      const metadata = this.serviceMetadata.get(serviceKey);

      infos.push({
        key: serviceKey,
        schemaName: config.schemaName,
        tableName: config.tableName,
        status: service
          ? service.getStatus()
          : {
              schemaName: config.schemaName,
              tableName: config.tableName,
              isOpened: false,
              isInitialized: false,
              hasDao: false,
            },
        isRegistered: true,
        createdAt: metadata?.createdAt || "N/A",
        lastAccessed: metadata?.lastAccessed,
      });
    }

    // Unregistered services (created on-the-fly)
    for (const [serviceKey, service] of this.services) {
      if (!this.serviceConfigs.has(serviceKey)) {
        const [schemaName, tableName] = serviceKey.split(":");
        const metadata = this.serviceMetadata.get(serviceKey);

        infos.push({
          key: serviceKey,
          schemaName,
          tableName,
          status: service.getStatus(),
          isRegistered: false,
          createdAt: metadata?.createdAt || "N/A",
          lastAccessed: metadata?.lastAccessed,
        });
      }
    }

    return infos;
  }

  /**
   * Kiểm tra sức khỏe tất cả services
   */
  public async healthCheck(): Promise<HealthReport> {
    const services = Array.from(this.services.entries());
    const healthPromises = services.map(async ([serviceKey, service]) => {
      try {
        const health = await service.healthCheck();
        return { ...health, serviceKey };
      } catch (error) {
        const [schemaName, tableName] = serviceKey.split(":");
        return {
          healthy: false,
          schemaName,
          error: (error as Error).message,
          timestamp: new Date().toISOString(),
          serviceKey,
        };
      }
    });

    const results = await Promise.all(healthPromises);
    const healthyCount = results.filter((r) => r.healthy).length;

    const report: HealthReport = {
      totalServices: results.length,
      healthyServices: healthyCount,
      unhealthyServices: results.length - healthyCount,
      services: results,
      timestamp: new Date().toISOString(),
      overallHealth: healthyCount === results.length,
    };

    this.emit("HEALTH_CHECK_COMPLETED", {
      serviceKey: "*",
      schemaName: "*",
      tableName: "*",
      data: report,
    });

    return report;
  }

  /**
   * Thực hiện transaction trên nhiều services trong cùng schema
   * (Vì SQLite transaction chỉ hoạt động trong cùng database connection)
   */
  public async executeSchemaTransaction<T>(
    schemaName: string,
    callback: (services: BaseService[]) => Promise<T>
  ): Promise<T> {
    logger.trace(`Executing schema transaction for schema ${schemaName}`);
    const services = this.getServicesBySchema(schemaName);

    if (services.length === 0) {
      logger.error("No services found for schema", { schemaName });
      throw new Error(`No services found for schema: ${schemaName}`);
    }

    // Ensure all services are initialized
    for (const service of services) {
      await service.init();
    }

    // Execute transaction on the first service (they share the same database)
    const primaryService = services[0];

    return await primaryService.executeTransaction(async () => {
      return await callback(services);
    });
  }

  /**
   * Periodic cleanup for unused services
   */
  private startPeriodicCleanup(): void {
    // Cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupUnusedServices();
    }, 5 * 60 * 1000);
  }

  /**
   * Cleanup services not accessed for a long time
   */
  private async cleanupUnusedServices(
    maxIdleTime: number = 30 * 60 * 1000
  ): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    const now = Date.now();
    const servicesToDestroy: string[] = [];

    for (const [serviceKey, metadata] of this.serviceMetadata) {
      if (!metadata.lastAccessed) {
        continue;
      }

      const lastAccessTime = new Date(metadata.lastAccessed).getTime();
      if (now - lastAccessTime > maxIdleTime) {
        servicesToDestroy.push(serviceKey);
      }
    }

    for (const serviceKey of servicesToDestroy) {
      const [schemaName, tableName] = serviceKey.split(":");
      await this.destroyService(schemaName, tableName);
    }
  }

  /**
   * Event system
   */
  public on(eventType: string, handler: ServiceManagerEventHandler): this {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
    return this;
  }

  public off(eventType: string, handler: ServiceManagerEventHandler): this {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
    return this;
  }

  private emit(
    type: ServiceManagerEvent["type"],
    data: Omit<ServiceManagerEvent, "type" | "timestamp">
  ): void {
    const event: ServiceManagerEvent = {
      ...data,
      type,
      timestamp: new Date().toISOString(),
    };

    // Emit to specific event handlers
    const handlers = this.eventHandlers.get(type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(event);
        } catch (error) {
          console.error(
            `ServiceManager: Error in ${type} event handler:`,
            error
          );
        }
      });
    }

    // Emit to global event handlers
    const globalHandlers = this.eventHandlers.get("*");
    if (globalHandlers) {
      globalHandlers.forEach((handler) => {
        try {
          handler(event);
        } catch (error) {
          console.error(
            "ServiceManager: Error in global event handler:",
            error
          );
        }
      });
    }
  }

  /**
   * Utility methods
   */
  public hasService(schemaName: string, tableName: string): boolean {
    const serviceKey = this.createServiceKey(schemaName, tableName);
    return this.services.has(serviceKey);
  }

  public isRegistered(schemaName: string, tableName: string): boolean {
    const serviceKey = this.createServiceKey(schemaName, tableName);
    return this.serviceConfigs.has(serviceKey);
  }

  public getServiceCount(): number {
    return this.services.size;
  }

  public getRegisteredCount(): number {
    return this.serviceConfigs.size;
  }

  public getSchemas(): string[] {
    const schemas = new Set<string>();

    for (const serviceKey of this.services.keys()) {
      const [schemaName] = serviceKey.split(":");
      schemas.add(schemaName);
    }

    return Array.from(schemas);
  }

  /**
   * Destroy all services and cleanup resources
   */
  public async destroy(): Promise<void> {
    this.isShuttingDown = true;

    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Destroy all services
    const destroyPromises = Array.from(this.services.entries()).map(
      async ([serviceKey, service]) => {
        try {
          await service.close();
          service.destroy();
        } catch (error) {
          console.error(`Error destroying service ${serviceKey}:`, error);
        }
      }
    );

    await Promise.all(destroyPromises);

    // Clear all data
    this.services.clear();
    this.serviceConfigs.clear();
    this.serviceMetadata.clear();
    this.eventHandlers.clear();

    this.isShuttingDown = false;
  }
}

// Export singleton instance
export const serviceManager = ServiceManager.getInstance();
```
