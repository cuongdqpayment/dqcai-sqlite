import { UniversalDAO } from "../core/universal-dao";

// src/utils/migration-manager.ts
export interface Migration {
  version: string;
  description: string;
  up: (dao: UniversalDAO) => Promise<void>;
  down: (dao: UniversalDAO) => Promise<void>;
}

export class MigrationManager {
  private dao: UniversalDAO;
  private migrations: Migration[] = [];

  constructor(dao: UniversalDAO) {
    this.dao = dao;
  }

  addMigration(migration: Migration): void {
    this.migrations.push(migration);
    this.migrations.sort((a, b) => a.version.localeCompare(b.version));
  }

  async initMigrationTable(): Promise<void> {
    await this.dao.execute(`
      CREATE TABLE IF NOT EXISTS _migrations (
        version TEXT PRIMARY KEY,
        description TEXT,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async getAppliedMigrations(): Promise<string[]> {
    try {
      const result = await this.dao.execute('SELECT version FROM _migrations ORDER BY version');
      return result.rows.map(row => row.version);
    } catch {
      return [];
    }
  }

  async migrate(targetVersion?: string): Promise<void> {
    await this.initMigrationTable();
    const appliedMigrations = await this.getAppliedMigrations();
    
    for (const migration of this.migrations) {
      if (targetVersion && migration.version > targetVersion) {
        break;
      }
      
      if (!appliedMigrations.includes(migration.version)) {
        await this.dao.beginTransaction();
        
        try {
          await migration.up(this.dao);
          await this.dao.execute(
            'INSERT INTO _migrations (version, description) VALUES (?, ?)',
            [migration.version, migration.description]
          );
          await this.dao.commitTransaction();
        } catch (error) {
          await this.dao.rollbackTransaction();
          throw new Error(`Migration ${migration.version} failed: ${error}`);
        }
      }
    }
  }

  async rollback(targetVersion?: string): Promise<void> {
    await this.initMigrationTable();
    const appliedMigrations = await this.getAppliedMigrations();
    
    const reversedMigrations = [...this.migrations].reverse();
    
    for (const migration of reversedMigrations) {
      if (targetVersion && migration.version <= targetVersion) {
        break;
      }
      
      if (appliedMigrations.includes(migration.version)) {
        await this.dao.beginTransaction();
        
        try {
          await migration.down(this.dao);
          await this.dao.execute('DELETE FROM _migrations WHERE version = ?', [migration.version]);
          await this.dao.commitTransaction();
        } catch (error) {
          await this.dao.rollbackTransaction();
          throw new Error(`Rollback of migration ${migration.version} failed: ${error}`);
        }
      }
    }
  }

  async status(): Promise<Array<{ version: string; description: string; applied: boolean }>> {
    await this.initMigrationTable();
    const appliedMigrations = await this.getAppliedMigrations();
    
    return this.migrations.map(migration => ({
      version: migration.version,
      description: migration.description,
      applied: appliedMigrations.includes(migration.version)
    }));
  }
}