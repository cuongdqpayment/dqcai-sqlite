// src/utils/migration-manager.ts
import { UniversalDAO } from '../core/universal-dao';
import { SQLiteResult, DatabaseSchema, TableDefinition, ColumnDefinition } from '../types';

export interface Migration {
  version: string;
  description: string;
  up: (dao: UniversalDAO) => Promise<void>;
  down: (dao: UniversalDAO) => Promise<void>;
  dependencies?: string[]; // Migration dependencies
  category?: string; // Optional category for grouping
}

export interface MigrationRecord {
  version: string;
  description: string;
  category?: string;
  applied_at: string;
  execution_time_ms: number;
  checksum?: string;
}

export interface MigrationStatus {
  version: string;
  description: string;
  category?: string;
  applied: boolean;
  applied_at?: string;
  execution_time_ms?: number;
  dependencies_met: boolean;
  missing_dependencies: string[];
}

export interface MigrationPlan {
  toApply: Migration[];
  toRollback: Migration[];
  conflicts: string[];
  estimatedTime: number;
}

export interface MigrationOptions {
  dryRun?: boolean;
  stopOnError?: boolean;
  validateChecksums?: boolean;
  timeout?: number; // in milliseconds
  onProgress?: (current: number, total: number, migration: Migration) => void;
  onError?: (error: Error, migration: Migration) => void;
}

export class MigrationManager {
  private dao: UniversalDAO;
  private migrations: Map<string, Migration> = new Map();
  private migrationTable: string = '_migrations';
  private schemaVersion: string = '1.0.0';

  constructor(dao: UniversalDAO, options?: {
    migrationTable?: string;
    schemaVersion?: string;
  }) {
    this.dao = dao;
    this.migrationTable = options?.migrationTable || '_migrations';
    this.schemaVersion = options?.schemaVersion || '1.0.0';
  }

  /**
   * Add a single migration
   */
  addMigration(migration: Migration): void {
    this.validateMigration(migration);
    this.migrations.set(migration.version, migration);
  }

  /**
   * Add multiple migrations
   */
  addMigrations(migrations: Migration[]): void {
    for (const migration of migrations) {
      this.addMigration(migration);
    }
  }

  /**
   * Load migrations from a directory or configuration
   */
  loadMigrations(migrations: Record<string, Migration>): void {
    Object.values(migrations).forEach(migration => {
      this.addMigration(migration);
    });
  }

  /**
   * Remove a migration
   */
  removeMigration(version: string): boolean {
    return this.migrations.delete(version);
  }

  /**
   * Get all registered migrations
   */
  getMigrations(): Migration[] {
    return Array.from(this.migrations.values()).sort((a, b) => 
      this.compareVersions(a.version, b.version)
    );
  }

  /**
   * Get migration by version
   */
  getMigration(version: string): Migration | undefined {
    return this.migrations.get(version);
  }

  /**
   * Initialize the migration tracking table
   */
  async initMigrationTable(): Promise<void> {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ${this.migrationTable} (
        version TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        category TEXT,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        execution_time_ms INTEGER DEFAULT 0,
        checksum TEXT,
        schema_version TEXT DEFAULT '${this.schemaVersion}'
      )
    `;
    
    await this.dao.execute(createTableSQL);

    // Create index for better query performance
    await this.dao.execute(`
      CREATE INDEX IF NOT EXISTS idx_migrations_applied_at 
      ON ${this.migrationTable} (applied_at)
    `);

    await this.dao.execute(`
      CREATE INDEX IF NOT EXISTS idx_migrations_category 
      ON ${this.migrationTable} (category)
    `);
  }

  /**
   * Get all applied migrations
   */
  async getAppliedMigrations(): Promise<MigrationRecord[]> {
    try {
      const result = await this.dao.execute(`
        SELECT version, description, category, applied_at, execution_time_ms, checksum
        FROM ${this.migrationTable} 
        ORDER BY applied_at ASC
      `);
      return result.rows as MigrationRecord[];
    } catch (error) {
      // If table doesn't exist, return empty array
      return [];
    }
  }

  /**
   * Get pending migrations
   */
  async getPendingMigrations(): Promise<Migration[]> {
    const appliedMigrations = await this.getAppliedMigrations();
    const appliedVersions = new Set(appliedMigrations.map(m => m.version));
    
    return this.getMigrations().filter(migration => 
      !appliedVersions.has(migration.version)
    );
  }

  /**
   * Get detailed status of all migrations
   */
  async getDetailedStatus(): Promise<MigrationStatus[]> {
    await this.initMigrationTable();
    const appliedMigrations = await this.getAppliedMigrations();
    const appliedMap = new Map(appliedMigrations.map(m => [m.version, m]));

    return this.getMigrations().map(migration => {
      const applied = appliedMap.get(migration.version);
      const { dependenciesMet, missingDependencies } = this.checkDependencies(migration);

      return {
        version: migration.version,
        description: migration.description,
        category: migration.category,
        applied: !!applied,
        applied_at: applied?.applied_at,
        execution_time_ms: applied?.execution_time_ms,
        dependencies_met: dependenciesMet,
        missing_dependencies: missingDependencies
      };
    });
  }

  /**
   * Create a migration plan
   */
  async createMigrationPlan(targetVersion?: string, direction: 'up' | 'down' = 'up'): Promise<MigrationPlan> {
    const appliedMigrations = await this.getAppliedMigrations();
    const appliedVersions = new Set(appliedMigrations.map(m => m.version));
    const allMigrations = this.getMigrations();

    const plan: MigrationPlan = {
      toApply: [],
      toRollback: [],
      conflicts: [],
      estimatedTime: 0
    };

    if (direction === 'up') {
      // Forward migration
      for (const migration of allMigrations) {
        if (targetVersion && this.compareVersions(migration.version, targetVersion) > 0) {
          break;
        }
        
        if (!appliedVersions.has(migration.version)) {
          const { dependenciesMet, missingDependencies } = this.checkDependencies(migration);
          
          if (!dependenciesMet) {
            plan.conflicts.push(
              `Migration ${migration.version} has unmet dependencies: ${missingDependencies.join(', ')}`
            );
          } else {
            plan.toApply.push(migration);
          }
        }
      }
    } else {
      // Rollback migration
      const reversedApplied = appliedMigrations
        .filter(applied => !targetVersion || this.compareVersions(applied.version, targetVersion) > 0)
        .sort((a, b) => this.compareVersions(b.version, a.version));

      for (const appliedRecord of reversedApplied) {
        const migration = this.migrations.get(appliedRecord.version);
        if (migration) {
          plan.toRollback.push(migration);
        }
      }
    }

    // Estimate execution time (rough estimate based on complexity)
    plan.estimatedTime = (plan.toApply.length + plan.toRollback.length) * 1000; // 1s per migration

    return plan;
  }

  /**
   * Run migrations up to a target version
   */
  async migrate(targetVersion?: string, options: MigrationOptions = {}): Promise<MigrationRecord[]> {
    await this.initMigrationTable();
    
    const plan = await this.createMigrationPlan(targetVersion, 'up');
    
    if (plan.conflicts.length > 0) {
      throw new Error(`Migration conflicts detected:\n${plan.conflicts.join('\n')}`);
    }

    if (options.dryRun) {
      console.log('Dry run - would apply the following migrations:');
      plan.toApply.forEach(m => console.log(`  - ${m.version}: ${m.description}`));
      return [];
    }

    const results: MigrationRecord[] = [];
    const total = plan.toApply.length;

    for (let i = 0; i < plan.toApply.length; i++) {
      const migration = plan.toApply[i];
      
      try {
        options.onProgress?.(i + 1, total, migration);
        
        const result = await this.applyMigration(migration, options);
        results.push(result);
        
      } catch (error) {
        const migrationError = error instanceof Error ? error : new Error(String(error));
        options.onError?.(migrationError, migration);
        
        if (options.stopOnError !== false) {
          throw new Error(
            `Migration ${migration.version} failed: ${migrationError.message}`
          );
        }
      }
    }

    return results;
  }

  /**
   * Rollback migrations to a target version
   */
  async rollback(targetVersion?: string, options: MigrationOptions = {}): Promise<void> {
    await this.initMigrationTable();
    
    const plan = await this.createMigrationPlan(targetVersion, 'down');
    
    if (options.dryRun) {
      console.log('Dry run - would rollback the following migrations:');
      plan.toRollback.forEach(m => console.log(`  - ${m.version}: ${m.description}`));
      return;
    }

    const total = plan.toRollback.length;

    for (let i = 0; i < plan.toRollback.length; i++) {
      const migration = plan.toRollback[i];
      
      try {
        options.onProgress?.(i + 1, total, migration);
        
        await this.rollbackMigration(migration, options);
        
      } catch (error) {
        const migrationError = error instanceof Error ? error : new Error(String(error));
        options.onError?.(migrationError, migration);
        
        if (options.stopOnError !== false) {
          throw new Error(
            `Rollback of migration ${migration.version} failed: ${migrationError.message}`
          );
        }
      }
    }
  }

  /**
   * Apply a single migration
   */
  private async applyMigration(migration: Migration, options: MigrationOptions): Promise<MigrationRecord> {
    const startTime = Date.now();
    const timeout = options.timeout || 30000; // 30 seconds default

    await this.dao.beginTransaction();
    
    try {
      // Set timeout for migration execution
      const migrationPromise = migration.up(this.dao);
      
      if (timeout > 0) {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`Migration timeout after ${timeout}ms`)), timeout);
        });
        
        await Promise.race([migrationPromise, timeoutPromise]);
      } else {
        await migrationPromise;
      }
      
      const executionTime = Date.now() - startTime;
      const checksum = options.validateChecksums ? this.generateChecksum(migration) : undefined;
      
      // Record migration
      await this.dao.execute(`
        INSERT INTO ${this.migrationTable} 
        (version, description, category, execution_time_ms, checksum) 
        VALUES (?, ?, ?, ?, ?)
      `, [
        migration.version,
        migration.description,
        migration.category || null,
        executionTime,
        checksum || null
      ]);
      
      await this.dao.commitTransaction();
      
      return {
        version: migration.version,
        description: migration.description,
        category: migration.category,
        applied_at: new Date().toISOString(),
        execution_time_ms: executionTime,
        checksum
      };
      
    } catch (error) {
      await this.dao.rollbackTransaction();
      throw error;
    }
  }

  /**
   * Rollback a single migration
   */
  private async rollbackMigration(migration: Migration, options: MigrationOptions): Promise<void> {
    const timeout = options.timeout || 30000;

    await this.dao.beginTransaction();
    
    try {
      // Set timeout for migration rollback
      const rollbackPromise = migration.down(this.dao);
      
      if (timeout > 0) {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`Rollback timeout after ${timeout}ms`)), timeout);
        });
        
        await Promise.race([rollbackPromise, timeoutPromise]);
      } else {
        await rollbackPromise;
      }
      
      // Remove migration record
      await this.dao.execute(`
        DELETE FROM ${this.migrationTable} WHERE version = ?
      `, [migration.version]);
      
      await this.dao.commitTransaction();
      
    } catch (error) {
      await this.dao.rollbackTransaction();
      throw error;
    }
  }

  /**
   * Reset all migrations (DANGEROUS - use with caution)
   */
  async reset(options: { force?: boolean } = {}): Promise<void> {
    if (!options.force) {
      throw new Error('Reset requires explicit force option to prevent accidental data loss');
    }

    await this.dao.beginTransaction();
    
    try {
      // Get all applied migrations in reverse order
      const appliedMigrations = await this.getAppliedMigrations();
      const reversedMigrations = appliedMigrations
        .sort((a, b) => this.compareVersions(b.version, a.version));

      // Rollback all migrations
      for (const applied of reversedMigrations) {
        const migration = this.migrations.get(applied.version);
        if (migration) {
          await migration.down(this.dao);
        }
      }

      // Clear migration table
      await this.dao.execute(`DELETE FROM ${this.migrationTable}`);
      
      await this.dao.commitTransaction();
      
    } catch (error) {
      await this.dao.rollbackTransaction();
      throw error;
    }
  }

  /**
   * Validate migration integrity
   */
  async validateIntegrity(): Promise<{
    valid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    
    try {
      const appliedMigrations = await this.getAppliedMigrations();
      
      for (const applied of appliedMigrations) {
        const migration = this.migrations.get(applied.version);
        
        if (!migration) {
          issues.push(`Applied migration ${applied.version} not found in registered migrations`);
          continue;
        }
        
        // Check dependencies
        const { dependenciesMet, missingDependencies } = this.checkDependencies(migration);
        if (!dependenciesMet) {
          issues.push(`Migration ${applied.version} has unmet dependencies: ${missingDependencies.join(', ')}`);
        }
        
        // Check checksum if available
        if (applied.checksum) {
          const currentChecksum = this.generateChecksum(migration);
          if (currentChecksum !== applied.checksum) {
            issues.push(`Migration ${applied.version} has changed since it was applied (checksum mismatch)`);
          }
        }
      }
      
      return {
        valid: issues.length === 0,
        issues
      };
      
    } catch (error) {
      return {
        valid: false,
        issues: [`Error validating migration integrity: ${(error as Error).message}`]
      };
    }
  }

  /**
   * Get migration history with statistics
   */
  async getHistory(): Promise<{
    totalMigrations: number;
    appliedMigrations: number;
    pendingMigrations: number;
    categories: Record<string, number>;
    totalExecutionTime: number;
    averageExecutionTime: number;
    recentMigrations: MigrationRecord[];
  }> {
    const applied = await this.getAppliedMigrations();
    const pending = await this.getPendingMigrations();
    
    const categories: Record<string, number> = {};
    let totalExecutionTime = 0;
    
    for (const migration of applied) {
      if (migration.category) {
        categories[migration.category] = (categories[migration.category] || 0) + 1;
      }
      totalExecutionTime += migration.execution_time_ms || 0;
    }
    
    return {
      totalMigrations: this.migrations.size,
      appliedMigrations: applied.length,
      pendingMigrations: pending.length,
      categories,
      totalExecutionTime,
      averageExecutionTime: applied.length > 0 ? totalExecutionTime / applied.length : 0,
      recentMigrations: applied.slice(-10) // Last 10 migrations
    };
  }

  /**
   * Create a migration from schema differences
   */
  static createMigrationFromSchema(
    fromSchema: DatabaseSchema,
    toSchema: DatabaseSchema,
    version: string,
    description?: string
  ): Migration {
    const migrationDescription = description || `Schema update to version ${version}`;
    
    return {
      version,
      description: migrationDescription,
      up: async (dao: UniversalDAO) => {
        // This is a simplified implementation
        // In practice, you'd want to do proper schema diffing
        for (const [tableName, tableConfig] of Object.entries(toSchema.schemas)) {
          if (!fromSchema.schemas[tableName]) {
            // New table - create it
            const tableDefinition: TableDefinition = {
              name: tableName,
              cols: tableConfig.cols,
              description: tableConfig.description,
              indexes: tableConfig.indexes,
              foreign_keys: tableConfig.foreign_keys
            };
            
            // This would need to be implemented with proper SQL generation
            // For now, we'll throw an error to indicate this needs custom implementation
            throw new Error('Automatic schema migration generation not fully implemented. Please create migrations manually.');
          }
        }
      },
      down: async (dao: UniversalDAO) => {
        // Reverse the changes
        throw new Error('Automatic rollback generation not fully implemented. Please create rollback manually.');
      }
    };
  }

  // Private utility methods

  private validateMigration(migration: Migration): void {
    if (!migration.version || typeof migration.version !== 'string') {
      throw new Error('Migration version is required and must be a string');
    }
    
    if (!migration.description || typeof migration.description !== 'string') {
      throw new Error('Migration description is required and must be a string');
    }
    
    if (typeof migration.up !== 'function') {
      throw new Error('Migration up function is required');
    }
    
    if (typeof migration.down !== 'function') {
      throw new Error('Migration down function is required');
    }
    
    // Check for duplicate version
    if (this.migrations.has(migration.version)) {
      throw new Error(`Migration with version ${migration.version} already exists`);
    }
  }

  private checkDependencies(migration: Migration): {
    dependenciesMet: boolean;
    missingDependencies: string[];
  } {
    if (!migration.dependencies || migration.dependencies.length === 0) {
      return { dependenciesMet: true, missingDependencies: [] };
    }

    const missingDependencies = migration.dependencies.filter(dep => 
      !this.migrations.has(dep)
    );

    return {
      dependenciesMet: missingDependencies.length === 0,
      missingDependencies
    };
  }

  private compareVersions(version1: string, version2: string): number {
    // Simple semantic version comparison
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part < v2Part) return -1;
      if (v1Part > v2Part) return 1;
    }
    
    return 0;
  }

  private generateChecksum(migration: Migration): string {
    // Simple checksum based on function string representation
    // In production, you might want to use a more sophisticated approach
    const content = migration.up.toString() + migration.down.toString();
    let hash = 0;
    
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash.toString(16);
  }
}

// Helper functions for creating common migration patterns

export const MigrationHelpers = {
  /**
   * Create a migration to add a new table
   */
  createTable(
    version: string,
    tableName: string,
    columns: ColumnDefinition[],
    options?: {
      description?: string;
      category?: string;
      indexes?: Array<{ name: string; columns: string[]; unique?: boolean }>;
    }
  ): Migration {
    return {
      version,
      description: options?.description || `Create table ${tableName}`,
      category: options?.category,
      up: async (dao: UniversalDAO) => {
        const columnDefs = columns.map(col => 
          `${col.name} ${col.type} ${col.constraints || ''}`.trim()
        );
        
        await dao.execute(`
          CREATE TABLE ${tableName} (
            ${columnDefs.join(',\n    ')}
          )
        `);
        
        // Create indexes if specified
        if (options?.indexes) {
          for (const index of options.indexes) {
            const uniqueStr = index.unique ? 'UNIQUE' : '';
            await dao.execute(`
              CREATE ${uniqueStr} INDEX ${index.name} 
              ON ${tableName} (${index.columns.join(', ')})
            `);
          }
        }
      },
      down: async (dao: UniversalDAO) => {
        await dao.execute(`DROP TABLE IF EXISTS ${tableName}`);
      }
    };
  },

  /**
   * Create a migration to add a column
   */
  addColumn(
    version: string,
    tableName: string,
    columnName: string,
    columnType: string,
    options?: {
      description?: string;
      category?: string;
      defaultValue?: any;
      nullable?: boolean;
    }
  ): Migration {
    return {
      version,
      description: options?.description || `Add column ${columnName} to ${tableName}`,
      category: options?.category,
      up: async (dao: UniversalDAO) => {
        let sql = `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`;
        
        if (options?.defaultValue !== undefined) {
          sql += ` DEFAULT ${options.defaultValue}`;
        }
        
        if (options?.nullable === false) {
          sql += ` NOT NULL`;
        }
        
        await dao.execute(sql);
      },
      down: async (dao: UniversalDAO) => {
        // SQLite doesn't support DROP COLUMN directly
        throw new Error('SQLite does not support dropping columns. Manual rollback required.');
      }
    };
  },

  /**
   * Create a migration to add an index
   */
  addIndex(
    version: string,
    tableName: string,
    indexName: string,
    columns: string[],
    options?: {
      description?: string;
      category?: string;
      unique?: boolean;
    }
  ): Migration {
    return {
      version,
      description: options?.description || `Add index ${indexName} to ${tableName}`,
      category: options?.category,
      up: async (dao: UniversalDAO) => {
        const uniqueStr = options?.unique ? 'UNIQUE' : '';
        await dao.execute(`
          CREATE ${uniqueStr} INDEX ${indexName} 
          ON ${tableName} (${columns.join(', ')})
        `);
      },
      down: async (dao: UniversalDAO) => {
        await dao.execute(`DROP INDEX IF EXISTS ${indexName}`);
      }
    };
  },

  /**
   * Create a migration to run custom SQL
   */
  rawSQL(
    version: string,
    upSQL: string,
    downSQL: string,
    options?: {
      description?: string;
      category?: string;
    }
  ): Migration {
    return {
      version,
      description: options?.description || `Custom SQL migration ${version}`,
      category: options?.category,
      up: async (dao: UniversalDAO) => {
        await dao.execute(upSQL);
      },
      down: async (dao: UniversalDAO) => {
        await dao.execute(downSQL);
      }
    };
  }
};