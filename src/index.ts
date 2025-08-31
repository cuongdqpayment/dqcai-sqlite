import { QueryBuilder } from './query-builder';
import { SQLiteManager } from './sqlite-manager';
import { SQLiteConnection } from './types';

export { SQLiteManager } from './sqlite-manager';
export { QueryBuilder } from './query-builder';
export * from './types';

// Example usage and main export
export default class UniversalSQLite {
  private manager: SQLiteManager;
  private connection: SQLiteConnection | null = null;

  constructor() {
    this.manager = new SQLiteManager();
  }

  async connect(path: string): Promise<void> {
    this.connection = await this.manager.connect(path);
  }

  async query(sql: string, params?: any[]) {
    if (!this.connection) {
      throw new Error('Database not connected');
    }
    return await this.connection.execute(sql, params);
  }

  async close(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
  }

  getEnvironment(): string {
    return this.manager.getEnvironmentInfo();
  }

  // Convenience methods
  async createTable(name: string, schema: Record<string, string>): Promise<void> {
    const fields = Object.entries(schema)
      .map(([field, type]) => `${field} ${type}`)
      .join(', ');
    
    await this.query(`CREATE TABLE IF NOT EXISTS ${name} (${fields})`);
  }

  async insert(table: string, data: Record<string, any>) {
    const sql = QueryBuilder.insert(table, data);
    return await this.query(sql, Object.values(data));
  }

  async select(table: string, where?: string, params?: any[]) {
    let sql = `SELECT * FROM ${table}`;
    if (where) {
      sql += ` WHERE ${where}`;
    }
    return await this.query(sql, params);
  }

  async update(table: string, data: Record<string, any>, where: string, whereParams?: any[]) {
    const sql = QueryBuilder.update(table, data, where);
    const params = [...Object.values(data), ...(whereParams || [])];
    return await this.query(sql, params);
  }

  async delete(table: string, where: string, params?: any[]) {
    const sql = QueryBuilder.delete(table, where);
    return await this.query(sql, params);
  }
}