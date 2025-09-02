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