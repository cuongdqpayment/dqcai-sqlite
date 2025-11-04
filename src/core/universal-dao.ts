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
} from "@/types";

// Import logger configuration for internal use
import { SQLiteModules, createModuleLogger } from "@/logger";
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
