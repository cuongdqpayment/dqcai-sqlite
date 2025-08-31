import { BaseAdapter } from './base-adapter';
import { SQLiteConnection, SQLiteResult, SQLiteRow } from '../types';

// Type declarations for sql.js in browser
declare global {
  interface Window {
    SQL?: any;
    initSqlJs?: (config?: any) => Promise<any>;
  }
}

class BrowserSQLiteConnection implements SQLiteConnection {
  private worker: Worker | null = null;
  private db: any = null;
  private adapter: BrowserAdapter;

  constructor(db: any, adapter: BrowserAdapter, worker?: Worker) {
    this.db = db;
    this.adapter = adapter;
    this.worker = worker || null;
  }

  async execute(sql: string, params?: any[]): Promise<SQLiteResult> {
    if (!this.db) {
      throw new Error('Database connection not available');
    }

    try {
      const boundSQL = this.adapter.bindParameters(sql, params);
      
      if (sql.toLowerCase().trim().startsWith('select')) {
        const result = this.db.exec(boundSQL);
        const rows: SQLiteRow[] = [];
        
        if (result.length > 0 && result[0].values) {
          const columns = result[0].columns;
          const values = result[0].values;
          
          for (const row of values) {
            const rowObj: SQLiteRow = {};
            columns.forEach((col: string, index: number) => {
              rowObj[col] = row[index];
            });
            rows.push(rowObj);
          }
        }
        
        return {
          rows,
          rowsAffected: 0
        };
      } else {
        this.db.exec(boundSQL);
        return {
          rows: [],
          rowsAffected: 1 // Browser doesn't provide exact count
        };
      }
    } catch (error) {
      throw new Error(`SQLite error: ${error}`);
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

export class BrowserAdapter extends BaseAdapter {
  private sqlJs: any = null;

  isSupported(): boolean {
    return typeof window !== 'undefined' && 
           (typeof window.SQL !== 'undefined' || this.sqlJs !== null);
  }

  // Make bindParameters public so BrowserSQLiteConnection can access it
  public bindParameters(sql: string, params?: any[]): string {
    return super.bindParameters(sql, params);
  }

  async connect(path: string): Promise<SQLiteConnection> {
    try {
      // Try to load sql.js if not already loaded
      if (!this.sqlJs) {
        if (typeof window.SQL !== 'undefined') {
          this.sqlJs = window.SQL;
        } else {
          // Try to load from CDN
          await this.loadSqlJs();
        }
      }

      let db;
      
      if (path === ':memory:') {
        // In-memory database
        db = new this.sqlJs.Database();
      } else {
        // Try to load from file
        const data = await this.loadDatabaseFile(path);
        db = new this.sqlJs.Database(data);
      }

      return new BrowserSQLiteConnection(db, this);
    } catch (error) {
      throw new Error(`Cannot connect to browser database: ${error}`);
    }
  }

  private async loadSqlJs(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js';
      script.onload = async () => {
        try {
          if (window.initSqlJs) {
            this.sqlJs = await window.initSqlJs({
              locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
            });
          }
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      script.onerror = () => reject(new Error('Failed to load sql.js'));
      document.head.appendChild(script);
    });
  }

  private async loadDatabaseFile(path: string): Promise<Uint8Array | undefined> {
    // Try to fetch as a file
    try {
      const response = await fetch(path);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        return new Uint8Array(arrayBuffer);
      }
    } catch {
      // File doesn't exist, return undefined for new database
    }

    return undefined;
  }
}