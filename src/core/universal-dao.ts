// src/core/universal-dao.ts
import { ColumnDefinition, DatabaseSchema, ImportOptions, ImportResult, IndexDefinition, QueryTable, SQLiteAdapter, SQLiteConnection, SQLiteResult, SQLiteRow, TableDefinition, TypeMappingConfig, WhereClause } from '../types';
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