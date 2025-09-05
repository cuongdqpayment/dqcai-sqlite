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

    // Register reconnect listener for database reconnection
    this.reconnectHandler = (newDao: UniversalDAO) => {
      this.dao = newDao;
      this._emit("daoReconnected", { schemaName: this.schemaName });
    };

    DatabaseManager.onDatabaseReconnect(schemaName, this.reconnectHandler);
    this.bindMethods();
  }

  private bindMethods(): void {
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
    this.primaryKeyFields = fields;
    return this;
  }

  /**
   * Initialize the service and establish database connection
   */
  async init(): Promise<this> {
    try {
      if (this.isInitialized) {
        return this;
      }

      this.dao = await DatabaseManager.getLazyLoading(this.schemaName);

      if (!this.dao) {
        throw new Error(
          `Failed to initialize DAO for schema: ${this.schemaName}`
        );
      }

      if (!this.dao.isConnectionOpen()) {
        await this.dao.connect();
      }

      this.isOpened = true;
      this.isInitialized = true;
      this._emit("initialized", { schemaName: this.schemaName });

      return this;
    } catch (error) {
      this._handleError("INIT_ERROR", error as Error);
      throw error;
    }
  }

  /**
   * Create a new record - Safe version với comprehensive error handling
   */
  async create(data: Partial<T>): Promise<T | null> {
    await this._ensureInitialized();
    await this.ensureValidConnection();
    try {
      this._validateData(data);
      const queryTable = this.buildDataTable(data as Record<string, any>);
      const result = await this.dao!.insert(queryTable);
      if (result.rowsAffected === 0) {
        throw new Error("Insert operation failed - no rows affected");
      }
      let createdRecord: T | null = null;
      const primaryKeyValue = data[this.primaryKeyFields[0] as keyof T];
      try {
        if (primaryKeyValue !== undefined && primaryKeyValue !== null) {
          createdRecord = await this.findById(primaryKeyValue as any);
        } else if (result.lastInsertRowId) {
          createdRecord = await this.findById(result.lastInsertRowId);
        }
      } catch (findError) {
        console.warn(`Warning: Could not retrieve created record:`, findError);
      }
      if (!createdRecord) {
        createdRecord = data as T;
      }
      this._emit("dataCreated", { operation: "create", data: createdRecord });
      return createdRecord;
    } catch (error) {
      this._handleError("CREATE_ERROR", error as Error);
      throw error;
    }
  }

  /**
   * Update an existing record
   */
  async update(id: any, data: Partial<T>): Promise<T | null> {
    await this._ensureInitialized();

    try {
      if (!id) {
        throw new Error("ID is required for update");
      }

      this._validateData(data);
      const updateData = {
        ...data,
        [this.primaryKeyFields[0]]: id,
      };

      const queryTable = this.buildDataTable(updateData as Record<string, any>);
      await this.dao!.update(queryTable);

      const result = await this.findById(id);
      this._emit("dataUpdated", { operation: "update", id, data: result });
      return result;
    } catch (error) {
      this._handleError("UPDATE_ERROR", error as Error);
      throw error;
    }
  }

  /**
   * Delete a record by ID
   */
  async delete(id: any): Promise<boolean> {
    await this._ensureInitialized();

    try {
      if (!id) {
        throw new Error("ID is required for delete");
      }

      const queryTable: QueryTable = {
        name: this.tableName,
        cols: [],
        wheres: [{ name: this.primaryKeyFields[0], value: id }],
      };

      const result = await this.dao!.delete(queryTable);
      const success = result.rowsAffected > 0;

      if (success) {
        this._emit("dataDeleted", { operation: "delete", id });
      }

      return success;
    } catch (error) {
      this._handleError("DELETE_ERROR", error as Error);
      throw error;
    }
  }

  /**
   * Find a record by ID
   */
  async findById(id: any): Promise<T | null> {
    await this._ensureInitialized();

    try {
      if (!id) {
        throw new Error("ID is required");
      }

      const conditions = { [this.primaryKeyFields[0]]: id };
      const queryTable = this.buildSelectTable(conditions);
      const result = await this.dao!.select(queryTable);

      const record = Object.keys(result).length > 0 ? (result as T) : null;
      this._emit("dataFetched", { operation: "findById", id });
      return record;
    } catch (error) {
      this._handleError("FIND_BY_ID_ERROR", error as Error);
      throw error;
    }
  }

  /**
   * Find the first record matching conditions
   */
  async findFirst(conditions: Record<string, any> = {}): Promise<T | null> {
    await this._ensureInitialized();

    try {
      const queryTable = this.buildSelectTable(conditions);
      const result = await this.dao!.select(queryTable);

      const record = Object.keys(result).length > 0 ? (result as T) : null;
      this._emit("dataFetched", { operation: "findFirst" });
      return record;
    } catch (error) {
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
    await this._ensureInitialized();

    try {
      // Build where clauses from conditions
      const whereFromConditions = this.buildWhereFromObject(conditions);
      const allWheres = [...whereFromConditions, ...(options.where || [])];

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
      this._emit("dataFetched", {
        operation: "findAll",
        count: results.length,
      });
      return results as T[];
    } catch (error) {
      this._handleError("FIND_ALL_ERROR", error as Error);
      throw error;
    }
  }

  /**
   * Count records matching conditions
   */
  async count(where?: WhereClause[] | Record<string, any>): Promise<number> {
    await this._ensureInitialized();

    try {
      let whereConditions: WhereClause[] = [];

      if (Array.isArray(where)) {
        whereConditions = where;
      } else if (where && typeof where === "object") {
        whereConditions = this.buildWhereFromObject(where);
      }

      const queryTable: QueryTable = {
        name: this.tableName,
        cols: [{ name: "COUNT(*) as count" }],
        wheres: whereConditions,
      };

      const result = await this.dao!.select(queryTable);
      return result.count || 0;
    } catch (error) {
      this._handleError("COUNT_ERROR", error as Error);
      throw error;
    }
  }

  /**
   * Check if a record exists by ID
   */
  async exists(id: any): Promise<boolean> {
    const item = await this.findById(id);
    return item !== null;
  }

  /**
   * Truncate table (delete all records and reset auto-increment)
   */
  async truncate(): Promise<void> {
    await this._ensureInitialized();

    try {
      await this.dao!.execute(`DELETE FROM ${this.tableName}`);
      await this.dao!.execute(
        `DELETE FROM sqlite_sequence WHERE name='${this.tableName}'`
      );
      this._emit("tableTruncated", { tableName: this.tableName });
    } catch (error) {
      this._handleError("TRUNCATE_ERROR", error as Error);
      throw error;
    }
  }

  /**
   * Bulk insert records
   */
  async bulkInsert(items: Partial<T>[]): Promise<ImportResult> {
    await this._ensureInitialized();

    try {
      if (!Array.isArray(items) || items.length === 0) {
        throw new Error("Items must be a non-empty array");
      }

      const result = await this.dao!.importData({
        tableName: this.tableName,
        data: items as Record<string, any>[],
        batchSize: 1000,
        skipErrors: false,
        validateData: true,
      });

      this._emit("dataBulkCreated", {
        operation: "bulkInsert",
        count: result.successRows,
      });
      return result;
    } catch (error) {
      this._handleError("BULK_INSERT_ERROR", error as Error);
      throw error;
    }
  }

  /**
   * Bulk create records with transaction support
   */
  async bulkCreate(dataArray: Record<string, any>[]): Promise<T[]> {
    await this._ensureInitialized();

    try {
      if (!Array.isArray(dataArray) || dataArray.length === 0) {
        throw new Error("Data must be a non-empty array");
      }

      const results: T[] = [];
      await this.executeTransaction(async () => {
        for (const data of dataArray) {
          this._validateData(data);
          const queryTable = this.buildDataTable(data);
          await this.dao!.insert(queryTable);
          results.push(data as T);
        }
      });

      this._emit("dataBulkCreated", {
        operation: "bulkCreate",
        count: results.length,
      });
      return results;
    } catch (error) {
      this._handleError("BULK_CREATE_ERROR", error as Error);
      throw error;
    }
  }

  /**
   * Execute operations within a transaction
   */
  async executeTransaction(callback: () => Promise<any>): Promise<any> {
    await this._ensureInitialized();

    try {
      await this.dao!.beginTransaction();
      const result = await callback();
      await this.dao!.commitTransaction();
      this._emit("transactionCompleted", { operation: "transaction" });
      return result;
    } catch (error) {
      try {
        await this.dao!.rollbackTransaction();
      } catch (rollbackError) {
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
    await this._ensureInitialized();

    try {
      const result = await this.dao!.importFromCSV(
        this.tableName,
        csvData,
        options
      );
      this._emit("dataImported", { operation: "importFromCSV", result });
      return result;
    } catch (error) {
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
    await this._ensureInitialized();

    try {
      const result = await this.dao!.importDataWithMapping(
        this.tableName,
        data,
        columnMappings,
        options
      );
      this._emit("dataImported", { operation: "importWithMapping", result });
      return result;
    } catch (error) {
      this._handleError("IMPORT_MAPPING_ERROR", error as Error);
      throw error;
    }
  }

  // Utility methods
  protected buildSelectTable(
    conditions: Record<string, any> = {},
    options: FindOptions = {}
  ): QueryTable {
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
    return this.dao!.convertJsonToQueryTable(
      this.tableName,
      data,
      this.primaryKeyFields
    );
  }

  protected buildWhereFromObject(obj: Record<string, any>): WhereClause[] {
    return Object.entries(obj)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => ({ name: key, value }));
  }

  // Event system
  on(event: string, handler: EventHandler): this {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(handler);
    return this;
  }

  off(event: string, handler: EventHandler): this {
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
    const handlers = this.eventListeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          // Handle error in event handler
        }
      });
    }
  }

  // Error handling
  setErrorHandler(errorType: string, handler: ErrorHandler): this {
    this.errorHandlers.set(errorType, handler);
    return this;
  }

  protected _handleError(errorType: string, error: Error): void {
    const handler = this.errorHandlers.get(errorType);
    if (handler) {
      try {
        handler(error);
      } catch (handlerError) {
        // Handle error in error handler
      }
    }
    this._emit("error", { errorType, error });
  }

  protected _validateData(data: any): void {
    if (!data || typeof data !== "object") {
      throw new Error("Data must be a valid object");
    }
  }

  protected async _ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.init();
    }
  }

  private async ensureValidConnection(): Promise<void> {
    try {
      const isConnected = this.dao?.isConnectionOpen();
      if (!isConnected) {
        this.dao = await DatabaseManager.ensureDatabaseConnection(
          this.schemaName
        );
      }
    } catch (error) {
      this.dao = await DatabaseManager.ensureDatabaseConnection(
        this.schemaName
      );
    }
  }

  // Information and status methods
  async getDatabaseInfo(): Promise<any> {
    await this._ensureInitialized();
    return await this.dao!.getDatabaseInfo();
  }

  async getTableInfo(): Promise<any[]> {
    await this._ensureInitialized();
    return await this.dao!.getTableInfo(this.tableName);
  }

  getStatus(): ServiceStatus {
    return {
      schemaName: this.schemaName,
      tableName:this.tableName,
      isOpened: this.isOpened,
      isInitialized: this.isInitialized,
      hasDao: !!this.dao,
    };
  }

  async healthCheck(): Promise<HealthCheckResult> {
    try {
      await this._ensureInitialized();
      const count = await this.count();
      return {
        healthy: true,
        schemaName: this.schemaName,
        recordCount: count,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        healthy: false,
        schemaName: this.schemaName,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Lifecycle management
  async close(): Promise<boolean> {
    try {
      if (this.dao) {
        await this.dao.close();
      }

      this.isOpened = false;
      this.isInitialized = false;
      this.eventListeners.clear();
      this.errorHandlers.clear();
      this.cache.clear();

      this._emit("closed", { schemaName: this.schemaName });
      return true;
    } catch (error) {
      this._handleError("CLOSE_ERROR", error as Error);
      throw error;
    }
  }

  public destroy(): void {
    // Remove reconnect listener
    DatabaseManager.offDatabaseReconnect(
      this.schemaName,
      this.reconnectHandler
    );

    // Clear all resources
    this.eventListeners.clear();
    this.errorHandlers.clear();
    this.cache.clear();
  }

  // Alias methods for backward compatibility
  async getAll(
    conditions: Record<string, any> = {},
    options: FindOptions = {}
  ): Promise<T[]> {
    return this.findAll(conditions, options);
  }

  async getById(id: string | number): Promise<T | null> {
    return this.findById(id);
  }

  async getFirst(conditions: Record<string, any> = {}): Promise<T | null> {
    return this.findFirst(conditions);
  }
}
