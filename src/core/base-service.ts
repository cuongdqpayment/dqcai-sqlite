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
import { createModuleLogger, SQLiteModules } from "../logger";

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
      primaryKeyFields: this.primaryKeyFields
    });

    // Register reconnect listener for database reconnection
    this.reconnectHandler = (newDao: UniversalDAO) => {
      logger.info("Database reconnected for service", {
        schemaName: this.schemaName,
        tableName: this.tableName
      });
      
      this.dao = newDao;
      this._emit("daoReconnected", { schemaName: this.schemaName });
    };

    DatabaseManager.onDatabaseReconnect(schemaName, this.reconnectHandler);
    this.bindMethods();
    
    logger.trace("BaseService instance created successfully", {
      schemaName: this.schemaName,
      tableName: this.tableName
    });
  }

  private bindMethods(): void {
    logger.trace("Binding service methods", {
      schemaName: this.schemaName,
      tableName: this.tableName
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
      newFields: fields
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
      isInitialized: this.isInitialized
    });

    try {
      if (this.isInitialized) {
        logger.debug("Service already initialized, skipping", {
          schemaName: this.schemaName
        });
        return this;
      }

      logger.debug("Getting DAO from DatabaseManager", {
        schemaName: this.schemaName
      });

      this.dao = await DatabaseManager.getLazyLoading(this.schemaName);

      if (!this.dao) {
        const errorMsg = `Failed to initialize DAO for schema: ${this.schemaName}`;
        logger.error(errorMsg, {
          schemaName: this.schemaName
        });
        throw new Error(errorMsg);
      }

      if (!this.dao.isConnectionOpen()) {
        logger.debug("DAO connection not open, connecting", {
          schemaName: this.schemaName
        });
        await this.dao.connect();
      }

      this.isOpened = true;
      this.isInitialized = true;
      
      logger.info("BaseService initialized successfully", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        isOpened: this.isOpened,
        isInitialized: this.isInitialized
      });

      this._emit("initialized", { schemaName: this.schemaName });

      return this;
    } catch (error) {
      logger.error("Error initializing BaseService", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        error: (error as Error).message
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
      dataKeys: data ? Object.keys(data) : []
    });

    await this._ensureInitialized();
    await this.ensureValidConnection();
    
    try {
      this._validateData(data);
      
      logger.trace("Building data table for insert", {
        schemaName: this.schemaName,
        tableName: this.tableName
      });

      const queryTable = this.buildDataTable(data as Record<string, any>);
      const result = await this.dao!.insert(queryTable);
      
      if (result.rowsAffected === 0) {
        const errorMsg = "Insert operation failed - no rows affected";
        logger.error(errorMsg, {
          schemaName: this.schemaName,
          tableName: this.tableName,
          result
        });
        throw new Error(errorMsg);
      }

      logger.debug("Insert operation successful", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        rowsAffected: result.rowsAffected,
        lastInsertRowId: result.lastInsertRowId
      });

      let createdRecord: T | null = null;
      const primaryKeyValue = data[this.primaryKeyFields[0] as keyof T];
      
      try {
        if (primaryKeyValue !== undefined && primaryKeyValue !== null) {
          logger.trace("Retrieving created record by primary key", {
            schemaName: this.schemaName,
            tableName: this.tableName,
            primaryKeyField: this.primaryKeyFields[0],
            primaryKeyValue
          });
          createdRecord = await this.findById(primaryKeyValue as any);
        } else if (result.lastInsertRowId) {
          logger.trace("Retrieving created record by last insert ID", {
            schemaName: this.schemaName,
            tableName: this.tableName,
            lastInsertRowId: result.lastInsertRowId
          });
          createdRecord = await this.findById(result.lastInsertRowId);
        }
      } catch (findError) {
        logger.warn("Could not retrieve created record", {
          schemaName: this.schemaName,
          tableName: this.tableName,
          findError: (findError as Error).message
        });
      }

      if (!createdRecord) {
        logger.debug("Using original data as created record", {
          schemaName: this.schemaName,
          tableName: this.tableName
        });
        createdRecord = data as T;
      }

      logger.info("Record created successfully", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        recordRetrieved: !!createdRecord
      });

      this._emit("dataCreated", { operation: "create", data: createdRecord });
      return createdRecord;
    } catch (error) {
      logger.error("Error creating record", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        error: (error as Error).message
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
      dataKeys: data ? Object.keys(data) : []
    });

    await this._ensureInitialized();

    try {
      if (!id) {
        const errorMsg = "ID is required for update";
        logger.error(errorMsg, {
          schemaName: this.schemaName,
          tableName: this.tableName
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
        id
      });

      const queryTable = this.buildDataTable(updateData as Record<string, any>);
      await this.dao!.update(queryTable);

      logger.debug("Update operation completed", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        id
      });

      const result = await this.findById(id);
      
      logger.info("Record updated successfully", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        id,
        recordFound: !!result
      });

      this._emit("dataUpdated", { operation: "update", id, data: result });
      return result;
    } catch (error) {
      logger.error("Error updating record", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        id,
        error: (error as Error).message
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
      id
    });

    await this._ensureInitialized();

    try {
      if (!id) {
        const errorMsg = "ID is required for delete";
        logger.error(errorMsg, {
          schemaName: this.schemaName,
          tableName: this.tableName
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
        primaryKeyField: this.primaryKeyFields[0]
      });

      const result = await this.dao!.delete(queryTable);
      const success = result.rowsAffected > 0;

      if (success) {
        logger.info("Record deleted successfully", {
          schemaName: this.schemaName,
          tableName: this.tableName,
          id,
          rowsAffected: result.rowsAffected
        });
        this._emit("dataDeleted", { operation: "delete", id });
      } else {
        logger.warn("Delete operation completed but no rows affected", {
          schemaName: this.schemaName,
          tableName: this.tableName,
          id
        });
      }

      return success;
    } catch (error) {
      logger.error("Error deleting record", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        id,
        error: (error as Error).message
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
      id
    });

    await this._ensureInitialized();

    try {
      if (!id) {
        const errorMsg = "ID is required";
        logger.error(errorMsg, {
          schemaName: this.schemaName,
          tableName: this.tableName
        });
        throw new Error(errorMsg);
      }

      const conditions = { [this.primaryKeyFields[0]]: id };
      
      logger.trace("Building select query", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        conditions
      });

      const queryTable = this.buildSelectTable(conditions);
      const result = await this.dao!.select(queryTable);

      const record = Object.keys(result).length > 0 ? (result as T) : null;
      
      logger.debug("Find by ID completed", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        id,
        recordFound: !!record
      });

      this._emit("dataFetched", { operation: "findById", id });
      return record;
    } catch (error) {
      logger.error("Error finding record by ID", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        id,
        error: (error as Error).message
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
      conditions
    });

    await this._ensureInitialized();

    try {
      logger.trace("Building select query for findFirst", {
        schemaName: this.schemaName,
        tableName: this.tableName
      });

      const queryTable = this.buildSelectTable(conditions);
      const result = await this.dao!.select(queryTable);

      const record = Object.keys(result).length > 0 ? (result as T) : null;
      
      logger.debug("Find first completed", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        recordFound: !!record
      });

      this._emit("dataFetched", { operation: "findFirst" });
      return record;
    } catch (error) {
      logger.error("Error finding first record", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        conditions,
        error: (error as Error).message
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
      offset: options.offset
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
        hasColumns: !!(options.columns && options.columns.length > 0)
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
        conditionsCount: Object.keys(conditions).length
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
        error: (error as Error).message
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
      whereType: where ? (Array.isArray(where) ? 'array' : 'object') : 'none'
    });

    await this._ensureInitialized();

    try {
      let whereConditions: WhereClause[] = [];

      if (Array.isArray(where)) {
        whereConditions = where;
        logger.trace("Using array where conditions", {
          schemaName: this.schemaName,
          whereCount: whereConditions.length
        });
      } else if (where && typeof where === "object") {
        whereConditions = this.buildWhereFromObject(where);
        logger.trace("Built where conditions from object", {
          schemaName: this.schemaName,
          whereCount: whereConditions.length
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
        count
      });

      return count;
    } catch (error) {
      logger.error("Error counting records", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        where,
        error: (error as Error).message
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
      id
    });

    const item = await this.findById(id);
    const exists = item !== null;
    
    logger.debug("Existence check completed", {
      schemaName: this.schemaName,
      tableName: this.tableName,
      id,
      exists
    });

    return exists;
  }

  /**
   * Truncate table (delete all records and reset auto-increment)
   */
  async truncate(): Promise<void> {
    logger.warn("Truncating table - this will delete all data", {
      schemaName: this.schemaName,
      tableName: this.tableName
    });

    await this._ensureInitialized();

    try {
      logger.debug("Executing truncate operations", {
        schemaName: this.schemaName,
        tableName: this.tableName
      });

      await this.dao!.execute(`DELETE FROM ${this.tableName}`);
      await this.dao!.execute(
        `DELETE FROM sqlite_sequence WHERE name='${this.tableName}'`
      );
      
      logger.info("Table truncated successfully", {
        schemaName: this.schemaName,
        tableName: this.tableName
      });

      this._emit("tableTruncated", { tableName: this.tableName });
    } catch (error) {
      logger.error("Error truncating table", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        error: (error as Error).message
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
      itemsCount: items.length
    });

    await this._ensureInitialized();

    try {
      if (!Array.isArray(items) || items.length === 0) {
        const errorMsg = "Items must be a non-empty array";
        logger.error(errorMsg, {
          schemaName: this.schemaName,
          tableName: this.tableName,
          itemsType: typeof items,
          itemsLength: Array.isArray(items) ? items.length : 'N/A'
        });
        throw new Error(errorMsg);
      }

      logger.debug("Executing bulk insert operation", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        itemsCount: items.length
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
        errorRows: result.errorRows
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
        error: (error as Error).message
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
      itemsCount: dataArray.length
    });

    await this._ensureInitialized();

    try {
      if (!Array.isArray(dataArray) || dataArray.length === 0) {
        const errorMsg = "Data must be a non-empty array";
        logger.error(errorMsg, {
          schemaName: this.schemaName,
          tableName: this.tableName,
          dataType: typeof dataArray,
          dataLength: Array.isArray(dataArray) ? dataArray.length : 'N/A'
        });
        throw new Error(errorMsg);
      }

      const results: T[] = [];
      
      logger.debug("Executing bulk create in transaction", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        itemsCount: dataArray.length
      });

      await this.executeTransaction(async () => {
        for (let i = 0; i < dataArray.length; i++) {
          const data = dataArray[i];
          
          if (i % 100 === 0) {
            logger.trace("Bulk create progress", {
              schemaName: this.schemaName,
              tableName: this.tableName,
              processed: i,
              total: dataArray.length
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
        recordsCreated: results.length
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
        error: (error as Error).message
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
      tableName: this.tableName
    });

    await this._ensureInitialized();

    try {
      logger.trace("Beginning database transaction", {
        schemaName: this.schemaName
      });

      await this.dao!.beginTransaction();
      const result = await callback();
      
      logger.trace("Committing transaction", {
        schemaName: this.schemaName
      });

      await this.dao!.commitTransaction();
      
      logger.info("Transaction completed successfully", {
        schemaName: this.schemaName,
        tableName: this.tableName
      });

      this._emit("transactionCompleted", { operation: "transaction" });
      return result;
    } catch (error) {
      logger.error("Transaction failed, rolling back", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        error: (error as Error).message
      });

      try {
        await this.dao!.rollbackTransaction();
        logger.debug("Transaction rollback successful", {
          schemaName: this.schemaName
        });
      } catch (rollbackError) {
        logger.error("Error during transaction rollback", {
          schemaName: this.schemaName,
          rollbackError: (rollbackError as Error).message
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
      hasMappings: !!(options.columnMappings && options.columnMappings.length > 0)
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
        errorRows: result.errorRows
      });

      this._emit("dataImported", { operation: "importFromCSV", result });
      return result;
    } catch (error) {
      logger.error("Error during CSV import", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        csvDataLength: csvData.length,
        error: (error as Error).message
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
      mappingsCount: columnMappings.length
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
        errorRows: result.errorRows
      });

      this._emit("dataImported", { operation: "importWithMapping", result });
      return result;
    } catch (error) {
      logger.error("Error during import with mapping", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        dataCount: data.length,
        mappingsCount: columnMappings.length,
        error: (error as Error).message
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
      hasOptions: Object.keys(options).length > 0
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
      dataKeys: Object.keys(data)
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
      filteredWheres: wheres.length
    });

    return wheres;
  }

  // Event system
  on(event: string, handler: EventHandler): this {
    logger.trace("Adding event listener", {
      schemaName: this.schemaName,
      tableName: this.tableName,
      event
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
      event
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
      hasData: !!data
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
            error: (error as Error).message
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
      errorType
    });

    this.errorHandlers.set(errorType, handler);
    return this;
  }

  protected _handleError(errorType: string, error: Error): void {
    logger.error("Handling service error", {
      schemaName: this.schemaName,
      tableName: this.tableName,
      errorType,
      error: error.message
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
          handlerError: (handlerError as Error).message
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
        isNull: data === null
      });
      throw new Error(errorMsg);
    }
  }

  protected async _ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      logger.debug("Service not initialized, initializing now", {
        schemaName: this.schemaName,
        tableName: this.tableName
      });
      await this.init();
    }
  }

  private async ensureValidConnection(): Promise<void> {
    logger.trace("Ensuring valid database connection", {
      schemaName: this.schemaName,
      tableName: this.tableName
    });

    try {
      const isConnected = this.dao?.isConnectionOpen();
      if (!isConnected) {
        logger.debug("Connection not valid, getting new connection", {
          schemaName: this.schemaName
        });
        this.dao = await DatabaseManager.ensureDatabaseConnection(
          this.schemaName
        );
      }
    } catch (error) {
      logger.warn("Error checking connection, getting new connection", {
        schemaName: this.schemaName,
        error: (error as Error).message
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
      tableName: this.tableName
    });

    await this._ensureInitialized();
    return await this.dao!.getDatabaseInfo();
  }

  async getTableInfo(): Promise<any[]> {
    logger.trace("Getting table info", {
      schemaName: this.schemaName,
      tableName: this.tableName
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
      tableName: this.tableName
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
        recordCount: count
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
        error: (error as Error).message
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
      isInitialized: this.isInitialized
    });

    try {
      if (this.dao) {
        await this.dao.close();
        logger.debug("DAO closed successfully", {
          schemaName: this.schemaName
        });
      }

      this.isOpened = false;
      this.isInitialized = false;
      this.eventListeners.clear();
      this.errorHandlers.clear();
      this.cache.clear();

      logger.info("BaseService closed successfully", {
        schemaName: this.schemaName,
        tableName: this.tableName
      });

      this._emit("closed", { schemaName: this.schemaName });
      return true;
    } catch (error) {
      logger.error("Error closing BaseService", {
        schemaName: this.schemaName,
        tableName: this.tableName,
        error: (error as Error).message
      });

      this._handleError("CLOSE_ERROR", error as Error);
      throw error;
    }
  }

  public destroy(): void {
    logger.debug("Destroying BaseService", {
      schemaName: this.schemaName,
      tableName: this.tableName
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
      tableName: this.tableName
    });
  }

  // Alias methods for backward compatibility
  async getAll(
    conditions: Record<string, any> = {},
    options: FindOptions = {}
  ): Promise<T[]> {
    logger.trace("Using getAll alias", {
      schemaName: this.schemaName,
      tableName: this.tableName
    });
    return this.findAll(conditions, options);
  }

  async getById(id: string | number): Promise<T | null> {
    logger.trace("Using getById alias", {
      schemaName: this.schemaName,
      tableName: this.tableName,
      id
    });
    return this.findById(id);
  }

  async getFirst(conditions: Record<string, any> = {}): Promise<T | null> {
    logger.trace("Using getFirst alias", {
      schemaName: this.schemaName,
      tableName: this.tableName
    });
    return this.findFirst(conditions);
  }
}