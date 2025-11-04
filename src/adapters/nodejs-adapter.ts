/* eslint-disable quotes */
// ./src/adapters/nodejs-adapter.ts
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
      throw new Error("better-sqlite3 is not available in this environment");
    }
  }

  async connect(dbPath: string): Promise<any> {
    logger.trace(`Connecting to database: ${dbPath}`);
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

/**
 * Convert params để tương thích với better-sqlite3
 */
const normalizeParams = (params: any[]): any[] => {
  return params.map((param) => {
    // Convert boolean → number
    if (typeof param === "boolean") {
      return param ? 1 : 0;
    }

    // Convert undefined → null
    if (param === undefined) {
      return null;
    }

    // Convert Date → ISO string
    if (param instanceof Date) {
      return param.toISOString();
    }

    // Reject objects/arrays
    if (typeof param === "object" && param !== null) {
      throw new Error(`Cannot bind object/array: ${JSON.stringify(param)}`);
    }

    return param;
  });
};

class NodeJSConnection {
  constructor(private db: BetterSqlite3Database) {}

  /**
   * Phân loại loại SQL query
   */
  private getQueryType(sql: string): "SELECT" | "PRAGMA" | "MODIFY" {
    const normalizedSql = sql.trim().toUpperCase();

    if (normalizedSql.startsWith("SELECT")) {
      return "SELECT";
    }

    if (normalizedSql.startsWith("PRAGMA")) {
      return "PRAGMA";
    }

    // INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, etc.
    return "MODIFY";
  }

  async execute(sql: string, params: any[] = []): Promise<any> {
    logger.debug(`NodeJSConnection.execute() sql:`, sql);
    logger.debug(`NodeJSConnection.execute() params:`, params);

    try {
      // ✅ Normalize params trước khi execute
      const normalizedParams = normalizeParams(params);
      logger.debug(`Normalized params:`, normalizedParams);

      const queryType = this.getQueryType(sql);
      const stmt = this.db.prepare(sql);

      switch (queryType) {
        case "SELECT": {
          // ✅ Xử lý câu lệnh SELECT
          const rows = stmt.all(...normalizedParams);
          logger.debug(`SQL SELECT result:`, rows);

          return {
            rows: rows || [],
            rowsAffected: 0,
          };
        }

        case "PRAGMA": {
          // ✅ ĐÚNG - Phân biệt PRAGMA có trả về dữ liệu hay không
          try {
            // Thử get() trước cho PRAGMA trả về 1 dòng, hoặc all() cho nhiều dòng
            const rows = stmt.all(...normalizedParams);
            logger.debug(`PRAGMA result:`, rows);

            return {
              rows: rows || [],
              rowsAffected: 0,
              lastInsertRowId: 0,
            };
          } catch (pragmaError) {
            // Nếu lỗi "does not return data", dùng run()
            if (
              (pragmaError as any).message?.includes("does not return data")
            ) {
              const result = stmt.run(...normalizedParams);
              logger.debug(`PRAGMA execution result:`, result);

              return {
                rows: [],
                rowsAffected: 0,
                lastInsertRowId: 0,
              };
            }
            throw pragmaError;
          }
        }

        case "MODIFY":
        default: {
          // ✅ Xử lý các câu lệnh INSERT, UPDATE, DELETE, CREATE, etc.
          const result = stmt.run(...normalizedParams);
          logger.debug(`SQL execution result:`, {
            changes: result.changes,
            lastInsertRowid: result.lastInsertRowid,
          });

          return {
            rows: [],
            rowsAffected: result.changes || 0,
            lastInsertRowId: result.lastInsertRowid || undefined,
          };
        }
      }
    } catch (error) {
      // ✅ CHỈ log khi KHÔNG phải lỗi _schema_info
      if (
        !(error as any).message ||
        (error as any).message.indexOf("_schema_info") === -1
      ) {
        logger.error(`SQL execution failed`, {
          code: (error as any).code,
          message: (error as any).message,
        });
      }
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

  /**
   * Phân loại loại SQL query
   */
  private getQueryType(sql: string): "SELECT" | "PRAGMA" | "MODIFY" {
    const normalizedSql = sql.trim().toUpperCase();

    if (normalizedSql.startsWith("SELECT")) {
      return "SELECT";
    }

    if (normalizedSql.startsWith("PRAGMA")) {
      return "PRAGMA";
    }

    return "MODIFY";
  }

  async executeSql(sql: string, params: any[] = []): Promise<any> {
    try {
      // ✅ Normalize params trước khi execute
      const normalizedParams = normalizeParams(params);
      logger.debug(`Normalized params:`, normalizedParams);

      const queryType = this.getQueryType(sql);
      const stmt = this.db.prepare(sql);

      switch (queryType) {
        case "SELECT": {
          const rows = stmt.all(...normalizedParams);
          return {
            rows: rows || [],
            rowsAffected: 0,
          };
        }

        case "PRAGMA": {
          // ✅ ĐÚNG - Áp dụng logic tương tự
          try {
            const rows = stmt.all(...normalizedParams);
            return {
              rows: rows || [],
              rowsAffected: 0,
              lastInsertRowId: 0,
            };
          } catch (pragmaError) {
            if (
              (pragmaError as any).message?.includes("does not return data")
            ) {
              const result = stmt.run(...normalizedParams);
              return {
                rows: [],
                rowsAffected: 0,
                lastInsertRowId: 0,
              };
            }
            throw pragmaError;
          }
        }

        case "MODIFY":
        default: {
          const result = stmt.run(...normalizedParams);
          return {
            rows: [],
            rowsAffected: result.changes || 0,
            lastInsertRowId: result.lastInsertRowid || undefined,
          };
        }
      }
    } catch (error) {
      logger.error("Transaction SQL execution failed", error);
      throw error;
    }
  }
}
