// src/logger/logger-config.ts - Alternative solution using Proxy pattern

import {
  BaseModule,
  LoggerConfigBuilder,
  createLogger,
  UniversalLogger,
} from "@dqcai/logger";

export { BaseModule };

export enum SQLiteModules {
  DATABASE_MANAGER = "DatabaseManager",
  DATABASE_FACTORY = "DatabaseFactory",
  UNIVERSAL_DAO = "UniversalDAO",
  BASE_SERVICE = "BaseService",
  SERVICE_MANAGER = "ServiceManager",
  QUERY_BUILDER = "QueryBuilder",
  BASE_ADAPTER = "BaseAdapter",
  UNIVERSAL_SQLITE = "UniversalSQLite",
  TRANSACTION = "Transaction",
  CONNECTION = "Connection",
}

interface ModuleLogger {
  trace: (message: string, ...args: any[]) => void;
  debug: (message: string, ...args: any[]) => void;
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
}

/**
 * Logger Proxy - always delegates to current logger instance
 */
class LoggerProxy implements ModuleLogger {
  constructor(private moduleName: string) {}

  trace(message: string, ...args: any[]): void {
    SQLiteLoggerConfig.getInstance().trace(this.moduleName, message, ...args);
  }

  debug(message: string, ...args: any[]): void {
    SQLiteLoggerConfig.getInstance().debug(this.moduleName, message, ...args);
  }

  info(message: string, ...args: any[]): void {
    SQLiteLoggerConfig.getInstance().info(this.moduleName, message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    SQLiteLoggerConfig.getInstance().warn(this.moduleName, message, ...args);
  }

  error(message: string, ...args: any[]): void {
    SQLiteLoggerConfig.getInstance().error(this.moduleName, message, ...args);
  }
}

/**
 * Enhanced SQLite Logger Configuration with automatic update support
 */
export class SQLiteLoggerConfig {
  private static instance: UniversalLogger | null = null;
  private static currentConfig: any = null;
  // Track proxy instances for debugging
  public static proxyInstances: Map<string, LoggerProxy> = new Map();

  static createDefaultConfig() {
    return (
      new LoggerConfigBuilder()
        .setEnabled(true)
        .setDefaultLevel("warn")
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
        .addModule(
          SQLiteModules.UNIVERSAL_DAO,
          true,
          ["warn", "error"],
          ["console"]
        )
        .addModule(
          SQLiteModules.BASE_SERVICE,
          true,
          ["warn", "error"],
          ["console"]
        )
        .addModule(
          SQLiteModules.SERVICE_MANAGER,
          true,
          ["warn", "error"],
          ["console"]
        )
        .addModule(
          SQLiteModules.QUERY_BUILDER,
          true,
          ["warn", "error"],
          ["console"]
        )
        .addModule(
          SQLiteModules.BASE_ADAPTER,
          true,
          ["warn", "error"],
          ["console"]
        )
        .build()
    );
  }

  static initialize(customConfig?: any): UniversalLogger {
    const config = customConfig || SQLiteLoggerConfig.createDefaultConfig();
    SQLiteLoggerConfig.currentConfig = config;
    
    if (config.enabled) {
      console.debug(
        "SQLiteLoggerConfig.initialize()",
        JSON.stringify(config, null, 2)
      );
    }
    
    SQLiteLoggerConfig.instance = createLogger(config);
    return SQLiteLoggerConfig.instance;
  }

  static getInstance(): UniversalLogger {
    if (!SQLiteLoggerConfig.instance) {
      return SQLiteLoggerConfig.initialize();
    }
    return SQLiteLoggerConfig.instance;
  }

  /**
   * Update configuration - proxy pattern automatically handles updates
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
    
    // Log update confirmation
    if (
      newConfig &&
      newConfig.enabled &&
      (newConfig.defaultLevel === "trace" ||
        newConfig.defaultLevel === "debug" ||
        newConfig.defaultLevel === "info")
    ) {
      console.log(
        "SQLiteLoggerConfig.updateConfiguration() - Configuration updated. Proxy loggers will use new settings automatically.",
        `Active proxies: ${Array.from(SQLiteLoggerConfig.proxyInstances.keys())}`
      );
    }
  }

  static setEnabled(enabled: boolean): void {
    if (SQLiteLoggerConfig.currentConfig) {
      SQLiteLoggerConfig.currentConfig.enabled = enabled;
      SQLiteLoggerConfig.updateConfiguration(SQLiteLoggerConfig.currentConfig);
    }
  }

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

  static createDebugConfig() {
    return (
      new LoggerConfigBuilder()
        .setEnabled(true)
        .setDefaultLevel("trace")
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

  static createProductionConfig() {
    return (
      new LoggerConfigBuilder()
        .setEnabled(true)
        .setDefaultLevel("warn")
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

  static reset(): UniversalLogger {
    return SQLiteLoggerConfig.initialize();
  }

  /**
   * Get active proxy modules
   */
  static getActiveProxyModules(): string[] {
    return Array.from(SQLiteLoggerConfig.proxyInstances.keys());
  }

  /**
   * Get current configuration (for debugging)
   */
  static getCurrentConfig(): any {
    return SQLiteLoggerConfig.currentConfig ? { ...SQLiteLoggerConfig.currentConfig } : null;
  }
}

export const sqliteLogger = SQLiteLoggerConfig.getInstance();

/**
 * Create module logger using proxy pattern - automatically updates when configuration changes
 */
export const createModuleLogger = (moduleName: string): ModuleLogger => {
  // Check if proxy already exists for this module
  if (SQLiteLoggerConfig.proxyInstances.has(moduleName)) {
    return SQLiteLoggerConfig.proxyInstances.get(moduleName)!;
  }

  // Create new proxy
  const proxy = new LoggerProxy(moduleName);
  SQLiteLoggerConfig.proxyInstances.set(moduleName, proxy);

  return proxy;
};

/**
 * Utility functions for testing and debugging
 */
export const LoggerUtils = {
  /**
   * Test if a module logger responds to configuration changes
   */
  testDynamicUpdate: (moduleName: string): void => {
    const logger = createModuleLogger(moduleName);
    
    console.log(`\n=== Testing ${moduleName} Logger Dynamic Updates ===`);
    
    // Test with debug config
    console.log("1. Setting debug configuration...");
    SQLiteLoggerConfig.updateConfiguration(SQLiteLoggerConfig.createDebugConfig());
    logger.debug("This DEBUG message should be visible");
    logger.info("This INFO message should be visible");
    
    // Test with production config
    console.log("2. Setting production configuration...");
    SQLiteLoggerConfig.updateConfiguration(SQLiteLoggerConfig.createProductionConfig());
    logger.debug("This DEBUG message should be HIDDEN");
    logger.info("This INFO message should be HIDDEN");
    logger.error("This ERROR message should be visible");
    
    // Test module disable
    console.log("3. Disabling specific module...");
    SQLiteLoggerConfig.disableModule(moduleName);
    logger.error("This ERROR message should be HIDDEN (module disabled)");
    
    // Test module re-enable
    console.log("4. Re-enabling specific module...");
    SQLiteLoggerConfig.enableModule(moduleName);
    logger.error("This ERROR message should be visible again");
    
    console.log(`=== End test for ${moduleName} ===\n`);
  },

  /**
   * Show current logger statistics
   */
  showStats: (): void => {
    console.log("\n=== Logger Statistics ===");
    console.log(`Active proxy modules: ${SQLiteLoggerConfig.getActiveProxyModules().length}`);
    console.log(`Proxy modules:`, SQLiteLoggerConfig.getActiveProxyModules());
    console.log(`Current config enabled:`, SQLiteLoggerConfig.getCurrentConfig()?.enabled);
    console.log(`Current default level:`, SQLiteLoggerConfig.getCurrentConfig()?.defaultLevel);
    console.log("========================\n");
  }
};