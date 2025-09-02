import { QueryTable, WhereClause, OrderByClause, ImportResult } from "../types";
import { UniversalDAO } from "./universal-dao";

// src/core/base-service.ts
export abstract class BaseService<T = any> {
    protected dao: UniversalDAO;
    protected tableName: string;

    constructor(dao: UniversalDAO, tableName: string) {
        this.dao = dao;
        this.tableName = tableName;
    }

    async create(data: Partial<T>): Promise<T | null> {
        const queryTable = this.dao.convertJsonToQueryTable(this.tableName, data);
        const result = await this.dao.insert(queryTable);

        if (result.lastInsertRowId) {
            return await this.findById(result.lastInsertRowId);
        }

        return data as T;
    }

    async update(id: any, data: Partial<T>): Promise<T | null> {
        const updateData = { ...data, id };
        const queryTable = this.dao.convertJsonToQueryTable(this.tableName, updateData, ['id']);
        await this.dao.update(queryTable);
        return await this.findById(id);
    }

    async delete(id: any): Promise<boolean> {
        const queryTable: QueryTable = {
            name: this.tableName,
            cols: [],
            wheres: [{ name: 'id', value: id }]
        };

        const result = await this.dao.delete(queryTable);
        return result.rowsAffected > 0;
    }

    async findById(id: any): Promise<T | null> {
        const queryTable: QueryTable = {
            name: this.tableName,
            cols: [],
            wheres: [{ name: 'id', value: id }]
        };

        const result = await this.dao.select(queryTable);
        return Object.keys(result).length > 0 ? result as T : null;
    }

    async findAll(options?: {
        where?: WhereClause[];
        orderBy?: OrderByClause[];
        limit?: number;
        offset?: number;
    }): Promise<T[]> {
        const queryTable: QueryTable = {
            name: this.tableName,
            cols: [],
            wheres: options?.where,
            orderbys: options?.orderBy,
            limitOffset: {
                limit: options?.limit,
                offset: options?.offset
            }
        };

        const results = await this.dao.selectAll(queryTable);
        return results as T[];
    }

    async count(where?: WhereClause[]): Promise<number> {
        const queryTable: QueryTable = {
            name: this.tableName,
            cols: [{ name: 'COUNT(*) as count' }],
            wheres: where
        };

        const result = await this.dao.select(queryTable);
        return result.count || 0;
    }

    async exists(id: any): Promise<boolean> {
        const item = await this.findById(id);
        return item !== null;
    }

    async truncate(): Promise<void> {
        await this.dao.execute(`DELETE FROM ${this.tableName}`);
        await this.dao.execute(`DELETE FROM sqlite_sequence WHERE name='${this.tableName}'`);
    }

    async bulkInsert(items: Partial<T>[]): Promise<ImportResult> {
        return await this.dao.importData({
            tableName: this.tableName,
            data: items as Record<string, any>[],
            batchSize: 1000,
            skipErrors: false,
            validateData: true
        });
    }

    protected buildWhereFromObject(obj: Partial<T>): WhereClause[] {
        return Object.entries(obj)
            .filter(([_, value]) => value !== undefined)
            .map(([key, value]) => ({ name: key, value }));
    }
}