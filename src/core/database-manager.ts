// src/core/database-manager.ts

import { DatabaseSchema, ImportOptions, ImportResult, ColumnMapping } from "../types";
import { DatabaseFactory } from "./database-factory";
import { UniversalDAO } from "./universal-dao";

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
  private static eventListeners: Map<string, Array<(dao: UniversalDAO) => void>> = new Map();

  /**
   * Set a schema manager for dynamic schema handling
   */
  public static setSchemaManager(manager: SchemaManager): void {
    this.schemaManager = manager;
  }

  /**
   * Register a schema configuration dynamically
   */
  public static registerSchema(key: string, schema: DatabaseSchema): void {
    this.schemaConfigurations[key] = schema;
  }

  /**
   * Register multiple schemas at once
   */
  public static registerSchemas(schemas: Record<string, DatabaseSchema>): void {
    Object.entries(schemas).forEach(([key, schema]) => {
      this.registerSchema(key, schema);
    });
  }

  /**
   * Get schema from internal store or external manager
   */
  private static getSchema(key: string): DatabaseSchema | undefined {
    // Try internal schemas first
    if (this.schemaConfigurations[key]) {
      return this.schemaConfigurations[key];
    }
    
    // Try external schema manager
    if (this.schemaManager) {
      return this.schemaManager.getSchema(key);
    }
    
    return undefined;
  }

  /**
   * Get all available schema keys
   */
  public static getAvailableSchemas(): string[] {
    const internalKeys = Object.keys(this.schemaConfigurations);
    const externalKeys = this.schemaManager?.getAllSchemaKeys() || [];
    return [...new Set([...internalKeys, ...externalKeys])];
  }

  /**
   * Register a role configuration
   */
  public static registerRole(roleConfig: RoleConfig): void {
    this.roleRegistry[roleConfig.roleName] = roleConfig;
  }

  /**
   * Register multiple roles
   */
  public static registerRoles(roleConfigs: RoleConfig[]): void {
    roleConfigs.forEach(config => this.registerRole(config));
  }

  /**
   * Get all registered roles
   */
  public static getRegisteredRoles(): RoleRegistry {
    return { ...this.roleRegistry };
  }

  /**
   * Get databases for a specific role
   */
  public static getRoleDatabases(roleName: string): string[] {
    const roleConfig = this.roleRegistry[roleName];
    if (!roleConfig) {
      throw new Error(`Role '${roleName}' is not registered.`);
    }
    return [
      ...roleConfig.requiredDatabases,
      ...(roleConfig.optionalDatabases || []),
    ];
  }

  /**
   * Get databases for current user roles
   */
  public static getCurrentUserDatabases(): string[] {
    const allDatabases = new Set<string>();
    allDatabases.add('core'); // Core database is always included
    
    for (const roleName of this.currentUserRoles) {
      const roleConfig = this.roleRegistry[roleName];
      if (roleConfig) {
        roleConfig.requiredDatabases.forEach(db => allDatabases.add(db));
        if (roleConfig.optionalDatabases) {
          roleConfig.optionalDatabases.forEach(db => allDatabases.add(db));
        }
      }
    }
    
    return Array.from(allDatabases);
  }

  /**
   * Initialize core database connection
   */
  public static async initializeCoreConnection(): Promise<void> {
    if (this.connections['core']) {
      return;
    }

    try {
      const coreSchema = this.getSchema('core');
      if (!coreSchema) {
        throw new Error('Core database schema not found.');
      }

      const dao = await DatabaseFactory.createOrOpen({ config: coreSchema }, false);
      await dao.execute('PRAGMA integrity_check');
      this.connections['core'] = dao;
    } catch (error) {
      throw new Error(`Error initializing core database: ${(error as Error).message}`);
    }
  }

  /**
   * Set current user roles and initialize connections
   */
  public static async setCurrentUserRoles(
    userRoles: string[],
    primaryRole?: string,
  ): Promise<void> {
    // Validate roles exist
    for (const roleName of userRoles) {
      if (!this.roleRegistry[roleName]) {
        throw new Error(`Role '${roleName}' is not registered. Please register it first.`);
      }
    }

    const previousRoles = [...this.currentUserRoles];
    this.currentUserRoles = userRoles;
    this.currentRole = primaryRole || userRoles[0] || null;

    await this.initializeUserRoleConnections();
    await this.cleanupUnusedConnections(previousRoles);
  }

  /**
   * Get current user roles
   */
  public static getCurrentUserRoles(): string[] {
    return [...this.currentUserRoles];
  }

  /**
   * Get current primary role
   */
  public static getCurrentRole(): string | null {
    return this.currentRole;
  }

  /**
   * Initialize connections for current user roles
   */
  private static async initializeUserRoleConnections(): Promise<void> {
    const requiredDatabases = this.getCurrentUserDatabases();
    const failedInitializations: { key: string; error: Error }[] = [];

    const initPromises = requiredDatabases.map(async dbKey => {
      if (this.connections[dbKey]) {
        return; // Already connected
      }

      try {
        const schema = this.getSchema(dbKey);
        if (!schema) {
          throw new Error(`Database key '${dbKey}' not found in schema configurations.`);
        }

        const dao = await DatabaseFactory.createOrOpen({ config: schema }, false);
        await dao.execute('PRAGMA integrity_check');
        this.connections[dbKey] = dao;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        
        // Check if database is required for any role
        const isRequired = this.currentUserRoles.some(roleName => {
          const roleConfig = this.roleRegistry[roleName];
          return roleConfig && roleConfig.requiredDatabases.includes(dbKey);
        });

        if (isRequired) {
          failedInitializations.push({ key: dbKey, error: err });
        }
        // Optional databases that fail are ignored
      }
    });

    await Promise.all(initPromises);

    if (failedInitializations.length > 0) {
      const errorSummary = failedInitializations
        .map(f => `  - ${f.key}: ${f.error.message}`)
        .join('\n');
      throw new Error(`Failed to initialize required databases for user roles:\n${errorSummary}`);
    }
  }

  /**
   * Cleanup unused connections
   */
  private static async cleanupUnusedConnections(previousRoles: string[]): Promise<void> {
    const previousDatabases = new Set<string>();
    previousDatabases.add('core');

    for (const roleName of previousRoles) {
      const roleConfig = this.roleRegistry[roleName];
      if (roleConfig) {
        roleConfig.requiredDatabases.forEach(db => previousDatabases.add(db));
        if (roleConfig.optionalDatabases) {
          roleConfig.optionalDatabases.forEach(db => previousDatabases.add(db));
        }
      }
    }

    const currentDatabases = new Set(this.getCurrentUserDatabases());
    const databasesToClose = Array.from(previousDatabases).filter(
      db => !currentDatabases.has(db),
    );

    if (databasesToClose.length > 0) {
      for (const dbKey of databasesToClose) {
        if (this.connections[dbKey]) {
          try {
            await this.connections[dbKey].close();
            delete this.connections[dbKey];
          } catch (error) {
            // Log error but continue cleanup
          }
        }
      }
    }
  }

  /**
   * Check if current user has access to database
   */
  public static hasAccessToDatabase(dbKey: string): boolean {
    // For universal version, we can implement more flexible access control
    // Currently allowing access to all registered schemas
    return this.getSchema(dbKey) !== undefined;
  }

  /**
   * Get database connection
   */
  public static get(key: string): UniversalDAO {
    if (!this.hasAccessToDatabase(key)) {
      throw new Error(`Access denied: Database '${key}' is not accessible.`);
    }

    const dao = this.connections[key];
    if (!dao) {
      throw new Error(`Database '${key}' is not connected. Please ensure it's initialized.`);
    }

    return dao;
  }

  /**
   * Register event listener for database reconnection
   */
  public static onDatabaseReconnect(
    schemaName: string,
    callback: (dao: UniversalDAO) => void,
  ): void {
    if (!this.eventListeners.has(schemaName)) {
      this.eventListeners.set(schemaName, []);
    }
    this.eventListeners.get(schemaName)!.push(callback);
  }

  /**
   * Remove event listener for database reconnection
   */
  public static offDatabaseReconnect(
    schemaName: string,
    callback: (dao: UniversalDAO) => void,
  ): void {
    const listeners = this.eventListeners.get(schemaName);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Notify listeners of database reconnection
   */
  private static notifyDatabaseReconnect(schemaName: string, dao: UniversalDAO): void {
    const listeners = this.eventListeners.get(schemaName);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(dao);
        } catch (error) {
          // Handle callback errors gracefully
        }
      });
    }
  }

  /**
   * Close all connections
   */
  private static async closeAllConnections(): Promise<void> {
    if (this.isClosingConnections) {
      return;
    }

    this.isClosingConnections = true;
    try {
      // Save active databases
      const currentActiveDb = Object.keys(this.connections);
      currentActiveDb.forEach(dbKey => this.activeDatabases.add(dbKey));

      const closePromises = Object.entries(this.connections).map(
        async ([dbKey, dao]) => {
          try {
            await dao.close();
          } catch (error) {
            // Log error but continue closing
          }
        },
      );

      await Promise.all(closePromises);
      this.connections = {};
    } finally {
      this.isClosingConnections = false;
    }
  }

  /**
   * Reopen connections
   */
  public static async reopenConnections(): Promise<void> {
    await this.initializeCoreConnection();
    
    if (this.currentUserRoles.length > 0) {
      await this.initializeUserRoleConnections();
    }

    // Reinitialize previously active databases
    const activeDbArray = Array.from(this.activeDatabases);
    if (activeDbArray.length > 0) {
      for (const dbKey of activeDbArray) {
        if (!this.connections[dbKey]) {
          const schema = this.getSchema(dbKey);
          if (schema) {
            try {
              const dao = await DatabaseFactory.createOrOpen({ config: schema }, false);
              await dao.connect();
              this.connections[dbKey] = dao;
              this.notifyDatabaseReconnect(dbKey, dao);
            } catch (error) {
              // Log error but continue
            }
          }
        } else if (this.connections[dbKey]) {
          // Database exists, notify services
          this.notifyDatabaseReconnect(dbKey, this.connections[dbKey]);
        }
      }
    }
  }

  /**
   * Ensure database connection exists and is active
   */
  public static async ensureDatabaseConnection(key: string): Promise<UniversalDAO> {
    this.activeDatabases.add(key);

    if (!this.hasAccessToDatabase(key)) {
      throw new Error(`Access denied: Database '${key}' is not accessible.`);
    }

    if (this.connections[key]) {
      try {
        const isConnected = this.connections[key].isConnectionOpen();
        if (isConnected) {
          return this.connections[key];
        } else {
          // Clean up inactive connection
          try {
            await this.connections[key].close().catch(() => {});
          } catch (error) {
            // Ignore cleanup errors
          }
          delete this.connections[key];
        }
      } catch (error) {
        delete this.connections[key];
      }
    }

    // Create new connection
    return await this.getLazyLoading(key);
  }

  /**
   * Get all connections
   */
  public static getConnections(): DatabaseConnections {
    return { ...this.connections };
  }

  /**
   * Open all existing databases
   */
  public static async openAllExisting(databaseKeys: string[]): Promise<boolean> {
    const failedOpens: { key: string; error: Error }[] = [];

    for (const key of databaseKeys) {
      try {
        const schema = this.getSchema(key);
        if (!schema) {
          throw new Error(`Invalid database key: ${key}. Schema not found.`);
        }

        const dao = await DatabaseFactory.createOrOpen({ config: schema }, false);
        await dao.execute('PRAGMA integrity_check');
        this.connections[key] = dao;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        failedOpens.push({ key, error: err });
      }
    }

    if (failedOpens.length > 0) {
      const errorSummary = failedOpens
        .map(f => `  - ${f.key}: ${f.error.message}`)
        .join('\n');
      throw new Error(`Failed to open one or more databases:\n${errorSummary}`);
    }

    this.isInitialized = true;
    return true;
  }

  /**
   * Initialize databases lazily
   */
  public static async initLazySchema(databaseKeys: string[]): Promise<boolean> {
    const invalidKeys = databaseKeys.filter(key => !this.getSchema(key));
    if (invalidKeys.length > 0) {
      throw new Error(`Invalid database keys: ${invalidKeys.join(', ')}. Schemas not found.`);
    }

    const newConnectionsCount = databaseKeys.filter(key => !this.connections[key]).length;
    const currentConnectionsCount = Object.keys(this.connections).length;
    
    if (currentConnectionsCount + newConnectionsCount > this.maxConnections) {
      throw new Error(
        `Cannot initialize ${newConnectionsCount} new connections. Would exceed maximum of ${this.maxConnections} connections. Current: ${currentConnectionsCount}`,
      );
    }

    const failedInitializations: { key: string; error: Error }[] = [];
    const initPromises = databaseKeys.map(async key => {
      if (this.connections[key]) {
        return; // Already initialized
      }

      try {
        const schema = this.getSchema(key)!;
        const dao = await DatabaseFactory.createOrOpen({ config: schema }, false);
        await dao.execute('PRAGMA integrity_check');
        this.connections[key] = dao;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        failedInitializations.push({ key, error: err });
      }
    });

    await Promise.all(initPromises);

    if (failedInitializations.length > 0) {
      const errorSummary = failedInitializations
        .map(f => `  - ${f.key}: ${f.error.message}`)
        .join('\n');
      throw new Error(`Failed to initialize one or more databases:\n${errorSummary}`);
    }

    if (Object.keys(this.connections).length > 0) {
      this.isInitialized = true;
    }

    return true;
  }

  /**
   * Initialize all available databases
   */
  public static async initializeAll(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    const availableSchemas = this.getAvailableSchemas();
    const failedInitializations: { key: string; error: Error }[] = [];

    const initPromises = availableSchemas.map(async key => {
      try {
        const schema = this.getSchema(key)!;
        const dao = await DatabaseFactory.createOrOpen({ config: schema }, false);
        this.connections[key] = dao;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        failedInitializations.push({ key, error: err });
      }
    });

    await Promise.all(initPromises);

    if (failedInitializations.length > 0) {
      this.isInitialized = false;
      const errorSummary = failedInitializations
        .map(f => `  - ${f.key}: ${f.error.message}`)
        .join('\n');
      throw new Error(`Failed to initialize one or more databases:\n${errorSummary}`);
    }

    this.isInitialized = true;
  }

  /**
   * Get database with lazy loading
   */
  public static async getLazyLoading(key: string): Promise<UniversalDAO> {
    this.activeDatabases.add(key);

    if (!this.hasAccessToDatabase(key)) {
      throw new Error(`Access denied: Database '${key}' is not accessible.`);
    }

    if (!this.connections[key]) {
      const schema = this.getSchema(key);
      if (!schema) {
        throw new Error(`Invalid database key: ${key}. Schema not found.`);
      }

      if (Object.keys(this.connections).length >= this.maxConnections) {
        throw new Error('Maximum number of database connections reached');
      }

      const dao = await DatabaseFactory.createOrOpen({ config: schema }, false);
      await dao.connect();
      this.connections[key] = dao;
    }

    this.isInitialized = true;
    return this.connections[key];
  }

  /**
   * Execute cross-schema transaction
   */
  public static async executeCrossSchemaTransaction(
    schemas: string[],
    callback: (daos: Record<string, UniversalDAO>) => Promise<void>,
  ): Promise<void> {
    for (const key of schemas) {
      if (!this.hasAccessToDatabase(key)) {
        throw new Error(`Access denied: Database '${key}' is not accessible.`);
      }
    }

    const daos = schemas.reduce((acc, key) => {
      acc[key] = this.get(key);
      return acc;
    }, {} as Record<string, UniversalDAO>);

    try {
      await Promise.all(Object.values(daos).map(dao => dao.beginTransaction()));
      await callback(daos);
      await Promise.all(Object.values(daos).map(dao => dao.commitTransaction()));
    } catch (error) {
      await Promise.all(Object.values(daos).map(dao => dao.rollbackTransaction()));
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
    options: Partial<ImportOptions> = {},
  ): Promise<ImportResult> {
    if (!this.hasAccessToDatabase(databaseKey)) {
      throw new Error(`Access denied: Database '${databaseKey}' is not accessible.`);
    }

    const dao = this.get(databaseKey);
    try {
      const result = await dao.importData({
        tableName,
        data,
        ...options,
      });
      return result;
    } catch (error) {
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
    options: Partial<ImportOptions> = {},
  ): Promise<ImportResult> {
    if (!this.hasAccessToDatabase(databaseKey)) {
      throw new Error(`Access denied: Database '${databaseKey}' is not accessible.`);
    }

    const dao = this.get(databaseKey);
    try {
      const result = await dao.importDataWithMapping(
        tableName,
        data,
        columnMappings,
        options,
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Bulk import data
   */
  public static async bulkImport(importConfigs: DatabaseImportConfig[]): Promise<BulkImportResult> {
    const startTime = Date.now();
    const result: BulkImportResult = {
      totalDatabases: importConfigs.length,
      successDatabases: 0,
      results: {},
      errors: {},
      executionTime: 0,
    };

    for (const config of importConfigs) {
      const configKey = `${config.databaseKey}.${config.tableName}`;
      try {
        if (!this.hasAccessToDatabase(config.databaseKey)) {
          throw new Error(`Access denied: Database '${config.databaseKey}' is not accessible.`);
        }

        const dao = this.get(config.databaseKey);
        let importResult: ImportResult;

        if (config.columnMappings) {
          importResult = await dao.importDataWithMapping(
            config.tableName,
            config.data,
            config.columnMappings,
            config.options,
          );
        } else {
          importResult = await dao.importData({
            tableName: config.tableName,
            data: config.data,
            ...config.options,
          });
        }

        result.results[configKey] = importResult;
        result.successDatabases++;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        result.errors[configKey] = err;
      }
    }

    result.executionTime = Date.now() - startTime;
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
    } & Partial<ImportOptions> = {},
  ): Promise<ImportResult> {
    if (!this.hasAccessToDatabase(databaseKey)) {
      throw new Error(`Access denied: Database '${databaseKey}' is not accessible.`);
    }

    const dao = this.get(databaseKey);
    try {
      const result = await dao.importFromCSV(tableName, csvData, options);
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get connection count
   */
  public static getConnectionCount(): number {
    return Object.keys(this.connections).length;
  }

  /**
   * List all active connections
   */
  public static listConnections(): string[] {
    return Object.keys(this.connections);
  }

  /**
   * Close specific connection
   */
  public static async closeConnection(dbKey: string): Promise<void> {
    const dao = this.connections[dbKey];
    if (dao) {
      await dao.disconnect();
      delete this.connections[dbKey];
    }
  }

  /**
   * Close all connections and reset state
   */
  public static async closeAll(): Promise<void> {
    await this.closeAllConnections();
    
    this.currentUserRoles = [];
    this.currentRole = null;
    this.isInitialized = false;
    this.activeDatabases.clear();
    this.eventListeners.clear();
    this.isClosingConnections = false;
  }

  /**
   * Logout user - close role-specific connections
   */
  public static async logout(): Promise<void> {
    const connectionsToClose = Object.keys(this.connections).filter(
      key => key !== 'core',
    );

    for (const dbKey of connectionsToClose) {
      try {
        await this.connections[dbKey].close();
        delete this.connections[dbKey];
      } catch (error) {
        // Log error but continue cleanup
      }
    }

    this.currentUserRoles = [];
    this.currentRole = null;
  }
}