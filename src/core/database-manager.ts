import { SQLiteAdapter } from "../types";
import { DatabaseFactory } from "./database-factory";
import { UniversalDAO } from "./universal-dao";

// src/core/database-manager.ts
export class DatabaseManager {
  private connections: Map<string, UniversalDAO> = new Map();

  async getConnection(dbPath: string, options?: { adapter?: SQLiteAdapter }): Promise<UniversalDAO> {
    if (this.connections.has(dbPath)) {
      return this.connections.get(dbPath)!;
    }

    const dao = DatabaseFactory.createDAO(dbPath, options);
    await dao.connect();
    this.connections.set(dbPath, dao);
    return dao;
  }

  async closeConnection(dbPath: string): Promise<void> {
    const dao = this.connections.get(dbPath);
    if (dao) {
      await dao.disconnect();
      this.connections.delete(dbPath);
    }
  }

  async closeAllConnections(): Promise<void> {
    for (const [path, dao] of this.connections.entries()) {
      await dao.disconnect();
    }
    this.connections.clear();
  }

  listConnections(): string[] {
    return Array.from(this.connections.keys());
  }

  getConnectionCount(): number {
    return this.connections.size;
  }
}