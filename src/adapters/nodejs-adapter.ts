/* eslint-disable quotes */
// ./srr/adapters/NodeJSAdapter.ts
import { BaseAdapter } from "./base-adapter";

import { createModuleLogger, SQLiteModules } from "@/logger";
const logger = createModuleLogger(SQLiteModules.NODEJS_ADAPTER);

// Định nghĩa types để tránh lỗi TypeScript
type BetterSqlite3Database = any;
type BetterSqlite3Constructor = any;

export class NodeJSAdapter extends BaseAdapter {
  private Database: BetterSqlite3Constructor | null = null;

  async isSupported(): Promise<boolean> {
    try {
      // Kiểm tra xem có đang chạy trong môi trường Node.js không
      return (
        typeof process !== "undefined" &&
        process.versions != null &&
        process.versions.node != null
      );
    } catch (error) {
      logger.debug("Node.js environment not detected", error);
      return false;
    }
  }

  private async loadBetterSqlite3(): Promise<BetterSqlite3Constructor> {
    if (this.Database) {
      return this.Database;
    }

    try {
      // Dynamic import better-sqlite3 module
      const BetterSqlite3 = (await import("better-sqlite3")).default;

      this.Database = BetterSqlite3;
      return BetterSqlite3;
    } catch (error) {
      logger.error("Failed to load better-sqlite3", error);
      throw new Error(
        "better-sqlite3 is not available in this environment"
      );
    }
  }

  async connect(dbPath: string): Promise<any> {
    try {
      // Kiểm tra môi trường trước
      const supported = await this.isSupported();
      if (!supported) {
        throw new Error("Node.js environment is not supported");
      }

      // Load better-sqlite3 module động
      const Database = await this.loadBetterSqlite3();

      // Tạo kết nối đến database
      const database = new Database(dbPath, {
        // verbose: console.log, // Uncomment để debug
      });

      // Cấu hình pragma cho hiệu suất tốt hơn
      database.pragma("journal_mode = WAL");
      database.pragma("synchronous = NORMAL");

      logger.debug(`Connected to database: ${dbPath}`, database);

      return new NodeJSConnection(database);
    } catch (error) {
      logger.error(`Failed to connect to database: ${dbPath}`, error);
      throw new Error(`Failed to connect to database: ${error}`);
    }
  }
}

class NodeJSConnection {
  constructor(private db: BetterSqlite3Database) {}

  async execute(sql: string, params: any[] = []): Promise<any> {
    try {
      const isSelect = sql.trim().toUpperCase().startsWith("SELECT");

      if (isSelect) {
        // Xử lý câu lệnh SELECT
        const stmt = this.db.prepare(sql);
        const rows = stmt.all(...params);

        logger.debug(`SQL SELECT result:`, rows);

        return {
          rows: rows || [],
          rowsAffected: 0,
        };
      } else {
        // Xử lý các câu lệnh INSERT, UPDATE, DELETE, CREATE, etc.
        const stmt = this.db.prepare(sql);
        const result = stmt.run(...params);

        logger.debug(`SQL execution result:`, result);

        return {
          rows: [],
          rowsAffected: result.changes || 0,
          lastInsertRowId: result.lastInsertRowid || undefined,
        };
      }
    } catch (error) {
      logger.error(`SQL execution failed`, error);
      throw error;
    }
  }

  async close(): Promise<void> {
    try {
      this.db.close();
      logger.debug("Database connection closed");
    } catch (error) {
      logger.error(`Close Error:`, error);
      throw error;
    }
  }

  // Phương thức bổ sung để thực hiện transaction
  async transaction(fn: (tx: any) => Promise<void>): Promise<void> {
    const transaction = this.db.transaction(async () => {
      await fn(new NodeJSTransaction(this.db));
    });

    try {
      transaction();
      logger.debug("Transaction completed successfully");
    } catch (error) {
      logger.error("Transaction failed", error);
      throw error;
    }
  }
}

// Class hỗ trợ cho transaction
class NodeJSTransaction {
  constructor(private db: BetterSqlite3Database) {}

  async executeSql(sql: string, params: any[] = []): Promise<any> {
    try {
      const isSelect = sql.trim().toUpperCase().startsWith("SELECT");

      if (isSelect) {
        const stmt = this.db.prepare(sql);
        const rows = stmt.all(...params);

        return {
          rows: rows || [],
          rowsAffected: 0,
        };
      } else {
        const stmt = this.db.prepare(sql);
        const result = stmt.run(...params);

        return {
          rows: [],
          rowsAffected: result.changes || 0,
          lastInsertRowId: result.lastInsertRowid || undefined,
        };
      }
    } catch (error) {
      logger.error("Transaction SQL execution failed", error);
      throw error;
    }
  }
}