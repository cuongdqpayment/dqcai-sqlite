// src/core/database-factory.ts
import { SQLiteAdapter, DatabaseSchema, DbFactoryOptions } from "../types";
import { UniversalDAO } from "./universal-dao";

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
    this.adapters.push(adapter);
  }

  /**
   * Get information about the current runtime environment
   * @returns A string describing the current environment
   */
  static getEnvironmentInfo(): string {
    if (
      typeof navigator !== "undefined" &&
      navigator.product === "ReactNative"
    ) {
      return "React Native";
    }
    if (typeof globalThis.Bun !== "undefined") return "Bun";
    if (typeof globalThis.Deno !== "undefined") return "Deno";
    if (typeof window !== "undefined") return "Browser";
    if (typeof process !== "undefined") return "Node.js";
    return "Unknown";
  }

  /**
   * Detect the best available SQLite adapter for the current environment
   * @returns The best available SQLite adapter
   * @throws Error if no supported adapter is found
   */
  private static detectBestAdapter(): SQLiteAdapter {
    for (const adapter of this.adapters) {
      if (adapter.isSupported()) {
        return adapter;
      }
    }
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
    try {
      const dbInfo = await dao.getDatabaseInfo();
      if (dbInfo.version !== schema.version) {
        throw new Error(
          `Schema version mismatch: database (${dbInfo.version}) vs config (${schema.version})`
        );
      }
    } catch (error) {
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
    if (!schema) {
      throw new Error("Schema configuration is null or undefined.");
    }
    if (
      typeof schema.database_name !== "string" ||
      schema.database_name.trim() === ""
    ) {
      throw new Error(
        "Invalid or missing 'database_name' in schema. This is required to name the database file."
      );
    }
    if (
      typeof schema.schemas !== "object" ||
      schema.schemas === null ||
      Object.keys(schema.schemas).length === 0
    ) {
      throw new Error(
        "Invalid or missing 'schemas' object in schema. At least one table definition is required."
      );
    }
    return true;
  }

  /**
   * Create a new UniversalDAO instance (equivalent to SQLiteDAO)
   * @param dbPath Path to the database file
   * @param options Configuration options
   * @returns A new UniversalDAO instance
   */
  static createDAO(
    dbPath: string,
    options?: {
      adapter?: SQLiteAdapter;
      createIfNotExists?: boolean;
      forceRecreate?: boolean;
    }
  ): UniversalDAO {
    let adapter: SQLiteAdapter;

    if (options?.adapter) {
      adapter = options.adapter;
    } else {
      adapter = this.detectBestAdapter();
    }

    return new UniversalDAO(adapter, dbPath, {
      createIfNotExists: options?.createIfNotExists ?? false,
      forceRecreate: options?.forceRecreate ?? false,
    });
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
    // Determine the database file path
    const dbFileName = dbName.endsWith(".db") ? dbName : `${dbName}.db`;

    // Create and connect DAO instance
    const dao = this.createDAO(dbFileName, options);

    try {
      await dao.connect();
      // Run integrity check to detect corrupted files
      await dao.execute("PRAGMA integrity_check");
      return dao;
    } catch (error) {
      await dao.close();
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
    let schema: DatabaseSchema;

    // Step 1: Load schema
    if (options.config) {
      schema = options.config;
    } else if (options.configAsset) {
      schema = options.configAsset;
    } else {
      throw new Error(
        "Either 'config', 'configAsset', or 'configPath' must be provided to the factory."
      );
    }

    // Step 2: Validate schema
    this.validateSchema(schema);

    // Step 3: Determine database path
    const dbFileName = schema.database_name.endsWith(".db")
      ? schema.database_name
      : `${schema.database_name}.db`;

    // Step 4: Create DAO instance
    const dao = this.createDAO(dbFileName, {
      adapter: options.adapter,
      createIfNotExists: isForceInit,
      forceRecreate: isForceDelete,
    });

    try {
      // Step 5: Connect to database
      await dao.connect();

      // Step 6: Initialize schema if needed
      await dao.initializeFromSchema(schema);

      // Step 7: Validate schema version compatibility
      // Validate schema version compatibility
      try {
        await this.validateSchemaVersion(dao, schema);
      } catch (schemaError: any) {
        await dao.close();
        throw new Error(
          `Schema mismatch in existing database. Use forceRecreate=true to recreate with updated schema. Error: ${schemaError.message}`
        );
      }
      return dao;
    } catch (error) {
      if (dao.isConnectionOpen()) {
        await dao.close();
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
    try {
      return await this.create({
        ...options,
        configAsset,
      });
    } catch (error) {
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
    try {
      return await this.create({
        ...options,
        config,
      });
    } catch (error) {
      throw new Error(
        `Error creating database from config: ${(error as Error).message}`
      );
    }
  }
}

export default DatabaseFactory;
