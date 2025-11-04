// src/adapters/base-adapter.ts
import { SQLiteAdapter, SQLiteConnection } from '@/types';


export abstract class BaseAdapter implements SQLiteAdapter {
  abstract connect(path: string): Promise<SQLiteConnection>;
  abstract isSupported(): Promise<boolean>;

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