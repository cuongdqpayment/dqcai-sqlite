```ts

// src/types/core.ts
export interface SQLiteRow {
  [key: string]: any;
}

export interface SQLiteResult {
  rows: SQLiteRow[];
  rowsAffected: number;
  lastInsertRowId?: number;
}

export interface SQLiteConnection {
  execute(sql: string, params?: any[]): Promise<SQLiteResult>;
  close(): Promise<void>;
}

export interface SQLiteAdapter {
  connect(path: string): Promise<SQLiteConnection>;
  isSupported(): boolean;
}

// Enhanced schema types based on SQLiteDAO
export interface TypeMappingConfig {
  type_mapping: {
    [targetType: string]: {
      [sourceType: string]: string;
    };
  };
}

export interface ColumnDefinition {
  name: string;
  type: string;
  option_key?: string;
  description?: string;
  nullable?: boolean;
  default?: any;
  primary_key?: boolean;
  auto_increment?: boolean;
  unique?: boolean;
  constraints?: string;
  length?: number;
}

export interface Column {
  name: string;
  value?: any;
}

export interface WhereClause {
  name: string;
  value: any;
  operator?: string;
}

export interface OrderByClause {
  name: string;
  direction?: "ASC" | "DESC";
}

export interface LimitOffset {
  limit?: number;
  offset?: number;
}

export interface QueryTable {
  name: string;
  cols: Column[];
  wheres?: WhereClause[];
  orderbys?: OrderByClause[];
  limitOffset?: LimitOffset;
}

export interface JoinClause {
  type: "INNER" | "LEFT" | "RIGHT" | "FULL";
  table: string;
  on: string;
}

export interface IndexDefinition {
  name: string;
  columns: string[];
  unique?: boolean;
  description?: string;
}

export type ForeignKeyAction =
  | "CASCADE"
  | "RESTRICT"
  | "SET NULL"
  | "NO ACTION"
  | undefined;

export interface ForeignKeyDefinition {
  name: string;
  column: string;
  references: {
    table: string;
    column: string;
  };
  on_delete?: string | ForeignKeyAction;
  on_update?: string | ForeignKeyAction;
  description?: string;
}

export interface TableDefinition {
  name: string;
  cols: ColumnDefinition[];
  description?: string;
  indexes?: IndexDefinition[];
  foreign_keys?: ForeignKeyDefinition[];
}

export interface DatabaseSchema {
  version: string;
  database_name: string;
  description?: string;
  type_mapping?: TypeMappingConfig["type_mapping"];
  schemas: Record<
    string,
    {
      description?: string;
      cols: ColumnDefinition[];
      indexes?: IndexDefinition[];
      foreign_keys?: ForeignKeyDefinition[];
    }
  >;
}

// Transaction types
export interface TransactionOperation {
  type: "insert" | "update" | "delete" | "select";
  table: QueryTable;
}

export interface ImportOptions {
  tableName: string;
  data: Record<string, any>[];
  batchSize?: number;
  onProgress?: (processed: number, total: number) => void;
  onError?: (
    error: Error,
    rowIndex: number,
    rowData: Record<string, any>
  ) => void;
  skipErrors?: boolean;
  validateData?: boolean;
  updateOnConflict?: boolean;
  conflictColumns?: string[];
  includeAutoIncrementPK?: boolean;
}

export interface ImportResult {
  totalRows: number;
  successRows: number;
  errorRows: number;
  errors: Array<{
    rowIndex: number;
    error: string;
    rowData: Record<string, any>;
  }>;
  executionTime: number;
}

// Interface cho mapping column
export interface ColumnMapping {
  sourceColumn: string;
  targetColumn: string;
  transform?: (value: any) => any;
}

// Interface for database factory options
export interface DbFactoryOptions {
  config?: DatabaseSchema; // Option 1: Provide a config object directly
  configAsset?: any; // Option 3: Provide a required JSON asset
  dbDirectory?: string; // Optional: Directory to store the .db file
  adapter?: SQLiteAdapter; // Optional: Specific adapter to use
}

// Global type declarations for different environments
declare global {
  // Browser environment
  interface Window {
    SQL?: any;
    initSqlJs?: (config?: any) => Promise<any>;
    openDatabase?: (
      name: string,
      version: string,
      displayName: string,
      estimatedSize: number
    ) => any;
  }

  // Deno environment
  var Deno:
    | {
        env: any;
        readTextFile?: (path: string) => Promise<string>;
        writeTextFile?: (path: string, data: string) => Promise<void>;
        version?: { deno: string };
        [key: string]: any;
      }
    | undefined;

  // Bun environment
  var Bun:
    | {
        version: string;
        [key: string]: any;
      }
    | undefined;

  // React Native Windows
  var Windows: any;

  // Nodejs
  var process: any;

  // React Native Platform
  var Platform:
    | {
        OS: string;
        Version?: string;
      }
    | undefined;

  // Navigator (React Native detection)
  // var navigator: {
  //   product?: string;
  // } | undefined;
}

```
```ts

// src/adapters/base-adapter.ts
export abstract class BaseAdapter implements SQLiteAdapter {
  abstract connect(path: string): Promise<SQLiteConnection>;
  abstract isSupported(): boolean;

  protected sanitizeSQL(sql: string): string {
    return sql.trim();
  }

  protected bindParameters(sql: string, params?: any[]): string {
    if (!params || params.length === 0) {
      return sql;
    }

    let paramIndex = 0;
    return sql.replace(/\?/g, () => {
      if (paramIndex < params.length) {
        const param = params[paramIndex++];
        if (typeof param === 'string') {
          return `'${param.replace(/'/g, "''")}'`;
        }
        if (param === null || param === undefined) {
          return 'NULL';
        }
        return String(param);
      }
      return '?';
    });
  }
}

```
```ts

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
  ColumnMapping
} from "../types";

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
      forceRecreate?: boolean;  // Mặc định false - ép tạo lại = true
    }
  ) {
    this.createIfNotExists = options?.createIfNotExists ?? false;
    this.forceRecreate = options?.forceRecreate ?? false;
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    this.connection = await this.adapter.connect(this.dbPath);
    this.isConnected = true;
  }

  async disconnect(): Promise<void> {
    if (this.connection && this.isConnected) {
      await this.connection.close();
      this.connection = null;
      this.isConnected = false;
    }
  }

  async close(): Promise<void> {
    await this.disconnect();
  }

  // Type mapping utilities
  setTypeMappingConfig(config: TypeMappingConfig["type_mapping"]): void {
    this.typeMappingConfig = config;
  }

  private convertToSQLiteType(genericType: string): string {
    if (!this.typeMappingConfig || !this.typeMappingConfig.sqlite) {
      return this.getDefaultSQLiteType(genericType);
    }

    const sqliteMapping = this.typeMappingConfig.sqlite;
    return sqliteMapping[genericType.toLowerCase()] || "TEXT";
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
    const processedCol: ColumnDefinition = { ...col };
    processedCol.type = this.convertToSQLiteType(col.type);

    const options: string[] = [];
    if (col.constraints) {
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
    return processedCol;
  }

  // Schema initialization with enhanced options
  async initializeFromSchema(schema: DatabaseSchema): Promise<void> {
    this.ensureConnected();

    // Check if schema already exists
    let hasExistingSchema = false;
    try {
      const result = await this.execute(
        "SELECT version FROM _schema_info ORDER BY applied_at DESC LIMIT 1"
      );
      hasExistingSchema = result.rows.length > 0;
    } catch (error) {
      hasExistingSchema = false;
    }

    // Handle existing schema based on options
    if (hasExistingSchema && !this.createIfNotExists && !this.forceRecreate) {
      if (schema.type_mapping) {
        this.setTypeMappingConfig(schema.type_mapping);
      }
      return;
    }

    if (hasExistingSchema && this.forceRecreate) {
      await this.dropAllTables();
    }

    if (schema.type_mapping) {
      this.setTypeMappingConfig(schema.type_mapping);
    }

    try {
      await this.execute("PRAGMA foreign_keys = ON");
    } catch {}

    await this.beginTransaction();

    try {
      for (const [tableName, tableConfig] of Object.entries(schema.schemas)) {
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

      for (const [tableName, tableConfig] of Object.entries(schema.schemas)) {
        if (tableConfig.indexes?.length) {
          await this.createIndexesForTable(tableName, tableConfig.indexes);
        }
      }

      await this.setSchemaVersion(schema.version);
      await this.commitTransaction();
    } catch (error) {
      await this.rollbackTransaction();
      throw error;
    }
  }

  private async dropAllTables(): Promise<void> {
    const tables = await this.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    );

    await this.beginTransaction();

    try {
      for (const table of tables.rows) {
        await this.execute(`DROP TABLE IF EXISTS ${table.name}`);
      }
      await this.commitTransaction();
    } catch (error) {
      await this.rollbackTransaction();
      throw error;
    }
  }

  private async createTableWithForeignKeys(
    table: TableDefinition
  ): Promise<void> {
    const columnDefs = table.cols.map((col) =>
      `${col.name} ${col.type} ${col.option_key || ""}`.trim()
    );

    const foreignKeyDefs: string[] = [];
    if (table.foreign_keys) {
      for (const fk of table.foreign_keys) {
        let fkSql = `FOREIGN KEY (${fk.column}) REFERENCES ${fk.references.table}(${fk.references.column})`;
        if (fk.on_delete) fkSql += ` ON DELETE ${fk.on_delete}`;
        if (fk.on_update) fkSql += ` ON UPDATE ${fk.on_update}`;
        foreignKeyDefs.push(fkSql);
      }
    }

    const allDefs = [...columnDefs, ...foreignKeyDefs];
    const sql = `CREATE TABLE IF NOT EXISTS ${table.name} (${allDefs.join(
      ", "
    )})`;
    await this.execute(sql);
  }

  private async createIndexesForTable(
    tableName: string,
    indexes: IndexDefinition[]
  ): Promise<void> {
    for (const index of indexes) {
      const columns = index.columns.join(", ");
      const isUnique = index.unique || false;
      const sql = `CREATE ${isUnique ? "UNIQUE" : ""} INDEX IF NOT EXISTS ${
        index.name
      } ON ${tableName} (${columns})`;
      await this.execute(sql);
    }
  }

  // Transaction management
  async beginTransaction(): Promise<void> {
    if (this.inTransaction) {
      throw new Error("Transaction already in progress");
    }
    await this.execute("BEGIN TRANSACTION");
    this.inTransaction = true;
  }

  async commitTransaction(): Promise<void> {
    if (!this.inTransaction) {
      throw new Error("No transaction in progress");
    }
    await this.execute("COMMIT");
    this.inTransaction = false;
  }

  async rollbackTransaction(): Promise<void> {
    if (!this.inTransaction) {
      throw new Error("No transaction in progress");
    }
    await this.execute("ROLLBACK");
    this.inTransaction = false;
  }

  // Schema management
  async getSchemaVersion(): Promise<string> {
    try {
      const result = await this.getRst(
        "SELECT version FROM _schema_info ORDER BY applied_at DESC LIMIT 1"
      );
      return result.version || "0";
    } catch {
      return "0";
    }
  }

  async setSchemaVersion(version: string): Promise<void> {
    await this.execute(`CREATE TABLE IF NOT EXISTS _schema_info (
      version TEXT NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await this.execute(`INSERT INTO _schema_info (version) VALUES (?)`, [
      version,
    ]);
  }

  // CRUD Operations
  async insert(insertTable: QueryTable): Promise<SQLiteResult> {
    const validCols = insertTable.cols.filter(
      (col) => col.value !== undefined && col.value !== null
    );
    if (validCols.length === 0) {
      throw new Error("No valid columns to insert");
    }

    const columnNames = validCols.map((col) => col.name).join(", ");
    const placeholders = validCols.map(() => "?").join(", ");
    const params = validCols.map((col) =>
      typeof col.value === "object" ? JSON.stringify(col.value) : col.value
    );

    const sql = `INSERT INTO ${insertTable.name} (${columnNames}) VALUES (${placeholders})`;
    return await this.execute(sql, params);
  }

  async update(updateTable: QueryTable): Promise<SQLiteResult> {
    const setCols = updateTable.cols.filter(
      (col) =>
        col.value !== undefined &&
        !updateTable.wheres?.some((w) => w.name === col.name)
    );

    if (setCols.length === 0) {
      throw new Error("No columns to update");
    }

    const setClause = setCols.map((col) => `${col.name} = ?`).join(", ");
    const params = setCols.map((col) =>
      typeof col.value === "object" ? JSON.stringify(col.value) : col.value
    );

    let sql = `UPDATE ${updateTable.name} SET ${setClause}`;
    const whereClause = this.buildWhereClause(updateTable.wheres);

    if (!whereClause.sql) {
      throw new Error("WHERE clause is required for UPDATE operation");
    }

    sql += whereClause.sql;
    params.push(...whereClause.params);

    return await this.execute(sql, params);
  }

  async delete(deleteTable: QueryTable): Promise<SQLiteResult> {
    let sql = `DELETE FROM ${deleteTable.name}`;
    const whereClause = this.buildWhereClause(deleteTable.wheres);

    if (!whereClause.sql) {
      throw new Error("WHERE clause is required for DELETE operation");
    }

    sql += whereClause.sql;
    return await this.execute(sql, whereClause.params);
  }

  async select(selectTable: QueryTable): Promise<SQLiteRow> {
    const { sql, params } = this.buildSelectQuery(selectTable, " LIMIT 1");
    const result = await this.execute(sql, params);
    return result.rows[0] || {};
  }

  async selectAll(selectTable: QueryTable): Promise<SQLiteRow[]> {
    const { sql, params } = this.buildSelectQuery(selectTable);
    const result = await this.execute(sql, params);
    return result.rows;
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
    const queryTable: QueryTable = { name: tableName, cols: [], wheres: [] };

    for (const [key, value] of Object.entries(json)) {
      queryTable.cols.push({ name: key, value });
      if (idFields.includes(key) && value !== undefined) {
        queryTable.wheres?.push({ name: key, value });
      }
    }

    return queryTable;
  }

  // Enhanced Data Import functionality
  async importData(options: ImportOptions): Promise<ImportResult> {
    const startTime = Date.now();
    const result: ImportResult = {
      totalRows: options.data.length,
      successRows: 0,
      errorRows: 0,
      errors: [],
      executionTime: 0,
    };

    if (!this.isConnected) {
      throw new Error("Database is not connected");
    }

    if (!options.data || options.data.length === 0) {
      result.executionTime = Date.now() - startTime;
      return result;
    }

    const tableInfo = await this.getTableInfo(options.tableName);
    if (tableInfo.length === 0) {
      throw new Error(`Table '${options.tableName}' does not exist`);
    }

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

            if (options.onError) {
              options.onError(
                error instanceof Error ? error : new Error(String(error)),
                rowIndex,
                rowData
              );
            }

            if (!options.skipErrors) {
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
    } catch (error) {
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
    const transformedData = data.map((row) => {
      const newRow: Record<string, any> = {};

      columnMappings.forEach((mapping) => {
        if (row.hasOwnProperty(mapping.sourceColumn)) {
          let value = row[mapping.sourceColumn];

          if (mapping.transform) {
            value = mapping.transform(value);
          }

          newRow[mapping.targetColumn] = value;
        }
      });

      return newRow;
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
    const delimiter = options.delimiter || ",";
    const hasHeader = options.hasHeader !== false;

    const lines = csvData.split("\n").filter((line) => line.trim());
    if (lines.length === 0) {
      throw new Error("CSV data is empty");
    }

    let headers: string[] = [];
    let dataStartIndex = 0;

    if (hasHeader) {
      headers = lines[0]
        .split(delimiter)
        .map((h) => h.trim().replace(/^["']|["']$/g, ""));
      dataStartIndex = 1;
    } else {
      const firstRowCols = lines[0].split(delimiter).length;
      headers = Array.from(
        { length: firstRowCols },
        (_, i) => `column_${i + 1}`
      );
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

    if (options.columnMappings) {
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
        throw new Error(
          `Required column '${columnName}' is missing or null in table '${tableName}'`
        );
      }

      if (value !== null && value !== undefined) {
        processedRow[columnName] = this.convertValueToColumnType(
          value,
          columnInfo.type
        );
      }
    }

    return processedRow;
  }

  private transformRowData(
    rowData: Record<string, any>,
    columnMap: Map<string, any>,
    skipAutoIncrementPK: boolean = true
  ): Record<string, any> {
    const processedRow: Record<string, any> = {};

    for (const [key, value] of Object.entries(rowData)) {
      const columnName = key.toLowerCase();
      const columnInfo = columnMap.get(columnName);

      if (!columnInfo) {
        continue;
      }

      const isPrimaryKey = columnInfo.pk === 1;
      const isAutoIncrementPK =
        isPrimaryKey && columnInfo.type.toLowerCase().includes("integer");

      if (skipAutoIncrementPK && isAutoIncrementPK) {
        continue;
      }

      if (value !== null && value !== undefined) {
        processedRow[key] = this.convertValueToColumnType(
          value,
          columnInfo.type
        );
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
    await this.execute(sql, values);
  }

  private async insertOrUpdate(
    tableName: string,
    data: Record<string, any>,
    conflictColumns: string[]
  ): Promise<void> {
    try {
      await this.insertRow(tableName, data);
    } catch (error) {
      if (this.isConflictError(error)) {
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
      return;
    }

    const setClause = updateColumns.map((col) => `${col} = ?`).join(", ");
    const whereClause = whereColumns.map((col) => `${col} = ?`).join(" AND ");

    const updateValues = updateColumns.map((col) => data[col]);
    const whereValues = whereColumns.map((col) => data[col]);
    const allValues = [...updateValues, ...whereValues];

    const sql = `UPDATE ${tableName} SET ${setClause} WHERE ${whereClause}`;
    await this.execute(sql, allValues);
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
    const tables = await this.execute(
      "SELECT name FROM sqlite_master WHERE type='table'"
    );
    const version = await this.getSchemaVersion();

    return {
      name: this.dbPath,
      tables: tables.rows.map((t) => t.name),
      isConnected: this.isConnected,
      version,
    };
  }

  async getTableInfo(tableName: string): Promise<any[]> {
    const result = await this.execute(`PRAGMA table_info(${tableName})`);
    return result.rows;
  }

  async dropTable(tableName: string): Promise<void> {
    const sql = `DROP TABLE IF EXISTS ${tableName}`;
    await this.execute(sql);
  }

  // Connection check method
  isConnectionOpen(): boolean {
    return this.isConnected && !!this.connection;
  }

  async ensureConnected(): Promise<void> {
    if (!this.isConnectionOpen()) {
      await this.connect();
    }
  }

  async execute(sql: string, params: any[] = []): Promise<SQLiteResult> {
    this.ensureConnected();
    return await this.connection!.execute(sql, params);
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

```
```ts

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

```
```ts

// src/core/database-manager.ts

import { SQLiteAdapter, DatabaseSchema, ImportOptions, ImportResult, ColumnMapping } from "../types";
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

```
```ts

// src/core/base-service.ts
import {
  QueryTable,
  WhereClause,
  OrderByClause,
  ImportResult,
  ColumnMapping,
  ImportOptions,
} from "../types";
import { UniversalDAO } from "./universal-dao";
import { DatabaseManager } from "./database-manager";

export interface ServiceStatus {
  schemaName: string;
  isOpened: boolean;
  isInitialized: boolean;
  hasDao: boolean;
}

export interface HealthCheckResult {
  healthy: boolean;
  schemaName: string;
  recordCount?: number;
  error?: string;
  timestamp: string;
}

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
   * Create a new record
   */
  async create(data: Partial<T>): Promise<T | null> {
    await this._ensureInitialized();
    await this.ensureValidConnection();

    try {
      this._validateData(data);
      const queryTable = this.buildDataTable(data as Record<string, any>);
      const result = await this.dao!.insert(queryTable);

      let createdRecord: T | null = null;
      if (result.lastInsertRowId) {
        createdRecord = await this.findById(result.lastInsertRowId);
      } else if (data[this.primaryKeyFields[0] as keyof T]) {
        createdRecord = await this.findById(
          data[this.primaryKeyFields[0] as keyof T] as any
        );
      } else {
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

```
```ts

// src/query/query-builder.ts
import { UniversalDAO } from '../core/universal-dao';
import { SQLiteResult, SQLiteRow } from '../types';

export interface QueryCondition {
  field: string;
  operator: string;
  value: any;
}

export interface JoinClause {
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL OUTER';
  table: string;
  condition: string;
}

export interface SubQuery {
  query: QueryBuilder;
  alias: string;
}

/**
 * Enhanced QueryBuilder with advanced SQL query construction capabilities
 */
export class QueryBuilder {
  private tableName = '';
  private selectFields: string[] = ['*'];
  private joinClauses: JoinClause[] = [];
  private whereConditions: QueryCondition[] = [];
  private groupByFields: string[] = [];
  private havingConditions: QueryCondition[] = [];
  private orderByFields: string[] = [];
  private limitValue: number | null = null;
  private offsetValue: number | null = null;
  private params: any[] = [];
  private unionQueries: QueryBuilder[] = [];
  private subQueries: SubQuery[] = [];
  private cteQueries: Map<string, QueryBuilder> = new Map();
  private dao: UniversalDAO | null = null;

  constructor(dao?: UniversalDAO) {
    this.dao = dao || null;
  }

  static table(name: string, dao?: UniversalDAO): QueryBuilder {
    const builder = new QueryBuilder(dao);
    builder.tableName = name;
    return builder;
  }

  static from(name: string, dao?: UniversalDAO): QueryBuilder {
    return QueryBuilder.table(name, dao);
  }

  // SELECT operations
  select(fields: string | string[]): QueryBuilder {
    this.selectFields = Array.isArray(fields) ? fields : [fields];
    return this;
  }

  selectRaw(raw: string): QueryBuilder {
    this.selectFields = [raw];
    return this;
  }

  selectDistinct(fields: string | string[]): QueryBuilder {
    const fieldList = Array.isArray(fields) ? fields.join(', ') : fields;
    this.selectFields = [`DISTINCT ${fieldList}`];
    return this;
  }

  // JOIN operations
  join(table: string, condition: string, type: JoinClause['type'] = 'INNER'): QueryBuilder {
    this.joinClauses.push({ type, table, condition });
    return this;
  }

  innerJoin(table: string, condition: string): QueryBuilder {
    return this.join(table, condition, 'INNER');
  }

  leftJoin(table: string, condition: string): QueryBuilder {
    return this.join(table, condition, 'LEFT');
  }

  rightJoin(table: string, condition: string): QueryBuilder {
    return this.join(table, condition, 'RIGHT');
  }

  fullOuterJoin(table: string, condition: string): QueryBuilder {
    return this.join(table, condition, 'FULL OUTER');
  }

  // WHERE conditions
  where(field: string, operator: string, value?: any): QueryBuilder;
  where(field: string, value: any): QueryBuilder;
  where(conditions: Record<string, any>): QueryBuilder;
  where(fieldOrConditions: string | Record<string, any>, operatorOrValue?: string | any, value?: any): QueryBuilder {
    if (typeof fieldOrConditions === 'object') {
      // Handle object of conditions
      Object.entries(fieldOrConditions).forEach(([field, val]) => {
        this.whereConditions.push({ field, operator: '=', value: val });
      });
      return this;
    }

    let operator = '=';
    let actualValue = operatorOrValue;

    if (arguments.length === 3) {
      operator = operatorOrValue;
      actualValue = value;
    }

    this.whereConditions.push({ 
      field: fieldOrConditions, 
      operator, 
      value: actualValue 
    });
    
    return this;
  }

  whereEquals(field: string, value: any): QueryBuilder {
    return this.where(field, '=', value);
  }

  whereNot(field: string, value: any): QueryBuilder {
    return this.where(field, '!=', value);
  }

  whereLike(field: string, value: string): QueryBuilder {
    return this.where(field, 'LIKE', value);
  }

  whereNotLike(field: string, value: string): QueryBuilder {
    return this.where(field, 'NOT LIKE', value);
  }

  whereIn(field: string, values: any[]): QueryBuilder {
    this.whereConditions.push({ field, operator: 'IN', value: values });
    return this;
  }

  whereNotIn(field: string, values: any[]): QueryBuilder {
    this.whereConditions.push({ field, operator: 'NOT IN', value: values });
    return this;
  }

  whereBetween(field: string, min: any, max: any): QueryBuilder {
    this.whereConditions.push({ field, operator: 'BETWEEN', value: [min, max] });
    return this;
  }

  whereNotBetween(field: string, min: any, max: any): QueryBuilder {
    this.whereConditions.push({ field, operator: 'NOT BETWEEN', value: [min, max] });
    return this;
  }

  whereNull(field: string): QueryBuilder {
    this.whereConditions.push({ field, operator: 'IS NULL', value: null });
    return this;
  }

  whereNotNull(field: string): QueryBuilder {
    this.whereConditions.push({ field, operator: 'IS NOT NULL', value: null });
    return this;
  }

  whereExists(subquery: QueryBuilder): QueryBuilder {
    this.whereConditions.push({ 
      field: '', 
      operator: 'EXISTS', 
      value: subquery 
    });
    return this;
  }

  whereNotExists(subquery: QueryBuilder): QueryBuilder {
    this.whereConditions.push({ 
      field: '', 
      operator: 'NOT EXISTS', 
      value: subquery 
    });
    return this;
  }

  // OR WHERE conditions
  orWhere(field: string, operator: string, value?: any): QueryBuilder;
  orWhere(field: string, value: any): QueryBuilder;
  orWhere(field: string, operatorOrValue?: string | any, value?: any): QueryBuilder {
    // Implementation similar to where() but with OR logic
    // This would require refactoring the condition structure to support AND/OR
    return this.where(field, operatorOrValue as string, value);
  }

  // GROUP BY and HAVING
  groupBy(fields: string | string[]): QueryBuilder {
    this.groupByFields = Array.isArray(fields) ? fields : [fields];
    return this;
  }

  having(field: string, operator: string, value?: any): QueryBuilder {
    let actualOperator = '=';
    let actualValue = operator;

    if (arguments.length === 3) {
      actualOperator = operator;
      actualValue = value;
    }

    this.havingConditions.push({ 
      field, 
      operator: actualOperator, 
      value: actualValue 
    });
    return this;
  }

  havingCount(field: string, operator: string, value: number): QueryBuilder {
    return this.having(`COUNT(${field})`, operator, value);
  }

  // ORDER BY
  orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): QueryBuilder {
    this.orderByFields.push(`${field} ${direction}`);
    return this;
  }

  orderByDesc(field: string): QueryBuilder {
    return this.orderBy(field, 'DESC');
  }

  orderByRaw(raw: string): QueryBuilder {
    this.orderByFields.push(raw);
    return this;
  }

  latest(field: string = 'created_at'): QueryBuilder {
    return this.orderByDesc(field);
  }

  oldest(field: string = 'created_at'): QueryBuilder {
    return this.orderBy(field, 'ASC');
  }

  // LIMIT and OFFSET
  limit(count: number): QueryBuilder {
    this.limitValue = count;
    return this;
  }

  offset(count: number): QueryBuilder {
    this.offsetValue = count;
    return this;
  }

  skip(count: number): QueryBuilder {
    return this.offset(count);
  }

  take(count: number): QueryBuilder {
    return this.limit(count);
  }

  firstRow(): QueryBuilder {
    return this.limit(1);
  }

  paginate(page: number, perPage: number): QueryBuilder {
    this.limitValue = perPage;
    this.offsetValue = (page - 1) * perPage;
    return this;
  }

  // UNION operations
  union(query: QueryBuilder): QueryBuilder {
    this.unionQueries.push(query);
    return this;
  }

  unionAll(query: QueryBuilder): QueryBuilder {
    // Note: SQLite doesn't differentiate UNION and UNION ALL like other databases
    return this.union(query);
  }

  // CTE (Common Table Expressions)
  with(alias: string, query: QueryBuilder): QueryBuilder {
    this.cteQueries.set(alias, query);
    return this;
  }

  // Subqueries
  whereSubQuery(field: string, operator: string, subquery: QueryBuilder): QueryBuilder {
    this.subQueries.push({ query: subquery, alias: '' });
    this.whereConditions.push({ field, operator, value: subquery });
    return this;
  }

  // Aggregation functions
  count(field: string = '*'): QueryBuilder {
    this.selectFields = [`COUNT(${field}) as count`];
    return this;
  }

  sum(field: string): QueryBuilder {
    this.selectFields = [`SUM(${field}) as sum`];
    return this;
  }

  avg(field: string): QueryBuilder {
    this.selectFields = [`AVG(${field}) as avg`];
    return this;
  }

  max(field: string): QueryBuilder {
    this.selectFields = [`MAX(${field}) as max`];
    return this;
  }

  min(field: string): QueryBuilder {
    this.selectFields = [`MIN(${field}) as min`];
    return this;
  }

  // SQL Generation
  toSQL(): { sql: string; params: any[] } {
    let sql = '';
    const params: any[] = [];

    // CTE queries
    if (this.cteQueries.size > 0) {
      const cteList: string[] = [];
      this.cteQueries.forEach((query, alias) => {
        const { sql: cteSql, params: cteParams } = query.toSQL();
        cteList.push(`${alias} AS (${cteSql})`);
        params.push(...cteParams);
      });
      sql += `WITH ${cteList.join(', ')} `;
    }

    // Main SELECT
    sql += `SELECT ${this.selectFields.join(', ')} FROM ${this.tableName}`;

    // JOINs
    if (this.joinClauses.length > 0) {
      this.joinClauses.forEach(join => {
        sql += ` ${join.type} JOIN ${join.table} ON ${join.condition}`;
      });
    }

    // WHERE conditions
    if (this.whereConditions.length > 0) {
      const conditions: string[] = [];
      this.whereConditions.forEach(condition => {
        const { clause, conditionParams } = this.buildCondition(condition);
        conditions.push(clause);
        params.push(...conditionParams);
      });
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    // GROUP BY
    if (this.groupByFields.length > 0) {
      sql += ` GROUP BY ${this.groupByFields.join(', ')}`;
    }

    // HAVING
    if (this.havingConditions.length > 0) {
      const conditions: string[] = [];
      this.havingConditions.forEach(condition => {
        const { clause, conditionParams } = this.buildCondition(condition);
        conditions.push(clause);
        params.push(...conditionParams);
      });
      sql += ` HAVING ${conditions.join(' AND ')}`;
    }

    // ORDER BY
    if (this.orderByFields.length > 0) {
      sql += ` ORDER BY ${this.orderByFields.join(', ')}`;
    }

    // LIMIT
    if (this.limitValue !== null) {
      sql += ` LIMIT ${this.limitValue}`;
    }

    // OFFSET
    if (this.offsetValue !== null) {
      sql += ` OFFSET ${this.offsetValue}`;
    }

    // UNION queries
    if (this.unionQueries.length > 0) {
      this.unionQueries.forEach(unionQuery => {
        const { sql: unionSql, params: unionParams } = unionQuery.toSQL();
        sql += ` UNION ${unionSql}`;
        params.push(...unionParams);
      });
    }

    return { sql, params };
  }

  private buildCondition(condition: QueryCondition): { clause: string; conditionParams: any[] } {
    const { field, operator, value } = condition;
    const params: any[] = [];

    switch (operator.toUpperCase()) {
      case 'IN':
      case 'NOT IN':
        const placeholders = (value as any[]).map(() => '?').join(', ');
        params.push(...(value as any[]));
        return { 
          clause: `${field} ${operator} (${placeholders})`, 
          conditionParams: params 
        };

      case 'BETWEEN':
      case 'NOT BETWEEN':
        params.push(value[0], value[1]);
        return { 
          clause: `${field} ${operator} ? AND ?`, 
          conditionParams: params 
        };

      case 'IS NULL':
      case 'IS NOT NULL':
        return { 
          clause: `${field} ${operator}`, 
          conditionParams: [] 
        };

      case 'EXISTS':
      case 'NOT EXISTS':
        const { sql: subSql, params: subParams } = (value as QueryBuilder).toSQL();
        params.push(...subParams);
        return { 
          clause: `${operator} (${subSql})`, 
          conditionParams: params 
        };

      default:
        if (value instanceof QueryBuilder) {
          const { sql: subSql, params: subParams } = value.toSQL();
          params.push(...subParams);
          return { 
            clause: `${field} ${operator} (${subSql})`, 
            conditionParams: params 
          };
        }
        params.push(value);
        return { 
          clause: `${field} ${operator} ?`, 
          conditionParams: params 
        };
    }
  }

  // Execution methods (require DAO)
  async get(): Promise<SQLiteRow[]> {
    if (!this.dao) {
      throw new Error('DAO instance required for query execution');
    }
    const { sql, params } = this.toSQL();
    const result = await this.dao.execute(sql, params);
    return result.rows;
  }

  async first(): Promise<SQLiteRow | null> {
    this.limit(1);
    const results = await this.get(); // This will apply the limit(1) set by firstRow()
    return results.length > 0 ? results[0] : null;
  }

  async pluck(column: string): Promise<any[]> {
    this.select(column);
    const results = await this.get();
    return results.map(row => row[column]);
  }

  async exists(): Promise<boolean> {
    this.select('1').limit(1);
    const results = await this.get();
    return results.length > 0;
  }

  async countResult(): Promise<number> {
    this.count();
    const result = await this.first();
    return result ? result.count : 0;
  }

  // Static helper methods for DML operations
  static insert(tableName: string, data: Record<string, any>): { sql: string; params: any[] } {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map(() => '?').join(', ');

    return {
      sql: `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${placeholders})`,
      params: values
    };
  }

  static insertMany(tableName: string, dataArray: Record<string, any>[]): { sql: string; params: any[] } {
    if (dataArray.length === 0) {
      throw new Error('Data array cannot be empty');
    }

    const fields = Object.keys(dataArray[0]);
    const placeholders = fields.map(() => '?').join(', ');
    const valueGroups = dataArray.map(() => `(${placeholders})`).join(', ');

    const allValues = dataArray.flatMap(data => Object.values(data));

    return {
      sql: `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES ${valueGroups}`,
      params: allValues
    };
  }

  static update(tableName: string, data: Record<string, any>, where: string, whereParams: any[] = []): { sql: string; params: any[] } {
    const sets = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const params = [...Object.values(data), ...whereParams];

    return {
      sql: `UPDATE ${tableName} SET ${sets} WHERE ${where}`,
      params
    };
  }

  static delete(tableName: string, where: string, whereParams: any[] = []): { sql: string; params: any[] } {
    return {
      sql: `DELETE FROM ${tableName} WHERE ${where}`,
      params: whereParams
    };
  }

  static upsert(tableName: string, data: Record<string, any>, conflictColumns: string[]): { sql: string; params: any[] } {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map(() => '?').join(', ');

    const updateColumns = fields.filter(field => !conflictColumns.includes(field));
    const updateClause = updateColumns.length > 0
      ? updateColumns.map(col => `${col} = excluded.${col}`).join(', ')
      : '';

    let sql = `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${placeholders})`;

    if (updateColumns.length > 0) {
      sql += ` ON CONFLICT(${conflictColumns.join(', ')}) DO UPDATE SET ${updateClause}`;
    } else {
      sql += ` ON CONFLICT(${conflictColumns.join(', ')}) DO NOTHING`;
    }

    return { sql, params: values };
  }

  // Utility methods
  clone(): QueryBuilder {
    if (!this.dao) throw new Error('DAO instance required for cloning QueryBuilder');
    const cloned = new QueryBuilder(this.dao);
    cloned.tableName = this.tableName;
    cloned.selectFields = [...this.selectFields];
    cloned.joinClauses = [...this.joinClauses];
    cloned.whereConditions = [...this.whereConditions];
    cloned.groupByFields = [...this.groupByFields];
    cloned.havingConditions = [...this.havingConditions];
    cloned.orderByFields = [...this.orderByFields];
    cloned.limitValue = this.limitValue;
    cloned.offsetValue = this.offsetValue;
    cloned.unionQueries = [...this.unionQueries];
    cloned.subQueries = [...this.subQueries];
    cloned.cteQueries = new Map(this.cteQueries);
    return cloned;
  }

  toRawSQL(): string {
    const { sql, params } = this.toSQL();
    let rawSql = sql;
    params.forEach(param => {
      if (typeof param === 'string') {
        rawSql = rawSql.replace('?', `'${param.replace(/'/g, "''")}'`);
      } else if (param === null || param === undefined) {
        rawSql = rawSql.replace('?', 'NULL');
      } else {
        rawSql = rawSql.replace('?', String(param));
      }
    });
    return rawSql;
  }

  explain(): QueryBuilder {
    this.selectFields = ['EXPLAIN QUERY PLAN ' + this.selectFields.join(', ')];
    return this;
  }
}

```
```ts

// src/utils/migration-manager.ts
export interface Migration {
  version: string;
  description: string;
  up: (dao: UniversalDAO) => Promise<void>;
  down: (dao: UniversalDAO) => Promise<void>;
}

export class MigrationManager {
  private dao: UniversalDAO;
  private migrations: Migration[] = [];

  constructor(dao: UniversalDAO) {
    this.dao = dao;
  }

  addMigration(migration: Migration): void {
    this.migrations.push(migration);
    this.migrations.sort((a, b) => a.version.localeCompare(b.version));
  }

  async initMigrationTable(): Promise<void> {
    await this.dao.execute(`
      CREATE TABLE IF NOT EXISTS _migrations (
        version TEXT PRIMARY KEY,
        description TEXT,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async getAppliedMigrations(): Promise<string[]> {
    try {
      const result = await this.dao.execute('SELECT version FROM _migrations ORDER BY version');
      return result.rows.map(row => row.version);
    } catch {
      return [];
    }
  }

  async migrate(targetVersion?: string): Promise<void> {
    await this.initMigrationTable();
    const appliedMigrations = await this.getAppliedMigrations();
    
    for (const migration of this.migrations) {
      if (targetVersion && migration.version > targetVersion) {
        break;
      }
      
      if (!appliedMigrations.includes(migration.version)) {
        await this.dao.beginTransaction();
        
        try {
          await migration.up(this.dao);
          await this.dao.execute(
            'INSERT INTO _migrations (version, description) VALUES (?, ?)',
            [migration.version, migration.description]
          );
          await this.dao.commitTransaction();
        } catch (error) {
          await this.dao.rollbackTransaction();
          throw new Error(`Migration ${migration.version} failed: ${error}`);
        }
      }
    }
  }

  async rollback(targetVersion?: string): Promise<void> {
    await this.initMigrationTable();
    const appliedMigrations = await this.getAppliedMigrations();
    
    const reversedMigrations = [...this.migrations].reverse();
    
    for (const migration of reversedMigrations) {
      if (targetVersion && migration.version <= targetVersion) {
        break;
      }
      
      if (appliedMigrations.includes(migration.version)) {
        await this.dao.beginTransaction();
        
        try {
          await migration.down(this.dao);
          await this.dao.execute('DELETE FROM _migrations WHERE version = ?', [migration.version]);
          await this.dao.commitTransaction();
        } catch (error) {
          await this.dao.rollbackTransaction();
          throw new Error(`Rollback of migration ${migration.version} failed: ${error}`);
        }
      }
    }
  }

  async status(): Promise<Array<{ version: string; description: string; applied: boolean }>> {
    await this.initMigrationTable();
    const appliedMigrations = await this.getAppliedMigrations();
    
    return this.migrations.map(migration => ({
      version: migration.version,
      description: migration.description,
      applied: appliedMigrations.includes(migration.version)
    }));
  }
}

```
```ts

// src/utils/csv-import.ts
import { UniversalDAO } from '../core/universal-dao';
import { ImportOptions, ImportResult, ColumnMapping } from '../types';

export interface CSVParseOptions {
  delimiter?: string;
  quote?: string;
  escape?: string;
  hasHeader?: boolean;
  skipEmptyLines?: boolean;
  trimWhitespace?: boolean;
  encoding?: string;
}

export interface CSVImportOptions extends CSVParseOptions {
  columnMappings?: Record<string, string> | ColumnMapping[];
  transform?: Record<string, (value: any, row: Record<string, any>, index: number) => any>;
  validate?: Record<string, (value: any, row: Record<string, any>, index: number) => boolean | string>;
  onRowParsed?: (row: Record<string, any>, index: number) => Record<string, any> | null;
  onRowError?: (error: Error, row: Record<string, any>, index: number) => boolean; // return true to skip, false to abort
  maxRows?: number;
  startFromRow?: number;
  dateFormats?: string[];
  booleanValues?: {
    true: string[];
    false: string[];
  };
}

export interface CSVParseResult {
  data: Record<string, any>[];
  headers: string[];
  totalRows: number;
  parsedRows: number;
  skippedRows: number;
  errors: Array<{
    row: number;
    column?: string;
    error: string;
    rawData?: string;
  }>;
}

export class CSVImporter {
  private dao: UniversalDAO;

  constructor(dao: UniversalDAO) {
    this.dao = dao;
  }

  /**
   * Parse CSV string into structured data
   */
  parseCSV(csvData: string, options: CSVParseOptions = {}): CSVParseResult {
    const opts = {
      delimiter: ',',
      quote: '"',
      escape: '"',
      hasHeader: true,
      skipEmptyLines: true,
      trimWhitespace: true,
      ...options,
    };

    const result: CSVParseResult = {
      data: [],
      headers: [],
      totalRows: 0,
      parsedRows: 0,
      skippedRows: 0,
      errors: [],
    };

    if (!csvData || csvData.trim().length === 0) {
      result.errors.push({
        row: 0,
        error: 'CSV data is empty',
      });
      return result;
    }

    try {
      const lines = this.splitCSVLines(csvData, opts);
      result.totalRows = lines.length;

      if (lines.length === 0) {
        result.errors.push({
          row: 0,
          error: 'No valid lines found in CSV data',
        });
        return result;
      }

      // Parse headers
      let dataStartIndex = 0;
      if (opts.hasHeader && lines.length > 0) {
        try {
          result.headers = this.parseCSVRow(lines[0], opts);
          if (opts.trimWhitespace) {
            result.headers = result.headers.map(h => h.trim());
          }
          dataStartIndex = 1;
        } catch (error) {
          result.errors.push({
            row: 1,
            error: `Failed to parse header row: ${(error as Error).message}`,
            rawData: lines[0],
          });
          return result;
        }
      } else {
        // Generate default headers
        const firstRow = this.parseCSVRow(lines[0], opts);
        result.headers = firstRow.map((_, index) => `column_${index + 1}`);
      }

      // Parse data rows
      for (let i = dataStartIndex; i < lines.length; i++) {
        const lineNumber = i + 1;
        const line = lines[i];

        if (opts.skipEmptyLines && line.trim().length === 0) {
          result.skippedRows++;
          continue;
        }

        try {
          const values = this.parseCSVRow(line, opts);
          const row: Record<string, any> = {};

          // Map values to headers
          result.headers.forEach((header, index) => {
            let value = values[index] || null;
            
            if (opts.trimWhitespace && typeof value === 'string') {
              value = value.trim();
            }

            // Convert empty strings to null
            if (value === '') {
              value = null;
            }

            row[header] = value;
          });

          result.data.push(row);
          result.parsedRows++;
        } catch (error) {
          result.errors.push({
            row: lineNumber,
            error: `Failed to parse row: ${(error as Error).message}`,
            rawData: line,
          });
          result.skippedRows++;
        }
      }

      return result;
    } catch (error) {
      result.errors.push({
        row: 0,
        error: `CSV parsing failed: ${(error as Error).message}`,
      });
      return result;
    }
  }

  /**
   * Advanced CSV import with comprehensive options
   */
  async importFromCSV(
    tableName: string,
    csvData: string,
    options: CSVImportOptions & Partial<ImportOptions> = {}
  ): Promise<ImportResult & { parseResult: CSVParseResult }> {
    const startTime = Date.now();

    // Parse CSV first
    const parseResult = this.parseCSV(csvData, options);
    
    if (parseResult.errors.length > 0 && parseResult.data.length === 0) {
      throw new Error(`CSV parsing failed: ${parseResult.errors.map(e => e.error).join('; ')}`);
    }

    let processedData = parseResult.data;

    // Apply row limits
    if (options.startFromRow && options.startFromRow > 0) {
      processedData = processedData.slice(options.startFromRow);
    }
    
    if (options.maxRows && options.maxRows > 0) {
      processedData = processedData.slice(0, options.maxRows);
    }

    // Apply column mappings
    if (options.columnMappings) {
      processedData = this.applyColumnMappings(processedData, options.columnMappings);
    }

    // Apply transformations and validations
    const transformedData: Record<string, any>[] = [];
    const transformErrors: Array<{ row: number; error: string }> = [];

    for (let i = 0; i < processedData.length; i++) {
      const row = processedData[i];
      let transformedRow = { ...row };

      try {
        // Apply onRowParsed callback
        if (options.onRowParsed) {
          const result = options.onRowParsed(transformedRow, i);
          if (result === null) {
            continue; // Skip this row
          }
          transformedRow = result;
        }

        // Apply field transformations
        if (options.transform) {
          for (const [field, transformer] of Object.entries(options.transform)) {
            if (transformedRow.hasOwnProperty(field)) {
              try {
                transformedRow[field] = transformer(transformedRow[field], transformedRow, i);
              } catch (error) {
                transformErrors.push({
                  row: i + 1,
                  error: `Transform error for field '${field}': ${(error as Error).message}`,
                });
                
                if (options.onRowError) {
                  const shouldSkip = options.onRowError(error as Error, transformedRow, i);
                  if (!shouldSkip) {
                    throw error;
                  }
                  continue;
                }
                throw error;
              }
            }
          }
        }

        // Apply field validations
        if (options.validate) {
          for (const [field, validator] of Object.entries(options.validate)) {
            if (transformedRow.hasOwnProperty(field)) {
              try {
                const validationResult = validator(transformedRow[field], transformedRow, i);
                if (validationResult !== true) {
                  const errorMessage = typeof validationResult === 'string' 
                    ? validationResult 
                    : `Validation failed for field '${field}'`;
                  
                  const validationError = new Error(errorMessage);
                  
                  if (options.onRowError) {
                    const shouldSkip = options.onRowError(validationError, transformedRow, i);
                    if (!shouldSkip) {
                      throw validationError;
                    }
                    continue;
                  }
                  throw validationError;
                }
              } catch (error) {
                transformErrors.push({
                  row: i + 1,
                  error: `Validation error for field '${field}': ${(error as Error).message}`,
                });
                throw error;
              }
            }
          }
        }

        // Apply automatic type conversion
        transformedRow = this.autoConvertTypes(transformedRow, options);
        
        transformedData.push(transformedRow);
      } catch (error) {
        if (options.onRowError) {
          const shouldSkip = options.onRowError(error as Error, transformedRow, i);
          if (shouldSkip) {
            continue;
          }
        }
        throw error;
      }
    }

    // Import to database
    const importResult = await this.dao.importData({
      tableName,
      data: transformedData,
      batchSize: options.batchSize || 1000,
      onProgress: options.onProgress,
      onError: options.onError,
      skipErrors: options.skipErrors || false,
      validateData: options.validateData !== false,
      updateOnConflict: options.updateOnConflict || false,
      conflictColumns: options.conflictColumns,
      includeAutoIncrementPK: options.includeAutoIncrementPK || false,
    });

    // Combine parse errors with import errors
    const allErrors = [
      ...parseResult.errors.map(e => ({
        rowIndex: e.row - 1,
        error: e.error,
        rowData: e.rawData ? { _raw: e.rawData } : {},
      })),
      ...transformErrors.map(e => ({
        rowIndex: e.row - 1,
        error: e.error,
        rowData: {},
      })),
      ...importResult.errors,
    ];

    return {
      ...importResult,
      errors: allErrors,
      parseResult,
    };
  }

  /**
   * Import CSV from file path (Node.js/Deno environments)
   */
  async importFromFile(
    tableName: string,
    filePath: string,
    options: CSVImportOptions & Partial<ImportOptions> = {}
  ): Promise<ImportResult & { parseResult: CSVParseResult }> {
    let csvData: string;

    try {
      // Try Deno first
      if (typeof globalThis.Deno !== 'undefined' && globalThis.Deno.readTextFile) {
        csvData = await globalThis.Deno.readTextFile(filePath);
      }
      // Try Node.js
      else if (typeof require !== 'undefined') {
        const fs = require('fs').promises;
        csvData = await fs.readFile(filePath, options.encoding || 'utf8');
      }
      // Try browser File API (if file is provided as File object)
      else if (typeof filePath === 'object' && 'text' in filePath) {
        csvData = await (filePath as any).text();
      }
      else {
        throw new Error('File reading not supported in this environment');
      }
    } catch (error) {
      throw new Error(`Failed to read CSV file '${filePath}': ${(error as Error).message}`);
    }

    return await this.importFromCSV(tableName, csvData, options);
  }

  /**
   * Export table data to CSV format
   */
  async exportToCSV(
    tableName: string,
    options: {
      columns?: string[];
      where?: string;
      orderBy?: string;
      limit?: number;
      delimiter?: string;
      quote?: string;
      includeHeaders?: boolean;
      dateFormat?: string;
      nullValue?: string;
    } = {}
  ): Promise<string> {
    const opts = {
      delimiter: ',',
      quote: '"',
      includeHeaders: true,
      dateFormat: 'YYYY-MM-DD HH:mm:ss',
      nullValue: '',
      ...options,
    };

    // Build query
    let sql = `SELECT ${options.columns ? options.columns.join(', ') : '*'} FROM ${tableName}`;
    const params: any[] = [];

    if (options.where) {
      sql += ` WHERE ${options.where}`;
    }

    if (options.orderBy) {
      sql += ` ORDER BY ${options.orderBy}`;
    }

    if (options.limit) {
      sql += ` LIMIT ${options.limit}`;
    }

    // Execute query
    const result = await this.dao.execute(sql, params);
    
    if (result.rows.length === 0) {
      return opts.includeHeaders && options.columns 
        ? this.formatCSVRow(options.columns, opts) 
        : '';
    }

    const rows: string[] = [];

    // Add headers
    if (opts.includeHeaders) {
      const headers = options.columns || Object.keys(result.rows[0]);
      rows.push(this.formatCSVRow(headers, opts));
    }

    // Add data rows
    for (const row of result.rows) {
      const values = Object.values(row).map(value => {
        if (value === null || value === undefined) {
          return opts.nullValue;
        }
        if (value instanceof Date) {
          return this.formatDate(value, opts.dateFormat);
        }
        return String(value);
      });
      
      rows.push(this.formatCSVRow(values, opts));
    }

    return rows.join('\n');
  }

  // Private helper methods

  private splitCSVLines(csvData: string, options: CSVParseOptions): string[] {
    const lines: string[] = [];
    let currentLine = '';
    let inQuotes = false;
    let quoteCount = 0;

    for (let i = 0; i < csvData.length; i++) {
      const char = csvData[i];
      const nextChar = csvData[i + 1];

      if (char === options.quote) {
        quoteCount++;
        inQuotes = !inQuotes;
        
        // Handle escaped quotes
        if (nextChar === options.quote && options.escape === options.quote) {
          currentLine += char + nextChar;
          i++; // Skip next quote
          quoteCount++;
          continue;
        }
      }

      if (char === '\n' && !inQuotes) {
        if (options.skipEmptyLines && currentLine.trim().length === 0) {
          currentLine = '';
          continue;
        }
        lines.push(currentLine);
        currentLine = '';
        inQuotes = false;
        quoteCount = 0;
      } else if (char === '\r' && nextChar === '\n' && !inQuotes) {
        if (options.skipEmptyLines && currentLine.trim().length === 0) {
          currentLine = '';
          i++; // Skip \n
          continue;
        }
        lines.push(currentLine);
        currentLine = '';
        i++; // Skip \n
        inQuotes = false;
        quoteCount = 0;
      } else {
        currentLine += char;
      }
    }

    // Add last line if it exists
    if (currentLine.length > 0) {
      if (!options.skipEmptyLines || currentLine.trim().length > 0) {
        lines.push(currentLine);
      }
    }

    return lines;
  }

  private parseCSVRow(line: string, options: CSVParseOptions): string[] {
    const values: string[] = [];
    let currentValue = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === options.quote) {
        if (inQuotes && nextChar === options.quote && options.escape === options.quote) {
          // Escaped quote
          currentValue += options.quote;
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === options.delimiter && !inQuotes) {
        values.push(currentValue);
        currentValue = '';
      } else {
        currentValue += char;
      }
    }

    // Add last value
    values.push(currentValue);

    return values;
  }

  private formatCSVRow(values: string[], options: { delimiter: string; quote: string }): string {
    return values.map(value => {
      const strValue = String(value);
      
      // Quote if contains delimiter, quote, or newline
      if (strValue.includes(options.delimiter) || 
          strValue.includes(options.quote) || 
          strValue.includes('\n') || 
          strValue.includes('\r')) {
        return options.quote + strValue.replace(new RegExp(options.quote, 'g'), options.quote + options.quote) + options.quote;
      }
      
      return strValue;
    }).join(options.delimiter);
  }

  private applyColumnMappings(
    data: Record<string, any>[], 
    mappings: Record<string, string> | ColumnMapping[]
  ): Record<string, any>[] {
    if (Array.isArray(mappings)) {
      // ColumnMapping[] format
      return data.map(row => {
        const newRow: Record<string, any> = {};
        
        mappings.forEach(mapping => {
          if (row.hasOwnProperty(mapping.sourceColumn)) {
            let value = row[mapping.sourceColumn];
            
            if (mapping.transform) {
              value = mapping.transform(value);
            }
            
            newRow[mapping.targetColumn] = value;
          }
        });
        
        return newRow;
      });
    } else {
      // Record<string, string> format
      return data.map(row => {
        const newRow: Record<string, any> = {};
        
        Object.entries(row).forEach(([key, value]) => {
          const newKey = mappings[key] || key;
          newRow[newKey] = value;
        });
        
        return newRow;
      });
    }
  }

  private autoConvertTypes(
    row: Record<string, any>, 
    options: CSVImportOptions
  ): Record<string, any> {
    const converted: Record<string, any> = {};

    Object.entries(row).forEach(([key, value]) => {
      converted[key] = this.convertValue(value, options);
    });

    return converted;
  }

  private convertValue(value: any, options: CSVImportOptions): any {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const strValue = String(value).trim();

    // Boolean conversion
    if (options.booleanValues) {
      const lowerValue = strValue.toLowerCase();
      if (options.booleanValues.true.some(t => t.toLowerCase() === lowerValue)) {
        return true;
      }
      if (options.booleanValues.false.some(f => f.toLowerCase() === lowerValue)) {
        return false;
      }
    } else {
      // Default boolean values
      const lowerValue = strValue.toLowerCase();
      if (['true', '1', 'yes', 'on'].includes(lowerValue)) {
        return true;
      }
      if (['false', '0', 'no', 'off'].includes(lowerValue)) {
        return false;
      }
    }

    // Number conversion
    if (/^-?\d+$/.test(strValue)) {
      const intValue = parseInt(strValue);
      if (!isNaN(intValue)) {
        return intValue;
      }
    }

    if (/^-?\d*\.?\d+$/.test(strValue)) {
      const floatValue = parseFloat(strValue);
      if (!isNaN(floatValue)) {
        return floatValue;
      }
    }

    // Date conversion
    if (options.dateFormats) {
      for (const format of options.dateFormats) {
        const date = this.parseDate(strValue, format);
        if (date) {
          return date.toISOString();
        }
      }
    } else {
      // Default date parsing
      const date = new Date(strValue);
      if (!isNaN(date.getTime()) && strValue.match(/\d{4}-\d{2}-\d{2}/)) {
        return date.toISOString();
      }
    }

    return strValue;
  }

  private parseDate(dateString: string, format: string): Date | null {
    // Simple date format parsing - you might want to use a more robust library like date-fns
    try {
      // This is a simplified implementation
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }

  private formatDate(date: Date, format: string): string {
    // Simple date formatting - you might want to use a more robust library
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return format
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  /**
   * Static utility methods for parsing CSV values
   */
  static parseCSVValue(value: string, options: { 
    autoConvert?: boolean;
    booleanValues?: { true: string[]; false: string[] };
    dateFormats?: string[];
  } = {}): any {
    if (value === '' || value === null) return null;
    
    const opts = {
      autoConvert: true,
      booleanValues: {
        true: ['true', '1', 'yes', 'on'],
        false: ['false', '0', 'no', 'off']
      },
      ...options
    };

    if (!opts.autoConvert) {
      return value;
    }

    const strValue = String(value).trim().toLowerCase();

    // Boolean conversion
    if (opts.booleanValues.true.includes(strValue)) {
      return true;
    }
    if (opts.booleanValues.false.includes(strValue)) {
      return false;
    }

    // Number conversion
    if (/^-?\d+$/.test(value)) {
      const intValue = parseInt(value);
      if (!isNaN(intValue)) return intValue;
    }

    if (/^-?\d*\.?\d+$/.test(value)) {
      const floatValue = parseFloat(value);
      if (!isNaN(floatValue)) return floatValue;
    }

    // Date conversion
    const date = new Date(value);
    if (!isNaN(date.getTime()) && value.match(/\d{4}-\d{2}-\d{2}/)) {
      return date.toISOString();
    }

    return value;
  }

  /**
   * Validate CSV structure
   */
  static validateCSVStructure(csvData: string, options: CSVParseOptions = {}): {
    isValid: boolean;
    errors: string[];
    rowCount: number;
    columnCount: number;
    headers: string[];
  } {
    const result = {
      isValid: true,
      errors: [] as string[],
      rowCount: 0,
      columnCount: 0,
      headers: [] as string[],
    };

    try {
      const importer = new CSVImporter({} as UniversalDAO);
      const parseResult = importer.parseCSV(csvData, options);

      result.rowCount = parseResult.totalRows;
      result.headers = parseResult.headers;
      result.columnCount = parseResult.headers.length;

      if (parseResult.errors.length > 0) {
        result.isValid = false;
        result.errors = parseResult.errors.map(e => e.error);
      }

      if (parseResult.data.length === 0) {
        result.isValid = false;
        result.errors.push('No valid data rows found');
      }

      // Check for consistent column count
      const inconsistentRows = parseResult.data.filter(row => 
        Object.keys(row).length !== result.columnCount
      );

      if (inconsistentRows.length > 0) {
        result.isValid = false;
        result.errors.push(`${inconsistentRows.length} rows have inconsistent column count`);
      }

    } catch (error) {
      result.isValid = false;
      result.errors.push(`Validation failed: ${(error as Error).message}`);
    }

    return result;
  }
}

```
```ts

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

```