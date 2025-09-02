import { SQLiteAdapter } from "../types";
import { UniversalDAO } from "./universal-dao";

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