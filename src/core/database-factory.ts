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
