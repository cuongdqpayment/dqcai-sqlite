// src/core/service-manager.ts
import { BaseService } from "./base-service";
import { ServiceStatus, HealthCheckResult } from "../types";

import { createModuleLogger, SQLiteModules } from "../logger/logger-config";

const logger = createModuleLogger(SQLiteModules.SERVICE_MANAGER);

// Concrete service class mặc định
export class DefaultService extends BaseService {
  // BaseService đã cung cấp đầy đủ functionality
}

// Interface cho cấu hình service
export interface ServiceConfig {
  schemaName: string;
  tableName: string;
  primaryKeyFields?: string[];
  serviceClass?: new (schemaName: string, tableName: string) => BaseService;
}

// Interface cho trạng thái service
export interface ServiceInfo {
  key: string;
  schemaName: string;
  tableName: string;
  status: ServiceStatus;
  isRegistered: boolean;
  createdAt: string;
  lastAccessed?: string;
}

// Interface cho báo cáo sức khỏe
export interface HealthReport {
  totalServices: number;
  healthyServices: number;
  unhealthyServices: number;
  services: Array<HealthCheckResult & { serviceKey: string }>;
  timestamp: string;
  overallHealth: boolean;
}

// Event types cho ServiceManager
export interface ServiceManagerEvent {
  type:
    | "SERVICE_CREATED"
    | "SERVICE_DESTROYED"
    | "SERVICE_ERROR"
    | "HEALTH_CHECK_COMPLETED";
  serviceKey: string;
  schemaName: string;
  tableName: string;
  timestamp: string;
  data?: any;
  error?: Error;
}

export type ServiceManagerEventHandler = (event: ServiceManagerEvent) => void;

/**
 * ServiceManager - Quản lý vòng đời các service con kế thừa từ BaseService
 * Không can thiệp vào DatabaseManager, chỉ tập trung quản lý service instances
 */
export class ServiceManager {
  private static instance: ServiceManager | null = null;

  // Service registry
  private services: Map<string, BaseService> = new Map();
  private serviceConfigs: Map<string, ServiceConfig> = new Map();
  private serviceMetadata: Map<
    string,
    { createdAt: string; lastAccessed?: string }
  > = new Map();

  // Event system
  private eventHandlers: Map<string, ServiceManagerEventHandler[]> = new Map();

  // Lifecycle management
  private isShuttingDown = false;
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    logger.info("ServiceManager instance created");
    this.bindMethods();
    this.startPeriodicCleanup();
  }

  /**
   * Singleton instance
   */
  public static getInstance(): ServiceManager {
    if (!ServiceManager.instance) {
      logger.debug("Creating new ServiceManager singleton instance");
      ServiceManager.instance = new ServiceManager();
    } else {
      logger.trace("Returning existing ServiceManager singleton instance");
    }
    return ServiceManager.instance;
  }

  /**
   * Reset singleton (chủ yếu cho testing)
   */
  public static resetInstance(): void {
    logger.warn("Resetting ServiceManager singleton instance");
    if (ServiceManager.instance) {
      ServiceManager.instance.destroy();
      ServiceManager.instance = null;
      logger.info("ServiceManager singleton instance reset successfully");
    } else {
      logger.debug("No ServiceManager instance to reset");
    }
  }

  private bindMethods(): void {
    logger.trace("Binding ServiceManager methods");
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(this));
    methods.forEach((method) => {
      if (
        typeof (this as any)[method] === "function" &&
        method !== "constructor"
      ) {
        (this as any)[method] = (this as any)[method].bind(this);
      }
    });
    logger.trace("ServiceManager methods bound successfully", {
      methodCount: methods.length,
    });
  }

  /**
   * Tạo service key duy nhất
   */
  private createServiceKey(schemaName: string, tableName: string): string {
    const key = `${schemaName}:${tableName}`;
    logger.trace("Created service key", { schemaName, tableName, key });
    return key;
  }

  /**
   * Validate service config
   */
  private validateServiceConfig(config: ServiceConfig): void {
    logger.trace("Validating service config", {
      schemaName: config.schemaName,
      tableName: config.tableName,
    });

    if (!config.schemaName?.trim()) {
      logger.error("Invalid service config: schema name missing", { config });
      throw new Error("Schema name is required and cannot be empty");
    }
    if (!config.tableName?.trim()) {
      logger.error("Invalid service config: table name missing", { config });
      throw new Error("Table name is required and cannot be empty");
    }

    logger.trace("Service config validation passed", {
      schemaName: config.schemaName,
      tableName: config.tableName,
    });
  }

  /**
   * Đăng ký cấu hình service
   */
  public registerService(config: ServiceConfig): this {
    logger.debug("Registering service", {
      schemaName: config.schemaName,
      tableName: config.tableName,
      primaryKeyFields: config.primaryKeyFields,
      hasCustomServiceClass: !!config.serviceClass,
    });

    this.validateServiceConfig(config);

    const serviceKey = this.createServiceKey(
      config.schemaName,
      config.tableName
    );

    // Normalize config
    const normalizedConfig: ServiceConfig = {
      schemaName: config.schemaName.trim(),
      tableName: config.tableName.trim(),
      primaryKeyFields: config.primaryKeyFields || ["id"],
      serviceClass: config.serviceClass || DefaultService,
    };

    const wasAlreadyRegistered = this.serviceConfigs.has(serviceKey);
    this.serviceConfigs.set(serviceKey, normalizedConfig);

    if (wasAlreadyRegistered) {
      logger.info("Service configuration updated", { serviceKey });
    } else {
      logger.info("Service registered successfully", { serviceKey });
    }

    return this;
  }

  /**
   * Đăng ký nhiều services
   */
  public registerServices(configs: ServiceConfig[]): this {
    logger.debug("Registering multiple services", { count: configs.length });

    configs.forEach((config, index) => {
      try {
        this.registerService(config);
      } catch (error) {
        logger.error("Failed to register service in batch", {
          index,
          config,
          error: (error as Error).message,
        });
        throw error;
      }
    });

    logger.info("Multiple services registered successfully", {
      count: configs.length,
    });
    return this;
  }

  /**
   * Tạo service instance từ config
   */
  private async createServiceInstance(
    config: ServiceConfig
  ): Promise<BaseService> {
    logger.debug("Creating service instance", {
      schemaName: config.schemaName,
      tableName: config.tableName,
      serviceClassName: config.serviceClass?.name || "DefaultService",
      serviceClass: config.serviceClass, // Thêm dòng này
      isDefaultService: config.serviceClass === DefaultService,
    });

    const ServiceClass = config.serviceClass || DefaultService;

    // Thêm validation
    if (!ServiceClass) {
      logger.error("ServiceClass is undefined", { config });
      throw new Error("ServiceClass is undefined");
    }

    logger.debug("About to instantiate service", {
      ServiceClassConstructor: ServiceClass,
      ServiceClassName: ServiceClass.name,
    });

    const service: any = new ServiceClass(config.schemaName, config.tableName);

    // Verify instance type
    logger.debug("Service instance created", {
      serviceConstructor: service.constructor.name,
      servicePrototype: Object.getPrototypeOf(service).constructor.name,
      hasFindByStoreId: typeof service.findByStoreId === "function",
    });

    if (config.primaryKeyFields) {
      logger.trace("Setting primary key fields", {
        schemaName: config.schemaName,
        tableName: config.tableName,
        primaryKeyFields: config.primaryKeyFields,
      });
      service.setPrimaryKeyFields(config.primaryKeyFields);
    }

    logger.info("Service instance created successfully", {
      schemaName: config.schemaName,
      tableName: config.tableName,
    });

    return service;
  }

  /**
   * Lấy service (tự động tạo nếu chưa tồn tại)
   */
  public async getService(
    schemaName: string,
    tableName: string
  ): Promise<BaseService> {
    if (this.isShuttingDown) {
      logger.error("ServiceManager is shutting down, cannot get service", {
        schemaName,
        tableName,
      });
      throw new Error("ServiceManager is shutting down");
    }

    const serviceKey = this.createServiceKey(schemaName, tableName);
    logger.debug("Getting service", { serviceKey });

    // Update access time
    const metadata = this.serviceMetadata.get(serviceKey);
    if (metadata) {
      metadata.lastAccessed = new Date().toISOString();
      logger.trace("Updated service access time", { serviceKey });
    }

    // Return existing service
    if (this.services.has(serviceKey)) {
      logger.trace("Returning existing service", { serviceKey });
      return this.services.get(serviceKey)!;
    }

    // Get or create default config
    let config = this.serviceConfigs.get(serviceKey);
    if (!config) {
      logger.debug("Creating default config for unregistered service", {
        serviceKey,
      });
      config = {
        schemaName,
        tableName,
        primaryKeyFields: ["id"],
        serviceClass: DefaultService,
      };
      this.serviceConfigs.set(serviceKey, config);
    }

    try {
      const service = await this.createServiceInstance(config);
      this.services.set(serviceKey, service);

      // Track metadata
      this.serviceMetadata.set(serviceKey, {
        createdAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
      });

      this.emit("SERVICE_CREATED", {
        serviceKey,
        schemaName,
        tableName,
      });

      logger.info("Service created and cached successfully", { serviceKey });
      return service;
    } catch (error) {
      logger.error("Failed to create service", {
        serviceKey,
        error: (error as Error).message,
      });

      this.emit("SERVICE_ERROR", {
        serviceKey,
        schemaName,
        tableName,
        error: error as Error,
      });
      throw error;
    }
  }

  /**
   * Lấy service đã tồn tại (không tự động tạo)
   */
  public getExistingService(
    schemaName: string,
    tableName: string
  ): BaseService | null {
    const serviceKey = this.createServiceKey(schemaName, tableName);
    logger.trace("Getting existing service", { serviceKey });

    const service = this.services.get(serviceKey) || null;
    if (service) {
      logger.trace("Existing service found", { serviceKey });
    } else {
      logger.trace("Existing service not found", { serviceKey });
    }

    return service;
  }

  /**
   * Khởi tạo service
   */
  public async initializeService(
    schemaName: string,
    tableName: string
  ): Promise<BaseService> {
    const serviceKey = this.createServiceKey(schemaName, tableName);
    logger.debug("Initializing service", { serviceKey });

    try {
      const service = await this.getService(schemaName, tableName);
      await service.init();
      logger.info("Service initialized successfully", { serviceKey });
      return service;
    } catch (error) {
      logger.error("Failed to initialize service", {
        serviceKey,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Hủy service instance
   */
  public async destroyService(
    schemaName: string,
    tableName: string
  ): Promise<boolean> {
    const serviceKey = this.createServiceKey(schemaName, tableName);
    logger.debug("Destroying service", { serviceKey });

    const service = this.services.get(serviceKey);

    if (!service) {
      logger.warn("Service not found for destruction", { serviceKey });
      return false;
    }

    try {
      await service.close();
      service.destroy();

      this.services.delete(serviceKey);
      this.serviceMetadata.delete(serviceKey);

      this.emit("SERVICE_DESTROYED", {
        serviceKey,
        schemaName,
        tableName,
      });

      logger.info("Service destroyed successfully", { serviceKey });
      return true;
    } catch (error) {
      logger.error("Failed to destroy service", {
        serviceKey,
        error: (error as Error).message,
      });

      this.emit("SERVICE_ERROR", {
        serviceKey,
        schemaName,
        tableName,
        error: error as Error,
      });
      return false;
    }
  }

  /**
   * Lấy danh sách services theo schema
   */
  public getServicesBySchema(schemaName: string): BaseService[] {
    logger.trace("Getting services by schema", { schemaName });

    const services: BaseService[] = [];

    for (const [serviceKey, service] of this.services) {
      const [keySchema] = serviceKey.split(":");
      if (keySchema === schemaName) {
        services.push(service);
      }
    }

    logger.debug("Found services for schema", {
      schemaName,
      count: services.length,
    });
    return services;
  }

  /**
   * Lấy danh sách service keys theo schema
   */
  public getServiceKeysBySchema(schemaName: string): string[] {
    logger.trace("Getting service keys by schema", { schemaName });

    const keys: string[] = [];

    for (const serviceKey of this.services.keys()) {
      const [keySchema] = serviceKey.split(":");
      if (keySchema === schemaName) {
        keys.push(serviceKey);
      }
    }

    logger.debug("Found service keys for schema", { schemaName, keys });
    return keys;
  }

  /**
   * Hủy tất cả services trong một schema
   */
  public async destroyServicesBySchema(schemaName: string): Promise<void> {
    const serviceKeys = this.getServiceKeysBySchema(schemaName);
    logger.debug("Destroying services by schema", { schemaName, serviceKeys });

    if (serviceKeys.length === 0) {
      logger.debug("No services found to destroy for schema", { schemaName });
      return;
    }

    const destroyPromises = serviceKeys.map(async (serviceKey) => {
      const [, tableName] = serviceKey.split(":");
      try {
        const result = await this.destroyService(schemaName, tableName);
        logger.trace("Service destroy result", { serviceKey, result });
        return result;
      } catch (error) {
        logger.error("Error destroying service in schema cleanup", {
          serviceKey,
          error: (error as Error).message,
        });
        return false;
      }
    });

    const results = await Promise.all(destroyPromises);
    const successCount = results.filter(Boolean).length;

    logger.info("Schema services destruction completed", {
      schemaName,
      totalServices: serviceKeys.length,
      successfulDestroys: successCount,
    });
  }

  /**
   * Lấy thông tin tất cả services
   */
  public getAllServiceInfo(): ServiceInfo[] {
    logger.trace("Getting all service info");

    const infos: ServiceInfo[] = [];

    // Registered services
    for (const [serviceKey, config] of this.serviceConfigs) {
      const service = this.services.get(serviceKey);
      const metadata = this.serviceMetadata.get(serviceKey);

      infos.push({
        key: serviceKey,
        schemaName: config.schemaName,
        tableName: config.tableName,
        status: service
          ? service.getStatus()
          : {
              schemaName: config.schemaName,
              tableName: config.tableName,
              isOpened: false,
              isInitialized: false,
              hasDao: false,
            },
        isRegistered: true,
        createdAt: metadata?.createdAt || "N/A",
        lastAccessed: metadata?.lastAccessed,
      });
    }

    // Unregistered services (created on-the-fly)
    for (const [serviceKey, service] of this.services) {
      if (!this.serviceConfigs.has(serviceKey)) {
        const [schemaName, tableName] = serviceKey.split(":");
        const metadata = this.serviceMetadata.get(serviceKey);

        infos.push({
          key: serviceKey,
          schemaName,
          tableName,
          status: service.getStatus(),
          isRegistered: false,
          createdAt: metadata?.createdAt || "N/A",
          lastAccessed: metadata?.lastAccessed,
        });
      }
    }

    return infos;
  }

  /**
   * Kiểm tra sức khỏe tất cả services
   */
  public async healthCheck(): Promise<HealthReport> {
    const services = Array.from(this.services.entries());
    const healthPromises = services.map(async ([serviceKey, service]) => {
      try {
        const health = await service.healthCheck();
        return { ...health, serviceKey };
      } catch (error) {
        const [schemaName, tableName] = serviceKey.split(":");
        return {
          healthy: false,
          schemaName,
          error: (error as Error).message,
          timestamp: new Date().toISOString(),
          serviceKey,
        };
      }
    });

    const results = await Promise.all(healthPromises);
    const healthyCount = results.filter((r) => r.healthy).length;

    const report: HealthReport = {
      totalServices: results.length,
      healthyServices: healthyCount,
      unhealthyServices: results.length - healthyCount,
      services: results,
      timestamp: new Date().toISOString(),
      overallHealth: healthyCount === results.length,
    };

    this.emit("HEALTH_CHECK_COMPLETED", {
      serviceKey: "*",
      schemaName: "*",
      tableName: "*",
      data: report,
    });

    return report;
  }

  /**
   * Thực hiện transaction trên nhiều services trong cùng schema
   * (Vì SQLite transaction chỉ hoạt động trong cùng database connection)
   */
  public async executeSchemaTransaction<T>(
    schemaName: string,
    callback: (services: BaseService[]) => Promise<T>
  ): Promise<T> {
    logger.trace(`Executing schema transaction for schema ${schemaName}`);
    const services = this.getServicesBySchema(schemaName);

    if (services.length === 0) {
      logger.error("No services found for schema", { schemaName });
      throw new Error(`No services found for schema: ${schemaName}`);
    }

    // Ensure all services are initialized
    for (const service of services) {
      await service.init();
    }

    // Execute transaction on the first service (they share the same database)
    const primaryService = services[0];

    return await primaryService.executeTransaction(async () => {
      return await callback(services);
    });
  }

  /**
   * Periodic cleanup for unused services
   */
  private startPeriodicCleanup(): void {
    // Cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupUnusedServices();
    }, 5 * 60 * 1000);
  }

  /**
   * Cleanup services not accessed for a long time
   */
  private async cleanupUnusedServices(
    maxIdleTime: number = 30 * 60 * 1000
  ): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    const now = Date.now();
    const servicesToDestroy: string[] = [];

    for (const [serviceKey, metadata] of this.serviceMetadata) {
      if (!metadata.lastAccessed) {
        continue;
      }

      const lastAccessTime = new Date(metadata.lastAccessed).getTime();
      if (now - lastAccessTime > maxIdleTime) {
        servicesToDestroy.push(serviceKey);
      }
    }

    for (const serviceKey of servicesToDestroy) {
      const [schemaName, tableName] = serviceKey.split(":");
      await this.destroyService(schemaName, tableName);
    }
  }

  /**
   * Event system
   */
  public on(eventType: string, handler: ServiceManagerEventHandler): this {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
    return this;
  }

  public off(eventType: string, handler: ServiceManagerEventHandler): this {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
    return this;
  }

  private emit(
    type: ServiceManagerEvent["type"],
    data: Omit<ServiceManagerEvent, "type" | "timestamp">
  ): void {
    const event: ServiceManagerEvent = {
      ...data,
      type,
      timestamp: new Date().toISOString(),
    };

    // Emit to specific event handlers
    const handlers = this.eventHandlers.get(type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(event);
        } catch (error) {
          console.error(
            `ServiceManager: Error in ${type} event handler:`,
            error
          );
        }
      });
    }

    // Emit to global event handlers
    const globalHandlers = this.eventHandlers.get("*");
    if (globalHandlers) {
      globalHandlers.forEach((handler) => {
        try {
          handler(event);
        } catch (error) {
          console.error(
            "ServiceManager: Error in global event handler:",
            error
          );
        }
      });
    }
  }

  /**
   * Utility methods
   */
  public hasService(schemaName: string, tableName: string): boolean {
    const serviceKey = this.createServiceKey(schemaName, tableName);
    return this.services.has(serviceKey);
  }

  public isRegistered(schemaName: string, tableName: string): boolean {
    const serviceKey = this.createServiceKey(schemaName, tableName);
    return this.serviceConfigs.has(serviceKey);
  }

  public getServiceCount(): number {
    return this.services.size;
  }

  public getRegisteredCount(): number {
    return this.serviceConfigs.size;
  }

  public getSchemas(): string[] {
    const schemas = new Set<string>();

    for (const serviceKey of this.services.keys()) {
      const [schemaName] = serviceKey.split(":");
      schemas.add(schemaName);
    }

    return Array.from(schemas);
  }

  /**
   * Destroy all services and cleanup resources
   */
  public async destroy(): Promise<void> {
    this.isShuttingDown = true;

    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Destroy all services
    const destroyPromises = Array.from(this.services.entries()).map(
      async ([serviceKey, service]) => {
        try {
          await service.close();
          service.destroy();
        } catch (error) {
          console.error(`Error destroying service ${serviceKey}:`, error);
        }
      }
    );

    await Promise.all(destroyPromises);

    // Clear all data
    this.services.clear();
    this.serviceConfigs.clear();
    this.serviceMetadata.clear();
    this.eventHandlers.clear();

    this.isShuttingDown = false;
  }
}

// Export singleton instance
export const serviceManager = ServiceManager.getInstance();
