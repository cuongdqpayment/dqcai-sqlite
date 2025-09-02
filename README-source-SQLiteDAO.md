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
  direction?: 'ASC' | 'DESC';
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
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
  table: string;
  on: string;
}

export interface IndexDefinition {
  name: string;
  columns: string[];
  unique?: boolean;
  description?: string;
}

export interface ForeignKeyDefinition {
  name: string;
  column: string;
  references: {
    table: string;
    column: string;
  };
  on_delete?: string;
  on_update?: string;
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
  type_mapping?: TypeMappingConfig['type_mapping'];
  schemas: Record<string, {
    description?: string;
    cols: ColumnDefinition[];
    indexes?: IndexDefinition[];
    foreign_keys?: ForeignKeyDefinition[];
  }>;
}

export interface ImportOptions {
  tableName: string;
  data: Record<string, any>[];
  batchSize?: number;
  onProgress?: (processed: number, total: number) => void;
  onError?: (error: Error, rowIndex: number, rowData: Record<string, any>) => void;
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

// Global type declarations for different environments
declare global {
  // Browser environment
  interface Window {
    SQL?: any;
    initSqlJs?: (config?: any) => Promise<any>;
    openDatabase?: (name: string, version: string, displayName: string, estimatedSize: number) => any;
  }

  // Deno environment
  var Deno: {
    env: any;
    version?: { deno: string };
    [key: string]: any;
  } | undefined;

  // Bun environment
  var Bun: {
    version: string;
    [key: string]: any;
  } | undefined;

  // React Native Windows
  var Windows: any;

  // Nodejs
  var process:any;
  
  // React Native Platform
  var Platform: {
    OS: string;
    Version?: string;
  } | undefined;

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
export class UniversalDAO {
  private connection: SQLiteConnection | null = null;
  private isConnected: boolean = false;
  private inTransaction: boolean = false;
  private typeMappingConfig: TypeMappingConfig['type_mapping'] | null = null;

  constructor(private adapter: SQLiteAdapter, private dbPath: string) {}

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

  // Type mapping utilities
  setTypeMappingConfig(config: TypeMappingConfig['type_mapping']): void {
    this.typeMappingConfig = config;
  }

  private convertToSQLiteType(genericType: string): string {
    if (!this.typeMappingConfig || !this.typeMappingConfig.sqlite) {
      return this.getDefaultSQLiteType(genericType);
    }

    const sqliteMapping = this.typeMappingConfig.sqlite;
    return sqliteMapping[genericType.toLowerCase()] || 'TEXT';
  }

  private getDefaultSQLiteType(genericType: string): string {
    const defaultMapping: Record<string, string> = {
      string: 'TEXT', varchar: 'TEXT', char: 'TEXT', email: 'TEXT', url: 'TEXT', uuid: 'TEXT',
      integer: 'INTEGER', bigint: 'INTEGER', smallint: 'INTEGER', tinyint: 'INTEGER',
      decimal: 'REAL', numeric: 'REAL', float: 'REAL', double: 'REAL',
      boolean: 'INTEGER', timestamp: 'TEXT', datetime: 'TEXT', date: 'TEXT', time: 'TEXT',
      json: 'TEXT', array: 'TEXT', blob: 'BLOB', binary: 'BLOB'
    };
    return defaultMapping[genericType.toLowerCase()] || 'TEXT';
  }

  private processColumnDefinition(col: ColumnDefinition): ColumnDefinition {
    const processedCol: ColumnDefinition = { ...col };
    processedCol.type = this.convertToSQLiteType(col.type);
    
    const options: string[] = [];
    if (col.constraints) {
      const constraints = col.constraints.toUpperCase().split(' ');
      if (constraints.includes('PRIMARY')) {
        options.push('PRIMARY KEY');
        processedCol.primary_key = true;
      }
      if (constraints.includes('AUTO_INCREMENT') || constraints.includes('AUTOINCREMENT')) {
        if (processedCol.primary_key) options.push('AUTOINCREMENT');
        processedCol.auto_increment = true;
      }
      if (constraints.includes('NOT') && constraints.includes('NULL')) {
        options.push('NOT NULL');
        processedCol.nullable = false;
      }
      if (constraints.includes('UNIQUE')) {
        if (!processedCol.primary_key) options.push('UNIQUE');
        processedCol.unique = true;
      }
    }
    
    processedCol.option_key = options.join(' ').trim();
    return processedCol;
  }

  // Schema initialization
  async initializeFromSchema(schema: DatabaseSchema): Promise<void> {
    this.ensureConnected();

    if (schema.type_mapping) {
      this.setTypeMappingConfig(schema.type_mapping);
    }

    try {
      await this.execute('PRAGMA foreign_keys = ON');
    } catch {}

    await this.beginTransaction();

    try {
      for (const [tableName, tableConfig] of Object.entries(schema.schemas)) {
        const tableDefinition: TableDefinition = {
          name: tableName,
          cols: tableConfig.cols.map(col => this.processColumnDefinition(col)),
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

  private async createTableWithForeignKeys(table: TableDefinition): Promise<void> {
    const columnDefs = table.cols.map(col =>
      `${col.name} ${col.type} ${col.option_key || ''}`.trim()
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
    const sql = `CREATE TABLE IF NOT EXISTS ${table.name} (${allDefs.join(', ')})`;
    await this.execute(sql);
  }

  private async createIndexesForTable(tableName: string, indexes: IndexDefinition[]): Promise<void> {
    for (const index of indexes) {
      const columns = index.columns.join(', ');
      const isUnique = index.unique || false;
      const sql = `CREATE ${isUnique ? 'UNIQUE' : ''} INDEX IF NOT EXISTS ${index.name} ON ${tableName} (${columns})`;
      await this.execute(sql);
    }
  }

  // Transaction management
  async beginTransaction(): Promise<void> {
    if (this.inTransaction) {
      throw new Error('Transaction already in progress');
    }
    await this.execute('BEGIN TRANSACTION');
    this.inTransaction = true;
  }

  async commitTransaction(): Promise<void> {
    if (!this.inTransaction) {
      throw new Error('No transaction in progress');
    }
    await this.execute('COMMIT');
    this.inTransaction = false;
  }

  async rollbackTransaction(): Promise<void> {
    if (!this.inTransaction) {
      throw new Error('No transaction in progress');
    }
    await this.execute('ROLLBACK');
    this.inTransaction = false;
  }

  // Schema management
  async getSchemaVersion(): Promise<string> {
    try {
      const result = await this.getRst('SELECT version FROM _schema_info ORDER BY applied_at DESC LIMIT 1');
      return result.version || '0';
    } catch {
      return '0';
    }
  }

  async setSchemaVersion(version: string): Promise<void> {
    await this.execute(`CREATE TABLE IF NOT EXISTS _schema_info (
      version TEXT NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await this.execute(`INSERT INTO _schema_info (version) VALUES (?)`, [version]);
  }

  // CRUD Operations
  async insert(insertTable: QueryTable): Promise<SQLiteResult> {
    const validCols = insertTable.cols.filter(col => col.value !== undefined && col.value !== null);
    if (validCols.length === 0) {
      throw new Error('No valid columns to insert');
    }

    const columnNames = validCols.map(col => col.name).join(', ');
    const placeholders = validCols.map(() => '?').join(', ');
    const params = validCols.map(col =>
      typeof col.value === 'object' ? JSON.stringify(col.value) : col.value
    );
    
    const sql = `INSERT INTO ${insertTable.name} (${columnNames}) VALUES (${placeholders})`;
    return await this.execute(sql, params);
  }

  async update(updateTable: QueryTable): Promise<SQLiteResult> {
    const setCols = updateTable.cols.filter(col =>
      col.value !== undefined && !updateTable.wheres?.some(w => w.name === col.name)
    );
    
    if (setCols.length === 0) {
      throw new Error('No columns to update');
    }

    const setClause = setCols.map(col => `${col.name} = ?`).join(', ');
    const params = setCols.map(col =>
      typeof col.value === 'object' ? JSON.stringify(col.value) : col.value
    );

    let sql = `UPDATE ${updateTable.name} SET ${setClause}`;
    const whereClause = this.buildWhereClause(updateTable.wheres);
    
    if (!whereClause.sql) {
      throw new Error('WHERE clause is required for UPDATE operation');
    }
    
    sql += whereClause.sql;
    params.push(...whereClause.params);
    
    return await this.execute(sql, params);
  }

  async delete(deleteTable: QueryTable): Promise<SQLiteResult> {
    let sql = `DELETE FROM ${deleteTable.name}`;
    const whereClause = this.buildWhereClause(deleteTable.wheres);
    
    if (!whereClause.sql) {
      throw new Error('WHERE clause is required for DELETE operation');
    }
    
    sql += whereClause.sql;
    return await this.execute(sql, whereClause.params);
  }

  async select(selectTable: QueryTable): Promise<SQLiteRow> {
    const { sql, params } = this.buildSelectQuery(selectTable, ' LIMIT 1');
    const result = await this.execute(sql, params);
    return result.rows[0] || {};
  }

  async selectAll(selectTable: QueryTable): Promise<SQLiteRow[]> {
    const { sql, params } = this.buildSelectQuery(selectTable);
    const result = await this.execute(sql, params);
    return result.rows;
  }

  // Utility methods
  private buildSelectQuery(selectTable: QueryTable, suffix: string = ''): { sql: string; params: any[] } {
    const columns = selectTable.cols.length > 0
      ? selectTable.cols.map(col => col.name).join(', ')
      : '*';
    
    let sql = `SELECT ${columns} FROM ${selectTable.name}`;
    const whereClause = this.buildWhereClause(selectTable.wheres);
    sql += whereClause.sql;
    
    if (selectTable.orderbys?.length) {
      const orderBy = selectTable.orderbys
        .map(o => `${o.name} ${o.direction || 'ASC'}`)
        .join(', ');
      sql += ` ORDER BY ${orderBy}`;
    }
    
    if (selectTable.limitOffset) {
      if (selectTable.limitOffset.limit) sql += ` LIMIT ${selectTable.limitOffset.limit}`;
      if (selectTable.limitOffset.offset) sql += ` OFFSET ${selectTable.limitOffset.offset}`;
    }
    
    sql += suffix;
    return { sql, params: whereClause.params };
  }

  private buildWhereClause(wheres?: WhereClause[], clause: string = 'WHERE'): { sql: string; params: any[] } {
    if (!wheres || wheres.length === 0) {
      return { sql: '', params: [] };
    }
    
    const conditions: string[] = [];
    const params: any[] = [];
    
    for (const where of wheres) {
      const operator = where.operator || '=';
      conditions.push(`${where.name} ${operator} ?`);
      params.push(where.value);
    }
    
    return { sql: ` ${clause} ${conditions.join(' AND ')}`, params };
  }

  convertJsonToQueryTable(tableName: string, json: Record<string, any>, idFields: string[] = ['id']): QueryTable {
    const queryTable: QueryTable = { name: tableName, cols: [], wheres: [] };
    
    for (const [key, value] of Object.entries(json)) {
      queryTable.cols.push({ name: key, value });
      if (idFields.includes(key) && value !== undefined) {
        queryTable.wheres?.push({ name: key, value });
      }
    }
    
    return queryTable;
  }

  // Data Import functionality
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
      throw new Error('Database is not connected');
    }

    if (!options.data || options.data.length === 0) {
      result.executionTime = Date.now() - startTime;
      return result;
    }

    const tableInfo = await this.getTableInfo(options.tableName);
    if (tableInfo.length === 0) {
      throw new Error(`Table '${options.tableName}' does not exist`);
    }

    const columnMap = new Map(tableInfo.map(col => [col.name.toLowerCase(), col]));
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
              ? this.validateAndTransformRow(rowData, columnMap, options.tableName, skipAutoIncrementPK)
              : this.transformRowData(rowData, columnMap, skipAutoIncrementPK);

            if (options.updateOnConflict && options.conflictColumns) {
              await this.insertOrUpdate(options.tableName, processedData, options.conflictColumns);
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
      const isAutoIncrementPK = isPrimaryKey && columnInfo.type.toLowerCase().includes('integer');

      if (skipAutoIncrementPK && isAutoIncrementPK) {
        continue;
      }

      const value = this.findValueForColumn(rowData, columnName);

      if (isRequired && (value === null || value === undefined)) {
        throw new Error(`Required column '${columnName}' is missing or null in table '${tableName}'`);
      }

      if (value !== null && value !== undefined) {
        processedRow[columnName] = this.convertValueToColumnType(value, columnInfo.type);
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
      const isAutoIncrementPK = isPrimaryKey && columnInfo.type.toLowerCase().includes('integer');

      if (skipAutoIncrementPK && isAutoIncrementPK) {
        continue;
      }

      if (value !== null && value !== undefined) {
        processedRow[key] = this.convertValueToColumnType(value, columnInfo.type);
      }
    }

    return processedRow;
  }

  private findValueForColumn(rowData: Record<string, any>, columnName: string): any {
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
      if (type.includes('integer') || type.includes('int')) {
        if (typeof value === 'boolean') {
          return value ? 1 : 0;
        }
        const num = parseInt(String(value));
        return isNaN(num) ? null : num;
      }

      if (type.includes('real') || type.includes('float') || type.includes('decimal')) {
        const num = parseFloat(String(value));
        return isNaN(num) ? null : num;
      }

      if (type.includes('boolean')) {
        if (typeof value === 'boolean') {
          return value ? 1 : 0;
        }
        if (typeof value === 'string') {
          const lower = value.toLowerCase();
          return lower === 'true' || lower === '1' || lower === 'yes' ? 1 : 0;
        }
        return value ? 1 : 0;
      }

      if (type.includes('json')) {
        if (typeof value === 'object') {
          return JSON.stringify(value);
        }
        if (typeof value === 'string') {
          try {
            JSON.parse(value);
            return value;
          } catch {
            throw new Error(`Invalid JSON format for column type '${columnType}'`);
          }
        }
        return JSON.stringify(value);
      }

      if (type.includes('timestamp') || type.includes('datetime')) {
        if (value instanceof Date) {
          return value.toISOString();
        }
        if (typeof value === 'string' || typeof value === 'number') {
          const date = new Date(value);
          return isNaN(date.getTime()) ? value : date.toISOString();
        }
        return String(value);
      }

      return String(value);
    } catch (error) {
      throw new Error(`Cannot convert value '${value}' to column type '${columnType}'`);
    }
  }

  private async insertRow(tableName: string, data: Record<string, any>): Promise<void> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map(() => '?').join(', ');

    const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
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
    const updateColumns = allColumns.filter(col => !conflictColumns.includes(col));
    const whereColumns = conflictColumns;

    if (updateColumns.length === 0) {
      return;
    }

    const setClause = updateColumns.map(col => `${col} = ?`).join(', ');
    const whereClause = whereColumns.map(col => `${col} = ?`).join(' AND ');

    const updateValues = updateColumns.map(col => data[col]);
    const whereValues = whereColumns.map(col => data[col]);
    const allValues = [...updateValues, ...whereValues];

    const sql = `UPDATE ${tableName} SET ${setClause} WHERE ${whereClause}`;
    await this.execute(sql, allValues);
  }

  private isConflictError(error: any): boolean {
    return (
      error.code === 'SQLITE_CONSTRAINT_UNIQUE' ||
      error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY' ||
      (error.message && error.message.includes('UNIQUE constraint failed'))
    );
  }

  // Database info methods
  async getDatabaseInfo(): Promise<any> {
    const tables = await this.execute("SELECT name FROM sqlite_master WHERE type='table'");
    const version = await this.getSchemaVersion();
    
    return {
      name: this.dbPath,
      tables: tables.rows.map(t => t.name),
      isConnected: this.isConnected,
      version
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

  // Core execution methods
  private ensureConnected(): void {
    if (!this.isConnected || !this.connection) {
      throw new Error('Database is not connected');
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
export class DatabaseFactory {
  private static adapters: SQLiteAdapter[] = [];

  static registerAdapter(adapter: SQLiteAdapter): void {
    this.adapters.push(adapter);
  }

  static createDAO(dbPath: string, options?: { adapter?: SQLiteAdapter }): UniversalDAO {
    let adapter: SQLiteAdapter;

    if (options?.adapter) {
      adapter = options.adapter;
    } else {
      adapter = this.detectBestAdapter();
    }

    return new UniversalDAO(adapter, dbPath);
  }

  private static detectBestAdapter(): SQLiteAdapter {
    for (const adapter of this.adapters) {
      if (adapter.isSupported()) {
        return adapter;
      }
    }
    throw new Error('No supported SQLite adapter found');
  }

  static getEnvironmentInfo(): string {
    if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
      return 'React Native';
    }
    if (typeof globalThis.Bun !== 'undefined') return 'Bun';
    if (typeof globalThis.Deno !== 'undefined') return 'Deno';
    if (typeof window !== 'undefined') return 'Browser';
    if (typeof process !== 'undefined') return 'Node.js';
    return 'Unknown';
  }
}

```
```ts

// src/core/database-manager.ts
export class DatabaseManager {
  private connections: Map<string, UniversalDAO> = new Map();

  async getConnection(dbPath: string, options?: { adapter?: SQLiteAdapter }): Promise<UniversalDAO> {
    if (this.connections.has(dbPath)) {
      return this.connections.get(dbPath)!;
    }

    const dao = DatabaseFactory.createDAO(dbPath, options);
    await dao.connect();
    this.connections.set(dbPath, dao);
    return dao;
  }

  async closeConnection(dbPath: string): Promise<void> {
    const dao = this.connections.get(dbPath);
    if (dao) {
      await dao.disconnect();
      this.connections.delete(dbPath);
    }
  }

  async closeAllConnections(): Promise<void> {
    for (const [path, dao] of this.connections.entries()) {
      await dao.disconnect();
    }
    this.connections.clear();
  }

  listConnections(): string[] {
    return Array.from(this.connections.keys());
  }

  getConnectionCount(): number {
    return this.connections.size;
  }
}

```
```ts

// src/core/base-service.ts
export abstract class BaseService<T = any> {
  protected dao: UniversalDAO;
  protected tableName: string;

  constructor(dao: UniversalDAO, tableName: string) {
    this.dao = dao;
    this.tableName = tableName;
  }

  async create(data: Partial<T>): Promise<T> {
    const queryTable = this.dao.convertJsonToQueryTable(this.tableName, data);
    const result = await this.dao.insert(queryTable);
    
    if (result.lastInsertRowId) {
      return await this.findById(result.lastInsertRowId);
    }
    
    return data as T;
  }

  async update(id: any, data: Partial<T>): Promise<T> {
    const updateData = { ...data, id };
    const queryTable = this.dao.convertJsonToQueryTable(this.tableName, updateData, ['id']);
    await this.dao.update(queryTable);
    return await this.findById(id);
  }

  async delete(id: any): Promise<boolean> {
    const queryTable: QueryTable = {
      name: this.tableName,
      cols: [],
      wheres: [{ name: 'id', value: id }]
    };
    
    const result = await this.dao.delete(queryTable);
    return result.rowsAffected > 0;
  }

  async findById(id: any): Promise<T | null> {
    const queryTable: QueryTable = {
      name: this.tableName,
      cols: [],
      wheres: [{ name: 'id', value: id }]
    };
    
    const result = await this.dao.select(queryTable);
    return Object.keys(result).length > 0 ? result as T : null;
  }

  async findAll(options?: {
    where?: WhereClause[];
    orderBy?: OrderByClause[];
    limit?: number;
    offset?: number;
  }): Promise<T[]> {
    const queryTable: QueryTable = {
      name: this.tableName,
      cols: [],
      wheres: options?.where,
      orderbys: options?.orderBy,
      limitOffset: {
        limit: options?.limit,
        offset: options?.offset
      }
    };
    
    const results = await this.dao.selectAll(queryTable);
    return results as T[];
  }

  async count(where?: WhereClause[]): Promise<number> {
    const queryTable: QueryTable = {
      name: this.tableName,
      cols: [{ name: 'COUNT(*) as count' }],
      wheres: where
    };
    
    const result = await this.dao.select(queryTable);
    return result.count || 0;
  }

  async exists(id: any): Promise<boolean> {
    const item = await this.findById(id);
    return item !== null;
  }

  async truncate(): Promise<void> {
    await this.dao.execute(`DELETE FROM ${this.tableName}`);
    await this.dao.execute(`DELETE FROM sqlite_sequence WHERE name='${this.tableName}'`);
  }

  async bulkInsert(items: Partial<T>[]): Promise<ImportResult> {
    return await this.dao.importData({
      tableName: this.tableName,
      data: items as Record<string, any>[],
      batchSize: 1000,
      skipErrors: false,
      validateData: true
    });
  }

  protected buildWhereFromObject(obj: Partial<T>): WhereClause[] {
    return Object.entries(obj)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => ({ name: key, value }));
  }
}

```
```ts

// src/query/query-builder.ts
export class QueryBuilder {
  private tableName = '';
  private selectFields: string[] = ['*'];
  private joinClauses: string[] = [];
  private whereConditions: string[] = [];
  private groupByFields: string[] = [];
  private havingConditions: string[] = [];
  private orderByFields: string[] = [];
  private limitValue: number | null = null;
  private offsetValue: number | null = null;
  private params: any[] = [];

  static table(name: string): QueryBuilder {
    const builder = new QueryBuilder();
    builder.tableName = name;
    return builder;
  }

  select(fields: string | string[]): QueryBuilder {
    this.selectFields = Array.isArray(fields) ? fields : [fields];
    return this;
  }

  join(table: string, condition: string, type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' = 'INNER'): QueryBuilder {
    this.joinClauses.push(`${type} JOIN ${table} ON ${condition}`);
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

  where(condition: string, value?: any): QueryBuilder {
    this.whereConditions.push(condition);
    if (value !== undefined) {
      this.params.push(value);
    }
    return this;
  }

  whereEquals(field: string, value: any): QueryBuilder {
    return this.where(`${field} = ?`, value);
  }

  whereLike(field: string, value: string): QueryBuilder {
    return this.where(`${field} LIKE ?`, value);
  }

  whereIn(field: string, values: any[]): QueryBuilder {
    const placeholders = values.map(() => '?').join(', ');
    this.whereConditions.push(`${field} IN (${placeholders})`);
    this.params.push(...values);
    return this;
  }

  whereBetween(field: string, min: any, max: any): QueryBuilder {
    return this.where(`${field} BETWEEN ? AND ?`, min).where('', max);
  }

  whereNull(field: string): QueryBuilder {
    return this.where(`${field} IS NULL`);
  }

  whereNotNull(field: string): QueryBuilder {
    return this.where(`${field} IS NOT NULL`);
  }

  groupBy(fields: string | string[]): QueryBuilder {
    this.groupByFields = Array.isArray(fields) ? fields : [fields];
    return this;
  }

  having(condition: string, value?: any): QueryBuilder {
    this.havingConditions.push(condition);
    if (value !== undefined) {
      this.params.push(value);
    }
    return this;
  }

  orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): QueryBuilder {
    this.orderByFields.push(`${field} ${direction}`);
    return this;
  }

  orderByDesc(field: string): QueryBuilder {
    return this.orderBy(field, 'DESC');
  }

  limit(count: number): QueryBuilder {
    this.limitValue = count;
    return this;
  }

  offset(count: number): QueryBuilder {
    this.offsetValue = count;
    return this;
  }

  paginate(page: number, perPage: number): QueryBuilder {
    this.limitValue = perPage;
    this.offsetValue = (page - 1) * perPage;
    return this;
  }

  toSQL(): { sql: string; params: any[] } {
    let sql = `SELECT ${this.selectFields.join(', ')} FROM ${this.tableName}`;
    
    if (this.joinClauses.length > 0) {
      sql += ` ${this.joinClauses.join(' ')}`;
    }
    
    if (this.whereConditions.length > 0) {
      sql += ` WHERE ${this.whereConditions.join(' AND ')}`;
    }
    
    if (this.groupByFields.length > 0) {
      sql += ` GROUP BY ${this.groupByFields.join(', ')}`;
    }
    
    if (this.havingConditions.length > 0) {
      sql += ` HAVING ${this.havingConditions.join(' AND ')}`;
    }
    
    if (this.orderByFields.length > 0) {
      sql += ` ORDER BY ${this.orderByFields.join(', ')}`;
    }
    
    if (this.limitValue !== null) {
      sql += ` LIMIT ${this.limitValue}`;
    }
    
    if (this.offsetValue !== null) {
      sql += ` OFFSET ${this.offsetValue}`;
    }
    
    return { sql, params: this.params };
  }

  // Static helper methods for INSERT, UPDATE, DELETE
  static insert(tableName: string, data: Record<string, any>): { sql: string; params: any[] } {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map(() => '?').join(', ');
    
    return {
      sql: `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${placeholders})`,
      params: values
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
export class CSVImporter {
  private dao: UniversalDAO;

  constructor(dao: UniversalDAO) {
    this.dao = dao;
  }

  async importFromCSV(
    tableName: string,
    csvData: string,
    options: {
      delimiter?: string;
      hasHeader?: boolean;
      columnMappings?: Record<string, string>;
      transform?: Record<string, (value: any) => any>;
    } & Partial<ImportOptions> = {}
  ): Promise<ImportResult> {
    const delimiter = options.delimiter || ',';
    const hasHeader = options.hasHeader !== false;
    
    const lines = csvData.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      throw new Error('CSV data is empty');
    }
    
    let headers: string[] = [];
    let dataStartIndex = 0;
    
    if (hasHeader) {
      headers = lines[0]
        .split(delimiter)
        .map(h => h.trim().replace(/^["']|["']$/g, ''));
      dataStartIndex = 1;
    } else {
      const firstRowCols = lines[0].split(delimiter).length;
      headers = Array.from({ length: firstRowCols }, (_, i) => `column_${i + 1}`);
    }
    
    const data: Record<string, any>[] = [];
    for (let i = dataStartIndex; i < lines.length; i++) {
      const values = lines[i]
        .split(delimiter)
        .map(v => v.trim().replace(/^["']|["']$/g, ''));
      
      const row: Record<string, any> = {};
      headers.forEach((header, index) => {
        let value: any = values[index] || null;
        
        // Apply column mapping
        const mappedHeader = options.columnMappings?.[header] || header;
        
        // Apply transformation
        if (options.transform?.[mappedHeader]) {
          value = options.transform[mappedHeader](value);
        }
        
        row[mappedHeader] = value;
      });
      
      data.push(row);
    }
    
    return await this.dao.importData({
      tableName,
      data,
      ...options
    });
  }

  static parseCSVValue(value: string): any {
    if (value === '' || value === null) return null;
    
    // Try to parse as number
    if (/^-?\d+\.?\d*$/.test(value)) {
      return value.includes('.') ? parseFloat(value) : parseInt(value);
    }
    
    // Try to parse as boolean
    const lower = value.toLowerCase();
    if (lower === 'true' || lower === 'false') {
      return lower === 'true';
    }
    
    // Try to parse as date
    const date = new Date(value);
    if (!isNaN(date.getTime()) && value.match(/^\d{4}-\d{2}-\d{2}/)) {
      return date.toISOString();
    }
    
    return value;
  }
}

```
```ts

import { DatabaseManager, UniversalDAO, BaseService, DatabaseFactory } from './core';
import { QueryBuilder } from './query/query-builder';
import { SQLiteAdapter, SQLiteResult, DatabaseSchema } from './types';
import { MigrationManager, CSVImporter } from './utils';

// src/index.ts - Main exports
export { UniversalDAO, DatabaseFactory, DatabaseManager, BaseService } from './core';
export { QueryBuilder } from './query/query-builder';
export { MigrationManager, type Migration, CSVImporter } from './utils';
export { BaseAdapter } from './adapters/base-adapter';

// Re-export all types
export * from './types';

// Example unified interface class
export default class UniversalSQLite {
  private manager: DatabaseManager;
  private currentDAO: UniversalDAO | null = null;

  constructor() {
    this.manager = new DatabaseManager();
  }

  async connect(dbPath: string, options?: { adapter?: SQLiteAdapter }): Promise<void> {
    this.currentDAO = await this.manager.getConnection(dbPath, options);
  }

  async disconnect(): Promise<void> {
    if (this.currentDAO) {
      const connections = this.manager.listConnections();
      for (const conn of connections) {
        await this.manager.closeConnection(conn);
      }
      this.currentDAO = null;
    }
  }

  getDAO(): UniversalDAO {
    if (!this.currentDAO) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.currentDAO;
  }

  createService<T = any>(tableName: string): BaseService<T> {
    return new (class extends BaseService<T> { })(this.getDAO(), tableName);
  }

  query(): QueryBuilder {
    if (!this.currentDAO) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return new QueryBuilder();
  }

  async execute(sql: string, params?: any[]): Promise<SQLiteResult> {
    return await this.getDAO().execute(sql, params);
  }

  async initializeSchema(schema: DatabaseSchema): Promise<void> {
    await this.getDAO().initializeFromSchema(schema);
  }

  createMigrationManager(): MigrationManager {
    return new MigrationManager(this.getDAO());
  }

  createCSVImporter(): CSVImporter {
    return new CSVImporter(this.getDAO());
  }

  getEnvironment(): string {
    return DatabaseFactory.getEnvironmentInfo();
  }
}

```