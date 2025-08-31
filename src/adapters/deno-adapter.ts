import { BaseAdapter } from './base-adapter';
import { SQLiteConnection, SQLiteResult, SQLiteRow } from '../types';

class DenoSQLiteConnection implements SQLiteConnection {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  async execute(sql: string, params?: any[]): Promise<SQLiteResult> {
    try {
      const boundSQL = this.bindParameters(sql, params);
      
      if (sql.toLowerCase().trim().startsWith('select')) {
        const result = this.db.queryEntries(boundSQL);
        return {
          rows: result,
          rowsAffected: 0
        };
      } else {
        const result = this.db.query(boundSQL);
        return {
          rows: [],
          rowsAffected: result.length || 1
        };
      }
    } catch (error) {
      throw new Error(`SQLite error: ${error}`);
    }
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
    if (this.db) {
      this.db.close();
    }
  }
}

export class DenoAdapter extends BaseAdapter {
  isSupported(): boolean {
    try {
      return typeof Deno !== 'undefined' && Deno.env !== undefined;
    } catch {
      return false;
    }
  }

  async connect(path: string): Promise<SQLiteConnection> {
    try {
      // @ts-ignore - Bỏ qua type checking cho dòng này
      const { DB } = await import('https://deno.land/x/sqlite@v3.8.0/mod.ts');
      const db = new DB(path);
      return new DenoSQLiteConnection(db);
    } catch (error) {
      throw new Error(`Cannot connect to Deno database: ${error}`);
    }
  }
}