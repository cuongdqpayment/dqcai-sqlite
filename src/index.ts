// src/index.ts - Main exports for UniversalSQLite Library
import { DatabaseManager } from "./core/database-manager";
import { UniversalDAO } from "./core/universal-dao";
import { BaseService } from "./core/base-service";
import { DatabaseFactory } from "./core/database-factory";
import { QueryBuilder } from "./query/query-builder";
import { MigrationManager } from "./utils/migration-manager";
import { CSVImporter } from "./utils/csv-import";
import {
  SQLiteAdapter,
  SQLiteResult,
  SQLiteRow,
  DatabaseSchema,
  DbFactoryOptions,
  ImportOptions,
  ImportResult,
  ColumnMapping,
  QueryTable,
  WhereClause,
  OrderByClause,
  TableDefinition,
  ColumnDefinition,
  IndexDefinition,
  ForeignKeyDefinition,
  TransactionOperation,
  TypeMappingConfig,
} from "./types";

// ========================== CORE EXPORTS ==========================
export { UniversalDAO } from "./core/universal-dao";
export { DatabaseFactory } from "./core/database-factory";
export { DatabaseManager } from "./core/database-manager";
export { BaseService } from "./core/base-service";

// ========================== QUERY & UTILITIES ==========================
export { QueryBuilder } from "./query/query-builder";
export { MigrationManager, type Migration } from "./utils/migration-manager";
export { CSVImporter } from "./utils/csv-import";

// ========================== ADAPTERS ==========================
export { BaseAdapter } from "./adapters/base-adapter";

// ========================== TYPE EXPORTS ==========================
export * from "./types";

// ========================== UNIFIED INTERFACE ==========================

/**
 * UniversalSQLite - The main unified interface providing a comprehensive
 * SQLite database management solution for all environments and platforms.
 *
 * Features:
 * - Cross-platform support (Browser, Node.js, Deno, Bun, React Native)
 * - Schema-based database management
 * - Role-based access control
 * - Advanced query building
 * - Data import/export capabilities
 * - Migration system
 * - Transaction management
 * - Connection pooling and lifecycle management
 */
export class UniversalSQLite {
  private static instance: UniversalSQLite | null = null;
  private currentSchema: string | null = null;
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  private eventListeners: Map<string, Array<(...args: any[]) => void>> =
    new Map();

  constructor() {
    // Private constructor for singleton pattern
    if (UniversalSQLite.instance) {
      throw new Error(
        "UniversalSQLite is a singleton. Use UniversalSQLite.getInstance() instead."
      );
    }
  }

  /**
   * Get singleton instance of UniversalSQLite
   */
  static getInstance(): UniversalSQLite {
    if (!UniversalSQLite.instance) {
      UniversalSQLite.instance = new UniversalSQLite();
    }
    return UniversalSQLite.instance;
  }

  /**
   * Reset singleton instance (useful for testing)
   */
  static resetInstance(): void {
    if (UniversalSQLite.instance) {
      UniversalSQLite.instance.closeAll().catch(() => {});
    }
    UniversalSQLite.instance = null;
  }

  // ========================== INITIALIZATION METHODS ==========================

  /**
   * Initialize UniversalSQLite with schema configurations
   * @param schemas - Database schema configurations
   * @param options - Additional initialization options
   */
  async initialize(
    schemas: Record<string, DatabaseSchema>,
    options: {
      registerAdapters?: SQLiteAdapter[];
      autoConnectCore?: boolean;
      defaultRoles?: string[];
      globalErrorHandler?: (error: Error, context: string) => void;
    } = {}
  ): Promise<void> {
    if (this.isInitialized) {
      return this.initializationPromise || Promise.resolve();
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._performInitialization(schemas, options);
    return this.initializationPromise;
  }

  private async _performInitialization(
    schemas: Record<string, DatabaseSchema>,
    options: {
      registerAdapters?: SQLiteAdapter[];
      autoConnectCore?: boolean;
      defaultRoles?: string[];
      globalErrorHandler?: (error: Error, context: string) => void;
    }
  ): Promise<void> {
    try {
      // Register adapters if provided
      if (options.registerAdapters) {
        options.registerAdapters.forEach((adapter) => {
          DatabaseFactory.registerAdapter(adapter);
        });
      }

      // Register global error handler
      if (options.globalErrorHandler) {
        this.on("error", options.globalErrorHandler);
      }

      // Register all schemas with DatabaseManager
      DatabaseManager.registerSchemas(schemas);

      // Initialize core connection if core schema exists and autoConnectCore is true
      if (schemas.core && options.autoConnectCore !== false) {
        await DatabaseManager.initializeCoreConnection();
      }

      // Set default roles if provided
      if (options.defaultRoles && options.defaultRoles.length > 0) {
        await DatabaseManager.setCurrentUserRoles(options.defaultRoles);
      }

      this.isInitialized = true;
      this._emit("initialized", { schemas: Object.keys(schemas) });
    } catch (error) {
      this.isInitialized = false;
      this.initializationPromise = null;
      this._emit("error", error as Error, "initialization");
      throw error;
    }
  }

  /**
   * Initialize from a single schema configuration
   */
  async initializeFromSchema(
    schema: DatabaseSchema,
    options: {
      registerAdapters?: SQLiteAdapter[];
      autoConnect?: boolean;
      globalErrorHandler?: (error: Error, context: string) => void;
    } = {}
  ): Promise<void> {
    const schemas = { [schema.database_name]: schema };
    return this.initialize(schemas, {
      ...options,
      autoConnectCore: options.autoConnect !== false,
    });
  }

  // ========================== CONNECTION MANAGEMENT ==========================

  /**
   * Connect to a specific database schema
   * @param schemaName - Name of the schema to connect to
   * @returns Promise resolving to UniversalDAO instance
   */
  async connect(schemaName: string): Promise<UniversalDAO> {
    this.ensureInitialized();
    this.currentSchema = schemaName;

    try {
      const dao = await DatabaseManager.getLazyLoading(schemaName);
      this._emit("connected", { schemaName });
      return dao;
    } catch (error) {
      this._emit("error", error as Error, "connection");
      throw error;
    }
  }

  /**
   * Get DAO for a specific schema
   * @param schemaName - Optional schema name (uses current if not provided)
   */
  getDAO(schemaName?: string): UniversalDAO {
    this.ensureInitialized();
    const schema = schemaName || this.currentSchema;

    if (!schema) {
      throw new Error(
        "No schema specified. Use connect() first or provide schemaName parameter."
      );
    }

    try {
      return DatabaseManager.get(schema);
    } catch (error) {
      this._emit("error", error as Error, "getDAO");
      throw error;
    }
  }

  /**
   * Get current connected DAO
   */
  getCurrentDAO(): UniversalDAO {
    if (!this.currentSchema) {
      throw new Error("No current connection. Call connect() first.");
    }
    return this.getDAO(this.currentSchema);
  }

  /**
   * Ensure database connection exists and is active
   */
  async ensureDatabaseConnection(schemaName: string): Promise<UniversalDAO> {
    this.ensureInitialized();

    try {
      return await DatabaseManager.ensureDatabaseConnection(schemaName);
    } catch (error) {
      this._emit("error", error as Error, "ensureConnection");
      throw error;
    }
  }

  // ========================== SERVICE CREATION ==========================

  /**
   * Create a service for a specific table
   * @param tableName - Name of the table
   * @param schemaName - Optional schema name (uses current if not provided)
   */
  createService<T = any>(
    tableName: string,
    schemaName?: string
  ): BaseService<T> {
    const schema = schemaName || this.currentSchema;
    if (!schema) {
      throw new Error(
        "No schema specified. Use connect() first or provide schemaName parameter."
      );
    }
    const ServiceClass = class extends BaseService<T> {
      constructor() {
        if (!schema) {
          throw new Error(
            "No schema specified. Use connect() first or provide schemaName parameter."
          );
        }
        super(schema, tableName);
      }
    };

    return new ServiceClass();
  }

  /**
   * Create multiple services at once
   */
  createServices<T = any>(
    tableNames: string[],
    schemaName?: string
  ): Record<string, BaseService<T>> {
    const services: Record<string, BaseService<T>> = {};

    tableNames.forEach((tableName) => {
      services[tableName] = this.createService<T>(tableName, schemaName);
    });

    return services;
  }

  // ========================== QUERY BUILDING ==========================

  /**
   * Create query builder for current connection
   */
  query(tableName?: string, schemaName?: string): QueryBuilder {
    const dao = this.getDAO(schemaName);

    if (tableName) {
      return QueryBuilder.table(tableName, dao);
    }

    return new QueryBuilder(dao);
  }

  /**
   * Create query builder from table
   */
  table(tableName: string, schemaName?: string): QueryBuilder {
    return this.query(tableName, schemaName);
  }

  /**
   * Execute raw SQL on current connection
   */
  async execute(
    sql: string,
    params?: any[],
    schemaName?: string
  ): Promise<SQLiteResult> {
    try {
      const dao = this.getDAO(schemaName);
      const result = await dao.execute(sql, params);
      this._emit("queryExecuted", {
        sql,
        params,
        rowCount: result.rowsAffected,
      });
      return result;
    } catch (error) {
      this._emit("error", error as Error, "execute");
      throw error;
    }
  }

  /**
   * Get first row from query
   */
  async getRst(
    sql: string,
    params?: any[],
    schemaName?: string
  ): Promise<SQLiteRow> {
    const dao = this.getDAO(schemaName);
    return await dao.getRst(sql, params);
  }

  /**
   * Get all rows from query
   */
  async getRsts(
    sql: string,
    params?: any[],
    schemaName?: string
  ): Promise<SQLiteRow[]> {
    const dao = this.getDAO(schemaName);
    return await dao.getRsts(sql, params);
  }

  // ========================== SCHEMA MANAGEMENT ==========================

  /**
   * Initialize database from schema
   */
  async initializeSchema(
    schema: DatabaseSchema,
    forceRecreate: boolean = false
  ): Promise<void> {
    try {
      const dao = await DatabaseFactory.createOrOpen(
        { config: schema },
        forceRecreate
      );
      await dao.initializeFromSchema(schema);
      this._emit("schemaInitialized", { schemaName: schema.database_name });
    } catch (error) {
      this._emit("error", error as Error, "schemaInitialization");
      throw error;
    }
  }

  /**
   * Get schema version for a database
   */
  async getSchemaVersion(schemaName?: string): Promise<string> {
    const dao = this.getDAO(schemaName);
    return await dao.getSchemaVersion();
  }

  /**
   * Get database information
   */
  async getDatabaseInfo(schemaName?: string): Promise<any> {
    const dao = this.getDAO(schemaName);
    return await dao.getDatabaseInfo();
  }

  /**
   * Get table information
   */
  async getTableInfo(tableName: string, schemaName?: string): Promise<any[]> {
    const dao = this.getDAO(schemaName);
    return await dao.getTableInfo(tableName);
  }

  // ========================== MIGRATION MANAGEMENT ==========================

  /**
   * Create migration manager for current connection
   */
  createMigrationManager(schemaName?: string): MigrationManager {
    const dao = this.getDAO(schemaName);
    return new MigrationManager(dao);
  }

  /**
   * Run migrations for a database
   */
  async runMigrations(
    migrations: Array<{
      version: string;
      description: string;
      up: (dao: UniversalDAO) => Promise<void>;
      down: (dao: UniversalDAO) => Promise<void>;
    }>,
    schemaName?: string,
    targetVersion?: string
  ): Promise<void> {
    const migrationManager = this.createMigrationManager(schemaName);

    migrations.forEach((migration) => {
      migrationManager.addMigration(migration);
    });

    await migrationManager.migrate(targetVersion);
    this._emit("migrationsCompleted", {
      schemaName: schemaName || this.currentSchema,
    });
  }

  // ========================== DATA IMPORT/EXPORT ==========================

  /**
   * Create CSV importer for current connection
   */
  createCSVImporter(schemaName?: string): CSVImporter {
    const dao = this.getDAO(schemaName);
    return new CSVImporter(dao);
  }

  /**
   * Import data to a specific table
   */
  async importData(
    schemaName: string,
    tableName: string,
    data: Record<string, any>[],
    options?: Partial<ImportOptions>
  ): Promise<ImportResult> {
    try {
      const result = await DatabaseManager.importDataToTable(
        schemaName,
        tableName,
        data,
        options
      );
      this._emit("dataImported", {
        schemaName,
        tableName,
        recordCount: result.successRows,
      });
      return result;
    } catch (error) {
      this._emit("error", error as Error, "dataImport");
      throw error;
    }
  }

  /**
   * Import data with column mapping
   */
  async importDataWithMapping(
    schemaName: string,
    tableName: string,
    data: Record<string, any>[],
    columnMappings: ColumnMapping[],
    options?: Partial<ImportOptions>
  ): Promise<ImportResult> {
    try {
      const result = await DatabaseManager.importDataWithMapping(
        schemaName,
        tableName,
        data,
        columnMappings,
        options
      );
      this._emit("dataImported", {
        schemaName,
        tableName,
        recordCount: result.successRows,
      });
      return result;
    } catch (error) {
      this._emit("error", error as Error, "dataImportWithMapping");
      throw error;
    }
  }

  /**
   * Import from CSV
   */
  async importFromCSV(
    schemaName: string,
    tableName: string,
    csvData: string,
    options?: {
      delimiter?: string;
      hasHeader?: boolean;
      columnMappings?: ColumnMapping[];
    } & Partial<ImportOptions>
  ): Promise<ImportResult> {
    try {
      const result = await DatabaseManager.importFromCSV(
        schemaName,
        tableName,
        csvData,
        options
      );
      this._emit("csvImported", {
        schemaName,
        tableName,
        recordCount: result.successRows,
      });
      return result;
    } catch (error) {
      this._emit("error", error as Error, "csvImport");
      throw error;
    }
  }

  /**
   * Export table data to CSV
   */
  async exportToCSV(
    tableName: string,
    schemaName?: string,
    options?: {
      columns?: string[];
      where?: string;
      orderBy?: string;
      limit?: number;
      delimiter?: string;
      includeHeaders?: boolean;
    }
  ): Promise<string> {
    const importer = this.createCSVImporter(schemaName);
    return await importer.exportToCSV(tableName, options);
  }

  // ========================== ROLE & ACCESS MANAGEMENT ==========================

  /**
   * Set user roles and initialize role-based connections
   */
  async setUserRoles(roles: string[], primaryRole?: string): Promise<void> {
    this.ensureInitialized();

    try {
      await DatabaseManager.setCurrentUserRoles(roles, primaryRole);
      this._emit("userRolesSet", { roles, primaryRole });
    } catch (error) {
      this._emit("error", error as Error, "setUserRoles");
      throw error;
    }
  }

  /**
   * Get current user roles
   */
  getCurrentUserRoles(): string[] {
    return DatabaseManager.getCurrentUserRoles();
  }

  /**
   * Get current primary role
   */
  getCurrentRole(): string | null {
    return DatabaseManager.getCurrentRole();
  }

  /**
   * Check if user has access to database
   */
  hasAccessToDatabase(dbKey: string): boolean {
    return DatabaseManager.hasAccessToDatabase(dbKey);
  }

  // ========================== TRANSACTION MANAGEMENT ==========================

  /**
   * Execute cross-schema transaction
   */
  async executeTransaction(
    schemas: string[],
    callback: (daos: Record<string, UniversalDAO>) => Promise<void>
  ): Promise<void> {
    try {
      await DatabaseManager.executeCrossSchemaTransaction(schemas, callback);
      this._emit("transactionCompleted", { schemas });
    } catch (error) {
      this._emit("error", error as Error, "transaction");
      throw error;
    }
  }

  /**
   * Execute transaction on current connection
   */
  async executeTransactionOnCurrent<T>(
    callback: (dao: UniversalDAO) => Promise<T>
  ): Promise<T> {
    const dao = this.getCurrentDAO();

    try {
      await dao.beginTransaction();
      const result = await callback(dao);
      await dao.commitTransaction();
      return result;
    } catch (error) {
      await dao.rollbackTransaction();
      throw error;
    }
  }

  // ========================== UTILITY & STATUS METHODS ==========================

  /**
   * Get environment information
   */
  getEnvironment(): string {
    return DatabaseFactory.getEnvironmentInfo();
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): {
    isInitialized: boolean;
    currentSchema: string | null;
    activeConnections: string[];
    connectionCount: number;
    userRoles: string[];
    primaryRole: string | null;
  } {
    return {
      isInitialized: this.isInitialized,
      currentSchema: this.currentSchema,
      activeConnections: DatabaseManager.listConnections(),
      connectionCount: DatabaseManager.getConnectionCount(),
      userRoles: this.getCurrentUserRoles(),
      primaryRole: this.getCurrentRole(),
    };
  }

  /**
   * Get list of available schemas
   */
  getAvailableSchemas(): string[] {
    return DatabaseManager.getAvailableSchemas();
  }

  /**
   * Health check for all connections
   */
  async healthCheck(): Promise<
    Record<string, { healthy: boolean; error?: string }>
  > {
    const connections = DatabaseManager.getConnections();
    const healthStatus: Record<string, { healthy: boolean; error?: string }> =
      {};

    for (const [schemaName, dao] of Object.entries(connections)) {
      try {
        await dao.execute("SELECT 1");
        healthStatus[schemaName] = { healthy: true };
      } catch (error) {
        healthStatus[schemaName] = {
          healthy: false,
          error: (error as Error).message,
        };
      }
    }

    return healthStatus;
  }

  // ========================== EVENT SYSTEM ==========================

  /**
   * Add event listener
   */
  on(event: string, handler: (...args: any[]) => void): this {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(handler);
    return this;
  }

  /**
   * Remove event listener
   */
  off(event: string, handler: (...args: any[]) => void): this {
    const handlers = this.eventListeners.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
    return this;
  }

  /**
   * Emit event
   */
  private _emit(event: string, ...args: any[]): void {
    const handlers = this.eventListeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(...args);
        } catch (error) {
          // Handle event handler errors gracefully
          console.error("Error in event handler:", error);
        }
      });
    }
  }

  // ========================== CONNECTION LIFECYCLE ==========================

  /**
   * Close specific connection
   */
  async closeConnection(schemaName: string): Promise<void> {
    try {
      await DatabaseManager.closeConnection(schemaName);

      if (this.currentSchema === schemaName) {
        this.currentSchema = null;
      }

      this._emit("connectionClosed", { schemaName });
    } catch (error) {
      this._emit("error", error as Error, "closeConnection");
      throw error;
    }
  }

  /**
   * Close all connections
   */
  async closeAll(): Promise<void> {
    try {
      await DatabaseManager.closeAll();
      this.currentSchema = null;
      this.isInitialized = false;
      this.initializationPromise = null;
      this.eventListeners.clear();
      this._emit("allConnectionsClosed");
    } catch (error) {
      this._emit("error", error as Error, "closeAll");
      throw error;
    }
  }

  /**
   * Logout user and close role-specific connections
   */
  async logout(): Promise<void> {
    try {
      await DatabaseManager.logout();
      this.currentSchema = null;
      this._emit("userLoggedOut");
    } catch (error) {
      this._emit("error", error as Error, "logout");
      throw error;
    }
  }

  // ========================== STATIC UTILITY METHODS ==========================

  /**
   * Register adapter with DatabaseFactory
   */
  static registerAdapter(adapter: SQLiteAdapter): void {
    DatabaseFactory.registerAdapter(adapter);
  }

  /**
   * Register role configuration
   */
  static registerRole(roleConfig: {
    roleName: string;
    requiredDatabases: string[];
    optionalDatabases?: string[];
    priority?: number;
  }): void {
    DatabaseManager.registerRole(roleConfig);
  }

  /**
   * Register multiple roles
   */
  static registerRoles(
    roleConfigs: Array<{
      roleName: string;
      requiredDatabases: string[];
      optionalDatabases?: string[];
      priority?: number;
    }>
  ): void {
    DatabaseManager.registerRoles(roleConfigs);
  }

  // ========================== PRIVATE HELPERS ==========================

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error(
        "UniversalSQLite not initialized. Call initialize() first."
      );
    }
  }
}

// ========================== FACTORY FUNCTIONS ==========================

/**
 * Create UniversalDAO instance
 */
export const createUniversalDAO = (
  dbPath: string,
  options?: {
    adapter?: SQLiteAdapter;
    createIfNotExists?: boolean;
    forceRecreate?: boolean;
  }
): UniversalDAO => {
  return DatabaseFactory.createDAO(dbPath, options);
};

/**
 * Create database from schema configuration
 */
export const createDatabaseFromSchema = async (
  schema: DatabaseSchema,
  options?: Omit<DbFactoryOptions, "config">
): Promise<UniversalDAO> => {
  return await DatabaseFactory.createFromConfig(schema, options);
};

/**
 * Open existing database
 */
export const openExistingDatabase = async (
  dbName: string,
  options?: Omit<DbFactoryOptions, "config" | "configAsset">
): Promise<UniversalDAO> => {
  return await DatabaseFactory.openExisting(dbName, options);
};

/**
 * Create query builder
 */
export const createQueryBuilder = (dao?: UniversalDAO): QueryBuilder => {
  return new QueryBuilder(dao);
};

/**
 * Create base service
 */
export const createBaseService = <T = any>(
  schemaName: string,
  tableName?: string
): BaseService<T> => {
  return new (class extends BaseService<T> {
    constructor() {
      super(schemaName, tableName);
    }
  })();
};

/**
 * Create migration manager
 */
export const createMigrationManager = (dao: UniversalDAO): MigrationManager => {
  return new MigrationManager(dao);
};

/**
 * Create CSV importer
 */
export const createCSVImporter = (dao: UniversalDAO): CSVImporter => {
  return new CSVImporter(dao);
};

// ========================== CONVENIENCE EXPORTS ==========================

/**
 * Quick setup function for common use cases
 */
export const setupUniversalSQLite = async (config: {
  schemas: Record<string, DatabaseSchema>;
  adapters?: SQLiteAdapter[];
  defaultRoles?: string[];
  autoConnect?: string; // schema name to auto-connect to
}): Promise<UniversalSQLite> => {
  const sqlite = UniversalSQLite.getInstance();

  await sqlite.initialize(config.schemas, {
    registerAdapters: config.adapters,
    defaultRoles: config.defaultRoles,
  });

  if (config.autoConnect) {
    await sqlite.connect(config.autoConnect);
  }

  return sqlite;
};

/**
 * Quick database creation from single schema
 */
export const createSingleDatabase = async (
  schema: DatabaseSchema,
  options?: {
    adapter?: SQLiteAdapter;
    autoConnect?: boolean;
  }
): Promise<{ sqlite: UniversalSQLite; dao: UniversalDAO }> => {
  const sqlite = UniversalSQLite.getInstance();

  await sqlite.initializeFromSchema(schema, {
    registerAdapters: options?.adapter ? [options.adapter] : undefined,
    autoConnect: options?.autoConnect,
  });

  const dao =
    options?.autoConnect !== false
      ? await sqlite.connect(schema.database_name)
      : sqlite.getDAO(schema.database_name);

  return { sqlite, dao };
};

// ========================== DEFAULT EXPORT ==========================

/**
 * Default export is the singleton instance
 */
const defaultInstance = UniversalSQLite.getInstance();
export default defaultInstance;
