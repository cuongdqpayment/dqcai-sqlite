// src/index.ts - Main exports for UniversalSQLite Library with Logger Integration
// ========================== LOGGER EXPORTS ==========================
export { SQLiteModules, configureSQLiteLogger } from "./logger";

// ========================== CORE EXPORTS ==========================
export { UniversalDAO } from "./core/universal-dao";
export { DatabaseFactory } from "./core/database-factory";
export { DatabaseManager } from "./core/database-manager";
export { BaseService } from "./core/base-service";
export {
  ServiceManager,
  DefaultService,
  type ServiceConfig,
  type ServiceInfo,
  type HealthReport,
  type ServiceManagerEvent,
  type ServiceManagerEventHandler,
} from "./core/service-manager";

// ========================== QUERY & UTILITIES ==========================
export { QueryBuilder } from "./query/query-builder";

// ========================== ADAPTERS ==========================
export { BaseAdapter } from "./adapters/base-adapter";
export { NodeJSAdapter } from "./adapters/nodejs-adapter";
export { ReactNativeAdapter } from "./adapters/reactnative-adapter";

// ========================== TYPE EXPORTS ==========================
export type {
  SQLiteRow,
  SQLiteResult,
  SQLiteConnection,
  SQLiteAdapter,
  DatabaseSchema,
  TypeMappingConfig,
  ColumnDefinition,
  Column,
  WhereClause,
  OrderByClause,
  LimitOffset,
  QueryTable,
  JoinClause,
  IndexDefinition,
  ForeignKeyAction,
  ForeignKeyDefinition,
  TableDefinition,
  TransactionOperation,
  ImportOptions,
  ImportResult,
  ColumnMapping,
  DbFactoryOptions,
  ServiceStatus,
  HealthCheckResult,
} from "./types";

export { SQLITE_TYPE_MAPPING } from "./types";
