// src/logger/logger-config.ts - Alternative solution using Proxy pattern

import {
  BaseModule,
  LoggerConfigBuilder,
  CommonModules,
  CommonLoggerConfig,
  createModuleLogger,
} from "@dqcai/logger";

const SQLiteModules = {
  ...CommonModules,
  DATABASE_MANAGER: "DatabaseManager",
  DATABASE_FACTORY: "DatabaseFactory",
  UNIVERSAL_DAO: "UniversalDAO",
  BASE_SERVICE: "BaseService",
  SERVICE_MANAGER: "ServiceManager",
  QUERY_BUILDER: "QueryBuilder",
  BASE_ADAPTER: "BaseAdapter",
  UNIVERSAL_SQLITE: "UniversalSQLite",
  TRANSACTION: "Transaction",
  CONNECTION: "Connection",
};

const config = new LoggerConfigBuilder()
  .setEnabled(true)
  .setDefaultLevel("warn")
  .build();
// cập nhập cấu hình trong dự án này
CommonLoggerConfig.updateConfiguration(config);
// nếu nhúng vào các dự án khác thì cập nhập cấu hình mới là được
// gọi chung instance
export { BaseModule, createModuleLogger, SQLiteModules, CommonLoggerConfig };
