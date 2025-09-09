// src/logger/logger-config.ts - Logger configuration for UniversalSQLite
import {
  BaseModule,
  LoggerConfigBuilder,
  createLogger,
  UniversalLogger,
} from "@dqcai/logger";

// export lại module thư viện cho các module con sử dụng
export { BaseModule };

/**
 * Predefined modules for UniversalSQLite library
 */
export enum SQLiteModules {
  // Core modules
  DATABASE_MANAGER = "DatabaseManager",
  DATABASE_FACTORY = "DatabaseFactory",
  UNIVERSAL_DAO = "UniversalDAO",
  BASE_SERVICE = "BaseService",
  SERVICE_MANAGER = "ServiceManager",

  // Query modules
  QUERY_BUILDER = "QueryBuilder",

  // Adapter modules
  BASE_ADAPTER = "BaseAdapter",

  // Main interface
  UNIVERSAL_SQLITE = "UniversalSQLite",

  // Transaction & Connection
  TRANSACTION = "Transaction",
  CONNECTION = "Connection",
}

/**
 * Default logger configuration for UniversalSQLite
 */
export class SQLiteLoggerConfig {
  private static instance: UniversalLogger | null = null;
  private static currentConfig: any = null;

  /**
   * Create default logger configuration
   */
  static createDefaultConfig() {
    return (
      new LoggerConfigBuilder()
        .setEnabled(false) // Default: disabled for production
        .setDefaultLevel("trace") // Default level

        // Core modules - usually important
        .addModule(
          SQLiteModules.UNIVERSAL_SQLITE,
          true,
          ["warn", "error"],
          ["console"]
        )
        .addModule(
          SQLiteModules.DATABASE_MANAGER,
          true,
          ["debug", "info", "warn", "error"],
          ["console"]
        )
        .addModule(
          SQLiteModules.DATABASE_FACTORY,
          true,
          ["debug", "info", "warn", "error"],
          ["console"]
        )

        // DAO and Services - detailed debugging
        .addModule(
          SQLiteModules.UNIVERSAL_DAO,
          false,
          ["warn", "error"],
          ["console"]
        )
        .addModule(
          SQLiteModules.BASE_SERVICE,
          false,
          ["trace", "debug", "info", "warn", "error"],
          ["console"]
        )
        .addModule(
          SQLiteModules.SERVICE_MANAGER,
          false,
          ["info", "warn", "error"],
          ["console"]
        )

        // Query building - can be verbose
        .addModule(
          SQLiteModules.QUERY_BUILDER,
          false,
          ["debug", "info", "warn", "error"],
          ["console"]
        )

        // Adapters - platform specific
        .addModule(
          SQLiteModules.BASE_ADAPTER,
          false,
          ["debug", "info", "warn", "error"],
          ["console"]
        )

        .build()
    );
  }

  /**
   * Initialize logger with default or custom configuration
   */
  static initialize(customConfig?: any): UniversalLogger {
    const config = customConfig || SQLiteLoggerConfig.createDefaultConfig();
    SQLiteLoggerConfig.currentConfig = config;
    if (
      config.enabled &&
      (config.defaultLevel === "trace" || config.defaultLevel === "debug")
    ) {
      console.debug(
        "SQLiteLoggerConfig.initialize()",
        JSON.stringify(config, null, 2)
      );
    }
    SQLiteLoggerConfig.instance = createLogger(config);
    return SQLiteLoggerConfig.instance;
  }

  /**
   * Get current logger instance
   */
  static getInstance(): UniversalLogger {
    if (
      SQLiteLoggerConfig.currentConfig &&
      SQLiteLoggerConfig.currentConfig.enabled &&
      (SQLiteLoggerConfig.currentConfig.defaultLevel === "trace" ||
        SQLiteLoggerConfig.currentConfig.defaultLevel === "debug")
    ) {
      console.debug(
        "SQLiteLoggerConfig.getInstance()",
        JSON.stringify(SQLiteLoggerConfig.currentConfig, null, 2)
      );
    }
    if (!SQLiteLoggerConfig.instance) {
      return SQLiteLoggerConfig.initialize();
    }
    return SQLiteLoggerConfig.instance;
  }

  /**
   * Update logger configuration at runtime
   */
  static updateConfiguration(newConfig: any): void {
    if (
      newConfig &&
      newConfig.enabled &&
      (newConfig.defaultLevel === "trace" || newConfig.defaultLevel === "debug")
    ) {
      console.debug(
        "SQLiteLoggerConfig.updateConfiguration()",
        JSON.stringify(newConfig, null, 2)
      );
    }
    SQLiteLoggerConfig.currentConfig = newConfig;
    SQLiteLoggerConfig.instance = createLogger(newConfig);
    if (
      newConfig &&
      newConfig.enabled &&
      (newConfig.defaultLevel === "trace" ||
        newConfig.defaultLevel === "debug" ||
        newConfig.defaultLevel === "info")
    ) {
      console.log(
        "SQLiteLoggerConfig.updateConfiguration()",
        JSON.stringify(SQLiteLoggerConfig.instance, null, 2)
      );
    }
  }

  /**
   * Enable/disable logging globally
   */
  static setEnabled(enabled: boolean): void {
    if (SQLiteLoggerConfig.currentConfig) {
      SQLiteLoggerConfig.currentConfig.enabled = enabled;
      SQLiteLoggerConfig.updateConfiguration(SQLiteLoggerConfig.currentConfig);
    }
  }

  /**
   * Enable specific module
   */
  static enableModule(
    moduleName: string,
    levels?: string[],
    appenders?: string[]
  ): void {
    if (
      SQLiteLoggerConfig.currentConfig &&
      SQLiteLoggerConfig.currentConfig.modules
    ) {
      SQLiteLoggerConfig.currentConfig.modules[moduleName] = {
        enabled: true,
        levels: levels || ["debug", "info", "warn", "error"],
        appenders: appenders || ["console"],
      };
      SQLiteLoggerConfig.updateConfiguration(SQLiteLoggerConfig.currentConfig);
    }
  }

  /**
   * Disable specific module
   */
  static disableModule(moduleName: string): void {
    if (
      SQLiteLoggerConfig.currentConfig &&
      SQLiteLoggerConfig.currentConfig.modules
    ) {
      SQLiteLoggerConfig.currentConfig.modules[moduleName] = {
        enabled: false,
      };
      SQLiteLoggerConfig.updateConfiguration(SQLiteLoggerConfig.currentConfig);
    }
  }

  /**
   * Create debug-only configuration
   */
  static createDebugConfig() {
    return (
      new LoggerConfigBuilder()
        .setEnabled(true)
        .setDefaultLevel("trace")

        // Enable all modules for debugging
        .addModule(
          SQLiteModules.UNIVERSAL_SQLITE,
          true,
          ["trace", "debug", "info", "warn", "error"],
          ["console"]
        )
        .addModule(
          SQLiteModules.DATABASE_MANAGER,
          true,
          ["trace", "debug", "info", "warn", "error"],
          ["console"]
        )
        .addModule(
          SQLiteModules.DATABASE_FACTORY,
          true,
          ["trace", "debug", "info", "warn", "error"],
          ["console"]
        )
        .addModule(
          SQLiteModules.UNIVERSAL_DAO,
          true,
          ["trace", "debug", "info", "warn", "error"],
          ["console"]
        )
        .addModule(
          SQLiteModules.BASE_SERVICE,
          true,
          ["trace", "debug", "info", "warn", "error"],
          ["console"]
        )
        .addModule(
          SQLiteModules.SERVICE_MANAGER,
          true,
          ["trace", "debug", "info", "warn", "error"],
          ["console"]
        )
        .addModule(
          SQLiteModules.QUERY_BUILDER,
          true,
          ["trace", "debug", "info", "warn", "error"],
          ["console"]
        )
        .addModule(
          SQLiteModules.BASE_ADAPTER,
          true,
          ["trace", "debug", "info", "warn", "error"],
          ["console"]
        )
        .build()
    );
  }

  /**
   * Create production-safe configuration (errors and warnings only)
   */
  static createProductionConfig() {
    return (
      new LoggerConfigBuilder()
        .setEnabled(true)
        .setDefaultLevel("warn")

        // Only critical errors in production
        .addModule(SQLiteModules.UNIVERSAL_SQLITE, true, ["error"], ["console"])
        .addModule(
          SQLiteModules.DATABASE_MANAGER,
          true,
          ["warn", "error"],
          ["console"]
        )
        .addModule(
          SQLiteModules.DATABASE_FACTORY,
          true,
          ["warn", "error"],
          ["console"]
        )
        .addModule(SQLiteModules.UNIVERSAL_DAO, true, ["error"], ["console"])
        .addModule(SQLiteModules.BASE_SERVICE, true, ["error"], ["console"])
        .addModule(SQLiteModules.SERVICE_MANAGER, true, ["error"], ["console"])
        .addModule(SQLiteModules.QUERY_BUILDER, true, ["error"], ["console"])
        .addModule(
          SQLiteModules.BASE_ADAPTER,
          true,
          ["warn", "error"],
          ["console"]
        )

        .build()
    );
  }

  /**
   * Reset to default configuration
   */
  static reset(): UniversalLogger {
    return SQLiteLoggerConfig.initialize();
  }
}

/**
 * Export logger instance for use throughout the library
 */
export const sqliteLogger = SQLiteLoggerConfig.getInstance();

/**
 * Helper function to create module-specific logger
 */
export const createModuleLogger = (moduleName: string) => {
  const logger = SQLiteLoggerConfig.getInstance();
  return {
    trace: (message: string, ...args: any[]) =>
      logger.trace(moduleName, message, ...args),
    debug: (message: string, ...args: any[]) =>
      logger.debug(moduleName, message, ...args),
    info: (message: string, ...args: any[]) =>
      logger.info(moduleName, message, ...args),
    warn: (message: string, ...args: any[]) =>
      logger.warn(moduleName, message, ...args),
    error: (message: string, ...args: any[]) =>
      logger.error(moduleName, message, ...args),
  };
};
