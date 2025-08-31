import { BaseAdapter } from './base-adapter';
import { SQLiteConnection, SQLiteResult, SQLiteRow } from '../types';

class NodeSQLiteConnection implements SQLiteConnection {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  async execute(sql: string, params?: any[]): Promise<SQLiteResult> {
    return new Promise((resolve, reject) => {
      const sanitizedSQL = this.bindParameters(sql, params);
      
      if (sql.toLowerCase().trim().startsWith('select')) {
        this.db.all(sanitizedSQL, (err: any, rows: SQLiteRow[]) => {
          if (err) {
            reject(new Error(`SQLite error: ${err.message}`));
          } else {
            resolve({
              rows: rows || [],
              rowsAffected: 0
            });
          }
        });
      } else {
        this.db.run(sanitizedSQL, function(this: any, err: any) {
          if (err) {
            reject(new Error(`SQLite error: ${err.message}`));
          } else {
            resolve({
              rows: [],
              rowsAffected: this.changes || 0,
              lastInsertRowId: this.lastID
            });
          }
        });
      }
    });
  }

  private bindParameters(sql: string, params?: any[]): string {
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

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err: any) => {
        if (err) {
          reject(new Error(`Error closing database: ${err.message}`));
        } else {
          resolve();
        }
      });
    });
  }
}

export class NodeAdapter extends BaseAdapter {
  isSupported(): boolean {
    try {
      return typeof require !== 'undefined' && require('sqlite3') !== undefined;
    } catch {
      return false;
    }
  }

  async connect(path: string): Promise<SQLiteConnection> {
    return new Promise((resolve, reject) => {
      try {
        const sqlite3 = require('sqlite3').verbose();
        const db = new sqlite3.Database(path, (err: any) => {
          if (err) {
            reject(new Error(`Cannot connect to database: ${err.message}`));
          } else {
            resolve(new NodeSQLiteConnection(db));
          }
        });
      } catch (error) {
        reject(new Error(`SQLite3 module not available: ${error}`));
      }
    });
  }
}