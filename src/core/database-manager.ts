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
