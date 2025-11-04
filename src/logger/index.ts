// in @dqcai/sqlite library
// ./src/logger/index.ts

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
  NODEJS_ADAPTER: "NodeJSAdapter",
  REACTNATIVE_ADAPTER: "RN-Adapter",
  UNIVERSAL_SQLITE: "UniversalSQLite",
  TRANSACTION: "Transaction",
  CONNECTION: "Connection",
};


// ✅ Helper function để config logger
export function configureSQLiteLogger(
  enabled: boolean = true,
  defaultLevel: 'trace' | 'debug' | 'info' | 'warn' | 'error' = 'warn'
) {
  // console.log(`🔧 [SQLite] Configuring logger: enabled=${enabled}, level=${defaultLevel}`);
  
  const config = new LoggerConfigBuilder()
    .setEnabled(enabled)
    .setDefaultLevel(defaultLevel)
    .build();
    
  CommonLoggerConfig.updateConfiguration(config);
  
  // console.log("✅ [SQLite] Logger configured:", CommonLoggerConfig.getCurrentConfig());
}

// khởi tạo default config cho thư viện
configureSQLiteLogger(true, 'warn');

// ✅ Export utilities only
export { BaseModule, createModuleLogger, SQLiteModules, CommonLoggerConfig };