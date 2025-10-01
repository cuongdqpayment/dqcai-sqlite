// src/index.ts - Main exports for UniversalSQLite Library with Logger Integration
import { DatabaseManager } from "./core/database-manager";
import { UniversalDAO } from "./core/universal-dao";
import { BaseService } from "./core/base-service";
import { DatabaseFactory } from "./core/database-factory";
import { QueryBuilder } from "./query/query-builder";
import {
  SQLiteAdapter,
  SQLiteResult,
  SQLiteRow,
  DatabaseSchema,
  DbFactoryOptions,
  ImportOptions,
  ImportResult,
  ColumnMapping,
} from "./types";
// Import logger configuration for internal use
import {
  SQLiteModules,
  createModuleLogger,
  CommonLoggerConfig,
} from "./logger/logger-config";

// ========================== LOGGER EXPORTS ==========================
export { SQLiteModules } from "./logger/logger-config";

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
 * - Integrated logging and debugging
 */
export class UniversalSQLite {
  private static instance: UniversalSQLite | null = null;
  private currentSchema: string | null = null;
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  private eventListeners: Map<string, Array<(...args: any[]) => void>> =
    new Map();

  // Module-specific logger
  private logger = createModuleLogger(SQLiteModules.UNIVERSAL_SQLITE);

  constructor() {
    // Private constructor for singleton pattern
    if (UniversalSQLite.instance) {
      throw new Error(
        "UniversalSQLite is a singleton. Use UniversalSQLite.getInstance() instead."
      );
    }
    this.logger.debug("UniversalSQLite instance created");
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
      const logger = createModuleLogger(SQLiteModules.UNIVERSAL_SQLITE);
      logger.debug("Resetting UniversalSQLite instance");
      UniversalSQLite.instance.closeAll().catch(() => {});
    }
    UniversalSQLite.instance = null;
  }

  // ========================== LOGGER CONFIGURATION METHODS ==========================

  /**
   * Configure logger for the entire library
   * @param config - Logger configuration object
   */
  static configureLogger(config: any): void {
    CommonLoggerConfig.updateConfiguration(config);
  }

  /**
   * Enable debug logging for development
   */
  static enableDebugLogging(): void {
    const debugConfig = CommonLoggerConfig.createDebugConfig();
    CommonLoggerConfig.updateConfiguration(debugConfig);
  }

  /**
   * Set production logging (errors and warnings only)
   */
  static setProductionLogging(): void {
    const prodConfig = CommonLoggerConfig.createProductionConfig();
    CommonLoggerConfig.updateConfiguration(prodConfig);
  }

  /**
   * Enable logging globally
   */
  static enableLogging(): void {
    CommonLoggerConfig.setEnabled(true);
  }

  /**
   * Disable logging globally
   */
  static disableLogging(): void {
    CommonLoggerConfig.setEnabled(false);
  }

  /**
   * Enable specific module logging
   */
  static enableModuleLogging(
    moduleName: string,
    levels?: string[],
    appenders?: string[]
  ): void {
    CommonLoggerConfig.enableModule(moduleName, levels, appenders);
  }

  /**
   * Disable specific module logging
   */
  static disableModuleLogging(moduleName: string): void {
    CommonLoggerConfig.disableModule(moduleName);
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
      loggerConfig?: any; // Logger configuration
    } = {}
  ): Promise<void> {
    this.logger.debug("Starting initialization", {
      schemas: Object.keys(schemas),
      options,
    });

    if (this.isInitialized) {
      this.logger.debug("Already initialized, returning existing promise");
      return this.initializationPromise || Promise.resolve();
    }

    if (this.initializationPromise) {
      this.logger.debug("Initialization in progress, waiting...");
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
      loggerConfig?: any;
    }
  ): Promise<void> {
    try {
      this.logger.info("Performing initialization", {
        schemaCount: Object.keys(schemas).length,
      });

      // Configure logger if provided
      if (options.loggerConfig) {
        this.logger.debug("Configuring custom logger");
        CommonLoggerConfig.updateConfiguration(options.loggerConfig);
      }

      // Register adapters if provided
      if (options.registerAdapters) {
        this.logger.debug("Registering adapters", {
          count: options.registerAdapters.length,
        });
        options.registerAdapters.forEach((adapter) => {
          DatabaseFactory.registerAdapter(adapter);
        });
      }

      // Register global error handler
      if (options.globalErrorHandler) {
        this.logger.debug("Registering global error handler");
        this.on("error", options.globalErrorHandler);
      }

      // Register all schemas with DatabaseManager
      this.logger.debug("Registering schemas with DatabaseManager");
      DatabaseManager.registerSchemas(schemas);

      // Initialize core connection if core schema exists and autoConnectCore is true
      if (schemas.core && options.autoConnectCore !== false) {
        this.logger.debug("Initializing core connection");
        await DatabaseManager.initializeCoreConnection();
      }

      // Set default roles if provided
      if (options.defaultRoles && options.defaultRoles.length > 0) {
        this.logger.debug("Setting default roles", {
          roles: options.defaultRoles,
        });
        await DatabaseManager.setCurrentUserRoles(options.defaultRoles);
      }

      this.isInitialized = true;
      this.logger.info("Initialization completed successfully");
      this._emit("initialized", { schemas: Object.keys(schemas) });
    } catch (error) {
      this.isInitialized = false;
      this.initializationPromise = null;
      this.logger.error("Initialization failed", error);
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
      loggerConfig?: any;
    } = {}
  ): Promise<void> {
    this.logger.debug("Initializing from single schema", {
      schemaName: schema.database_name,
    });
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
    this.logger.debug("Connecting to schema", { schemaName });
    this.ensureInitialized();
    this.currentSchema = schemaName;

    try {
      const dao = await DatabaseManager.getLazyLoading(schemaName);
      this.logger.info("Successfully connected to schema", { schemaName });
      this._emit("connected", { schemaName });
      return dao;
    } catch (error) {
      this.logger.error("Failed to connect to schema", { schemaName, error });
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
      const error = new Error(
        "No schema specified. Use connect() first or provide schemaName parameter."
      );
      this.logger.error("getDAO failed: No schema specified");
      throw error;
    }

    try {
      this.logger.trace("Getting DAO for schema", { schema });
      return DatabaseManager.get(schema);
    } catch (error) {
      this.logger.error("Failed to get DAO", { schema, error });
      this._emit("error", error as Error, "getDAO");
      throw error;
    }
  }

  /**
   * Get current connected DAO
   */
  getCurrentDAO(): UniversalDAO {
    if (!this.currentSchema) {
      const error = new Error("No current connection. Call connect() first.");
      this.logger.error("getCurrentDAO failed: No current connection");
      throw error;
    }
    return this.getDAO(this.currentSchema);
  }

  /**
   * Ensure database connection exists and is active
   */
  async ensureDatabaseConnection(schemaName: string): Promise<UniversalDAO> {
    this.logger.debug("Ensuring database connection", { schemaName });
    this.ensureInitialized();

    try {
      const dao = await DatabaseManager.ensureDatabaseConnection(schemaName);
      this.logger.debug("Database connection ensured", { schemaName });
      return dao;
    } catch (error) {
      this.logger.error("Failed to ensure database connection", {
        schemaName,
        error,
      });
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
      const error = new Error(
        "No schema specified. Use connect() first or provide schemaName parameter."
      );
      this.logger.error("createService failed: No schema specified", {
        tableName,
      });
      throw error;
    }

    this.logger.debug("Creating service", { tableName, schema });

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
    this.logger.debug("Creating multiple services", { tableNames, schemaName });
    const services: Record<string, BaseService<T>> = {};

    tableNames.forEach((tableName) => {
      services[tableName] = this.createService<T>(tableName, schemaName);
    });

    this.logger.debug("Created services", { count: tableNames.length });
    return services;
  }

  // ========================== QUERY BUILDING ==========================

  /**
   * Create query builder for current connection
   */
  query(tableName?: string, schemaName?: string): QueryBuilder {
    this.logger.trace("Creating query builder", { tableName, schemaName });
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
    this.logger.debug("Executing SQL", {
      sql: sql.substring(0, 100) + "...",
      paramsCount: params?.length,
    });

    try {
      const dao = this.getDAO(schemaName);
      const result = await dao.execute(sql, params);

      this.logger.debug("SQL executed successfully", {
        rowsAffected: result.rowsAffected,
        lastInsertRowId: result.lastInsertRowId,
      });

      this._emit("queryExecuted", {
        sql,
        params,
        rowCount: result.rowsAffected,
      });
      return result;
    } catch (error) {
      this.logger.error("SQL execution failed", {
        sql: sql.substring(0, 100) + "...",
        error,
      });
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
    this.logger.trace("Getting first row", {
      sql: sql.substring(0, 100) + "...",
    });
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
    this.logger.trace("Getting all rows", {
      sql: sql.substring(0, 100) + "...",
    });
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
    this.logger.info("Initializing schema", {
      schemaName: schema.database_name,
      forceRecreate,
    });

    try {
      const dao = await DatabaseFactory.createOrOpen(
        { config: schema },
        forceRecreate
      );
      await dao.initializeFromSchema(schema);
      this.logger.info("Schema initialized successfully", {
        schemaName: schema.database_name,
      });
      this._emit("schemaInitialized", { schemaName: schema.database_name });
    } catch (error) {
      this.logger.error("Schema initialization failed", {
        schemaName: schema.database_name,
        error,
      });
      this._emit("error", error as Error, "schemaInitialization");
      throw error;
    }
  }

  /**
   * Get schema version for a database
   */
  async getSchemaVersion(schemaName?: string): Promise<string> {
    this.logger.debug("Getting schema version", { schemaName });
    const dao = this.getDAO(schemaName);
    return await dao.getSchemaVersion();
  }

  /**
   * Get database information
   */
  async getDatabaseInfo(schemaName?: string): Promise<any> {
    this.logger.debug("Getting database info", { schemaName });
    const dao = this.getDAO(schemaName);
    return await dao.getDatabaseInfo();
  }

  /**
   * Get table information
   */
  async getTableInfo(tableName: string, schemaName?: string): Promise<any[]> {
    this.logger.debug("Getting table info", { tableName, schemaName });
    const dao = this.getDAO(schemaName);
    return await dao.getTableInfo(tableName);
  }

  // ========================== DATA IMPORT/EXPORT ==========================

  /**
   * Import data to a specific table
   */
  async importData(
    schemaName: string,
    tableName: string,
    data: Record<string, any>[],
    options?: Partial<ImportOptions>
  ): Promise<ImportResult> {
    this.logger.info("Starting data import", {
      schemaName,
      tableName,
      recordCount: data.length,
    });

    try {
      const result = await DatabaseManager.importDataToTable(
        schemaName,
        tableName,
        data,
        options
      );

      this.logger.info("Data import completed", {
        schemaName,
        tableName,
        successRows: result.successRows,
        failedRows: result.errorRows,
        errors: result.errors.length,
      });

      this._emit("dataImported", {
        schemaName,
        tableName,
        recordCount: result.successRows,
      });
      return result;
    } catch (error) {
      this.logger.error("Data import failed", { schemaName, tableName, error });
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
    this.logger.info("Starting data import with mapping", {
      schemaName,
      tableName,
      recordCount: data.length,
      mappingCount: columnMappings.length,
    });

    try {
      const result = await DatabaseManager.importDataWithMapping(
        schemaName,
        tableName,
        data,
        columnMappings,
        options
      );

      this.logger.info("Data import with mapping completed", {
        schemaName,
        tableName,
        successRows: result.successRows,
        failedRows: result.errorRows,
      });

      this._emit("dataImported", {
        schemaName,
        tableName,
        recordCount: result.successRows,
      });
      return result;
    } catch (error) {
      this.logger.error("Data import with mapping failed", {
        schemaName,
        tableName,
        error,
      });
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
    this.logger.info("Starting CSV import", {
      schemaName,
      tableName,
      csvLength: csvData.length,
      delimiter: options?.delimiter,
      hasHeader: options?.hasHeader,
    });

    try {
      const result = await DatabaseManager.importFromCSV(
        schemaName,
        tableName,
        csvData,
        options
      );

      this.logger.info("CSV import completed", {
        schemaName,
        tableName,
        successRows: result.successRows,
        failedRows: result.errorRows,
      });

      this._emit("csvImported", {
        schemaName,
        tableName,
        recordCount: result.successRows,
      });
      return result;
    } catch (error) {
      this.logger.error("CSV import failed", { schemaName, tableName, error });
      this._emit("error", error as Error, "csvImport");
      throw error;
    }
  }

  // ========================== ROLE & ACCESS MANAGEMENT ==========================

  /**
   * Set user roles and initialize role-based connections
   */
  async setUserRoles(roles: string[], primaryRole?: string): Promise<void> {
    this.logger.info("Setting user roles", { roles, primaryRole });
    this.ensureInitialized();

    try {
      await DatabaseManager.setCurrentUserRoles(roles, primaryRole);
      this.logger.info("User roles set successfully", { roles, primaryRole });
      this._emit("userRolesSet", { roles, primaryRole });
    } catch (error) {
      this.logger.error("Failed to set user roles", {
        roles,
        primaryRole,
        error,
      });
      this._emit("error", error as Error, "setUserRoles");
      throw error;
    }
  }

  /**
   * Get current user roles
   */
  getCurrentUserRoles(): string[] {
    const roles = DatabaseManager.getCurrentUserRoles();
    this.logger.trace("Getting current user roles", { roles });
    return roles;
  }

  /**
   * Get current primary role
   */
  getCurrentRole(): string | null {
    const role = DatabaseManager.getCurrentRole();
    this.logger.trace("Getting current role", { role });
    return role;
  }

  /**
   * Check if user has access to database
   */
  hasAccessToDatabase(dbKey: string): boolean {
    const hasAccess = DatabaseManager.hasAccessToDatabase(dbKey);
    this.logger.trace("Checking database access", { dbKey, hasAccess });
    return hasAccess;
  }

  // ========================== TRANSACTION MANAGEMENT ==========================

  /**
   * Execute cross-schema transaction
   */
  async executeTransaction(
    schemas: string[],
    callback: (daos: Record<string, UniversalDAO>) => Promise<void>
  ): Promise<void> {
    this.logger.info("Starting cross-schema transaction", { schemas });

    try {
      await DatabaseManager.executeCrossSchemaTransaction(schemas, callback);
      this.logger.info("Cross-schema transaction completed successfully", {
        schemas,
      });
      this._emit("transactionCompleted", { schemas });
    } catch (error) {
      this.logger.error("Cross-schema transaction failed", { schemas, error });
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
    this.logger.debug("Starting transaction on current connection");
    const dao = this.getCurrentDAO();

    try {
      await dao.beginTransaction();
      this.logger.trace("Transaction begun");

      const result = await callback(dao);

      await dao.commitTransaction();
      this.logger.debug("Transaction committed successfully");
      return result;
    } catch (error) {
      this.logger.warn("Transaction failed, rolling back", { error });
      await dao.rollbackTransaction();
      throw error;
    }
  }

  // ========================== UTILITY & STATUS METHODS ==========================

  /**
   * Get environment information
   */
  getEnvironment(): string {
    const env = DatabaseFactory.getEnvironmentInfo();
    this.logger.trace("Getting environment info", { env });
    return env;
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
    const status = {
      isInitialized: this.isInitialized,
      currentSchema: this.currentSchema,
      activeConnections: DatabaseManager.listConnections(),
      connectionCount: DatabaseManager.getConnectionCount(),
      userRoles: this.getCurrentUserRoles(),
      primaryRole: this.getCurrentRole(),
    };

    this.logger.trace("Getting connection status", status);
    return status;
  }

  /**
   * Get list of available schemas
   */
  getAvailableSchemas(): string[] {
    const schemas = DatabaseManager.getAvailableSchemas();
    this.logger.trace("Getting available schemas", { schemas });
    return schemas;
  }

  /**
   * Health check for all connections
   */
  async healthCheck(): Promise<
    Record<string, { healthy: boolean; error?: string }>
  > {
    this.logger.debug("Starting health check for all connections");
    const connections = DatabaseManager.getConnections();
    const healthStatus: Record<string, { healthy: boolean; error?: string }> =
      {};

    for (const [schemaName, dao] of Object.entries(connections)) {
      try {
        await dao.execute("SELECT 1");
        healthStatus[schemaName] = { healthy: true };
        this.logger.trace("Health check passed", { schemaName });
      } catch (error) {
        healthStatus[schemaName] = {
          healthy: false,
          error: (error as Error).message,
        };
        this.logger.warn("Health check failed", { schemaName, error });
      }
    }

    this.logger.debug("Health check completed", {
      totalConnections: Object.keys(healthStatus).length,
      healthyConnections: Object.values(healthStatus).filter((s) => s.healthy)
        .length,
    });

    return healthStatus;
  }

  // ========================== EVENT SYSTEM ==========================

  /**
   * Add event listener
   */
  on(event: string, handler: (...args: any[]) => void): this {
    this.logger.trace("Adding event listener", { event });
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
    this.logger.trace("Removing event listener", { event });
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
    this.logger.trace("Emitting event", { event, argsCount: args.length });
    const handlers = this.eventListeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(...args);
        } catch (error) {
          // Handle event handler errors gracefully
          this.logger.error("Error in event handler", { event, error });
        }
      });
    }
  }

  // ========================== CONNECTION LIFECYCLE ==========================

  /**
   * Close specific connection
   */
  async closeConnection(schemaName: string): Promise<void> {
    this.logger.info("Closing connection", { schemaName });

    try {
      await DatabaseManager.closeConnection(schemaName);

      if (this.currentSchema === schemaName) {
        this.currentSchema = null;
        this.logger.debug("Current schema reset due to connection close");
      }

      this.logger.info("Connection closed successfully", { schemaName });
      this._emit("connectionClosed", { schemaName });
    } catch (error) {
      this.logger.error("Failed to close connection", { schemaName, error });
      this._emit("error", error as Error, "closeConnection");
      throw error;
    }
  }

  /**
   * Close all connections
   */
  async closeAll(): Promise<void> {
    this.logger.info("Closing all connections");

    try {
      await DatabaseManager.closeAll();
      this.currentSchema = null;
      this.isInitialized = false;
      this.initializationPromise = null;
      this.eventListeners.clear();

      this.logger.info("All connections closed successfully");
      this._emit("allConnectionsClosed");
    } catch (error) {
      this.logger.error("Failed to close all connections", { error });
      this._emit("error", error as Error, "closeAll");
      throw error;
    }
  }

  /**
   * Logout user and close role-specific connections
   */
  async logout(): Promise<void> {
    this.logger.info("User logout initiated");

    try {
      await DatabaseManager.logout();
      this.currentSchema = null;
      this.logger.info("User logout completed successfully");
      this._emit("userLoggedOut");
    } catch (error) {
      this.logger.error("User logout failed", { error });
      this._emit("error", error as Error, "logout");
      throw error;
    }
  }

  // ========================== STATIC UTILITY METHODS ==========================

  /**
   * Register adapter with DatabaseFactory
   */
  static registerAdapter(adapter: SQLiteAdapter): void {
    const logger = createModuleLogger(SQLiteModules.UNIVERSAL_SQLITE);
    logger.debug("Registering adapter", {
      adapterName: adapter.name,
      adapterVersion: adapter.version,
    });
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
    const logger = createModuleLogger(SQLiteModules.UNIVERSAL_SQLITE);
    logger.debug("Registering role", { roleConfig });
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
    const logger = createModuleLogger(SQLiteModules.UNIVERSAL_SQLITE);
    logger.debug("Registering multiple roles", {
      roleCount: roleConfigs.length,
    });
    DatabaseManager.registerRoles(roleConfigs);
  }

  // ========================== PRIVATE HELPERS ==========================

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      const error = new Error(
        "UniversalSQLite not initialized. Call initialize() first."
      );
      this.logger.error("Operation attempted on uninitialized instance");
      throw error;
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
  const logger = createModuleLogger(SQLiteModules.DATABASE_FACTORY);
  logger.debug("Creating UniversalDAO", { dbPath, options });
  return DatabaseFactory.createDAO(dbPath, options);
};

/**
 * Create database from schema configuration
 */
export const createDatabaseFromSchema = async (
  schema: DatabaseSchema,
  options?: Omit<DbFactoryOptions, "config">
): Promise<UniversalDAO> => {
  const logger = createModuleLogger(SQLiteModules.DATABASE_FACTORY);
  logger.debug("Creating database from schema", {
    schemaName: schema.database_name,
  });
  return await DatabaseFactory.createFromConfig(schema, options);
};

/**
 * Open existing database
 */
export const openExistingDatabase = async (
  dbName: string,
  options?: Omit<DbFactoryOptions, "config" | "configAsset">
): Promise<UniversalDAO> => {
  const logger = createModuleLogger(SQLiteModules.DATABASE_FACTORY);
  logger.debug("Opening existing database", { dbName });
  return await DatabaseFactory.openExisting(dbName, options);
};

/**
 * Create query builder
 */
export const createQueryBuilder = (dao?: UniversalDAO): QueryBuilder => {
  const logger = createModuleLogger(SQLiteModules.QUERY_BUILDER);
  logger.trace("Creating query builder");
  return new QueryBuilder(dao);
};

/**
 * Create base service
 */
export const createBaseService = <T = any>(
  schemaName: string,
  tableName?: string
): BaseService<T> => {
  const logger = createModuleLogger(SQLiteModules.BASE_SERVICE);
  logger.debug("Creating base service", { schemaName, tableName });
  return new (class extends BaseService<T> {
    constructor() {
      super(schemaName, tableName);
    }
  })();
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
  loggerConfig?: any; // logger configuration
  enableDebugLogging?: boolean;
}): Promise<UniversalSQLite> => {
  const logger = createModuleLogger(SQLiteModules.UNIVERSAL_SQLITE);
  logger.info("Setting up UniversalSQLite", {
    schemaCount: Object.keys(config.schemas).length,
    autoConnect: config.autoConnect,
    enableDebugLogging: config.enableDebugLogging,
  });

  const sqlite = UniversalSQLite.getInstance();

  // Configure debug logging if requested
  if (config.enableDebugLogging) {
    UniversalSQLite.enableDebugLogging();
  }

  await sqlite.initialize(config.schemas, {
    registerAdapters: config.adapters,
    defaultRoles: config.defaultRoles,
    loggerConfig: config.loggerConfig,
  });

  if (config.autoConnect) {
    await sqlite.connect(config.autoConnect);
  }

  logger.info("UniversalSQLite setup completed");
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
    loggerConfig?: any;
    enableDebugLogging?: boolean;
  }
): Promise<{ sqlite: UniversalSQLite; dao: UniversalDAO }> => {
  const logger = createModuleLogger(SQLiteModules.UNIVERSAL_SQLITE);
  logger.info("Creating single database", {
    schemaName: schema.database_name,
    enableDebugLogging: options?.enableDebugLogging,
  });

  const sqlite = UniversalSQLite.getInstance();

  // Configure debug logging if requested
  if (options?.enableDebugLogging) {
    UniversalSQLite.enableDebugLogging();
  }

  await sqlite.initializeFromSchema(schema, {
    registerAdapters: options?.adapter ? [options.adapter] : undefined,
    autoConnect: options?.autoConnect,
    loggerConfig: options?.loggerConfig,
  });

  const dao =
    options?.autoConnect !== false
      ? await sqlite.connect(schema.database_name)
      : sqlite.getDAO(schema.database_name);

  logger.info("Single database creation completed");
  return { sqlite, dao };
};

// ========================== DEFAULT EXPORT ==========================

/**
 * Default export is the singleton instance
 */
const defaultInstance = UniversalSQLite.getInstance();
export default defaultInstance;
