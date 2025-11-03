/* eslint-disable quotes */
// adapters/ReactNativeAdapter.ts
import { BaseAdapter } from "./base-adapter";
import { createModuleLogger, SQLiteModules } from "../logger";
const logger = createModuleLogger(SQLiteModules.BASE_ADAPTER);

// Định nghĩa types để tránh lỗi TypeScript
type SQLiteDatabase = any;
type SQLiteModule = any;
type PlatformModule = any;

export class ReactNativeAdapter extends BaseAdapter {
  private SQLite: SQLiteModule | null = null;
  private Platform: PlatformModule | null = null;

  async isSupported(): Promise<boolean> {
    try {
      // Load Platform module động
      const { Platform } = await import("react-native");
      this.Platform = Platform;

      // Kiểm tra xem có đang chạy trong môi trường React Native không
      return Platform.OS === "ios" || Platform.OS === "android";
    } catch (error) {
      logger.debug("React Native environment not detected", error);
      return false;
    }
  }

  private async loadSQLite(): Promise<SQLiteModule> {
    if (this.SQLite) {
      return this.SQLite;
    }

    try {
      // Dynamic import SQLite module
      const SQLiteModule = (await import("react-native-sqlite-storage"))
        .default;

      // Cấu hình SQLite
      SQLiteModule.DEBUG(false);
      SQLiteModule.enablePromise(true);

      this.SQLite = SQLiteModule;
      return SQLiteModule;
    } catch (error) {
      logger.error("Failed to load react-native-sqlite-storage", error);
      throw new Error(
        "react-native-sqlite-storage is not available in this environment"
      );
    }
  }

  async connect(dbPath: string): Promise<any> {
    try {
      // Kiểm tra môi trường trước
      const supported = await this.isSupported();
      if (!supported) {
        throw new Error("React Native environment is not supported");
      }

      // Load SQLite module động
      const SQLite = await this.loadSQLite();

      // Tạo kết nối đến database
      // React Native SQLite sẽ tự động tạo file database nếu chưa tồn tại
      const database = await SQLite.openDatabase({
        name: dbPath,
        location: "default", // Sử dụng vị trí mặc định
      });

      logger.debug(`Connected to database: ${dbPath}`, database);

      return new ReactNativeConnection(database);
    } catch (error) {
      logger.error(`Failed to connect to database: ${dbPath}`, error);
      throw new Error(`Failed to connect to database: ${error}`);
    }
  }
}

class ReactNativeConnection {
  constructor(private db: SQLiteDatabase) {}

  async execute(sql: string, params: any[] = []): Promise<any> {
    try {
      const isSelect = sql.trim().toUpperCase().startsWith("SELECT");

      if (isSelect) {
        // Xử lý câu lệnh SELECT
        const results = await this.db.executeSql(sql, params);
        const rows: any[] = [];

        if (results && results.length > 0) {
          const result = results[0];
          logger.debug(`SQL SELECT result:`, result);
          // Chuyển đổi ResultSet thành array
          for (let i = 0; i < result.rows.length; i++) {
            rows.push(result.rows.item(i));
          }
          logger.debug(`SQL SELECT rows:`, rows);
        }

        return {
          rows: rows,
          rowsAffected: 0,
        };
      } else {
        // Xử lý các câu lệnh INSERT, UPDATE, DELETE, CREATE, etc.
        const results = await this.db.executeSql(sql, params);

        if (results && results.length > 0) {
          const result = results[0];
          logger.debug(`SQL execution result:`, result);
          return {
            rows: result.rows?.raw() || [],
            rowsAffected: result.rowsAffected || 0,
            lastInsertRowId: result.insertId || undefined,
          };
        }

        return {
          rows: [],
          rowsAffected: 0,
        };
      }
    } catch (error) {
      logger.error(`SQL execution failed`, error);
      throw error;
    }
  }

  async close(): Promise<void> {
    try {
      await this.db.close();
    } catch (error) {
      logger.error(`Close Error:`, error);
      throw error;
    }
  }

  // Phương thức bổ sung để thực hiện transaction
  async transaction(fn: (tx: any) => Promise<void>): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        async (tx: any) => {
          try {
            await fn(new ReactNativeTransaction(tx));
            resolve();
          } catch (error) {
            reject(error);
          }
        },
        (error: any) => {
          reject(error);
        }
      );
    });
  }
}

// Class hỗ trợ cho transaction
class ReactNativeTransaction {
  constructor(private tx: any) {}

  async executeSql(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.tx.executeSql(
        sql,
        params,
        (tx: any, results: any) => {
          const isSelect = sql.trim().toUpperCase().startsWith("SELECT");

          if (isSelect) {
            const rows: any[] = [];
            for (let i = 0; i < results.rows.length; i++) {
              rows.push(results.rows.item(i));
            }
            resolve({
              rows: rows,
              rowsAffected: 0,
            });
          } else {
            resolve({
              rows: [],
              rowsAffected: results.rowsAffected || 0,
              lastInsertRowId: results.insertId || undefined,
            });
          }
        },
        (tx: any, error: any) => {
          reject(error);
        }
      );
    });
  }
}
