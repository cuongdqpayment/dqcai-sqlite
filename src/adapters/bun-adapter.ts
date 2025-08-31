import { BaseAdapter } from './base-adapter';
import { SQLiteConnection, SQLiteResult, SQLiteRow } from '../types';

class BunSQLiteConnection implements SQLiteConnection {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  async execute(sql: string, params?: any[]): Promise<SQLiteResult> {
    try {
      if (sql.toLowerCase().trim().startsWith('select')) {
        const result = this.db.query(sql).all(params || []);
        return {
          rows: result,
          rowsAffected: 0
        };
      } else {
        const result = this.db.query(sql).run(params || []);
        return {
          rows: [],
          rowsAffected: result.changes || 0,
          lastInsertRowId: result.lastInsertRowid
        };
      }
    } catch (error) {
      throw new Error(`SQLite error: ${error}`);
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
    }
  }
}

export class BunAdapter extends BaseAdapter {
  isSupported(): boolean {
    try {
      return typeof Bun !== 'undefined' && Bun.version !== undefined;
    } catch {
      return false;
    }
  }

  async connect(path: string): Promise<SQLiteConnection> {
    try {
      const { Database } = require('bun:sqlite');
      const db = new Database(path);
      return new BunSQLiteConnection(db);
    } catch (error) {
      throw new Error(`Cannot connect to Bun database: ${error}`);
    }
  }
}