// src/query/query-builder.ts
import { UniversalDAO } from '../core/universal-dao';
import { SQLiteResult, SQLiteRow } from '../types';

export interface QueryCondition {
  field: string;
  operator: string;
  value: any;
}

export interface JoinClause {
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL OUTER';
  table: string;
  condition: string;
}

export interface SubQuery {
  query: QueryBuilder;
  alias: string;
}

/**
 * Enhanced QueryBuilder with advanced SQL query construction capabilities
 */
export class QueryBuilder {
  private tableName = '';
  private selectFields: string[] = ['*'];
  private joinClauses: JoinClause[] = [];
  private whereConditions: QueryCondition[] = [];
  private groupByFields: string[] = [];
  private havingConditions: QueryCondition[] = [];
  private orderByFields: string[] = [];
  private limitValue: number | null = null;
  private offsetValue: number | null = null;
  private params: any[] = [];
  private unionQueries: QueryBuilder[] = [];
  private subQueries: SubQuery[] = [];
  private cteQueries: Map<string, QueryBuilder> = new Map();
  private dao: UniversalDAO | null = null;

  constructor(dao?: UniversalDAO) {
    this.dao = dao || null;
  }

  static table(name: string, dao?: UniversalDAO): QueryBuilder {
    const builder = new QueryBuilder(dao);
    builder.tableName = name;
    return builder;
  }

  static from(name: string, dao?: UniversalDAO): QueryBuilder {
    return QueryBuilder.table(name, dao);
  }

  // SELECT operations
  select(fields: string | string[]): QueryBuilder {
    this.selectFields = Array.isArray(fields) ? fields : [fields];
    return this;
  }

  selectRaw(raw: string): QueryBuilder {
    this.selectFields = [raw];
    return this;
  }

  selectDistinct(fields: string | string[]): QueryBuilder {
    const fieldList = Array.isArray(fields) ? fields.join(', ') : fields;
    this.selectFields = [`DISTINCT ${fieldList}`];
    return this;
  }

  // JOIN operations
  join(table: string, condition: string, type: JoinClause['type'] = 'INNER'): QueryBuilder {
    this.joinClauses.push({ type, table, condition });
    return this;
  }

  innerJoin(table: string, condition: string): QueryBuilder {
    return this.join(table, condition, 'INNER');
  }

  leftJoin(table: string, condition: string): QueryBuilder {
    return this.join(table, condition, 'LEFT');
  }

  rightJoin(table: string, condition: string): QueryBuilder {
    return this.join(table, condition, 'RIGHT');
  }

  fullOuterJoin(table: string, condition: string): QueryBuilder {
    return this.join(table, condition, 'FULL OUTER');
  }

  // WHERE conditions
  where(field: string, operator: string, value?: any): QueryBuilder;
  where(field: string, value: any): QueryBuilder;
  where(conditions: Record<string, any>): QueryBuilder;
  where(fieldOrConditions: string | Record<string, any>, operatorOrValue?: string | any, value?: any): QueryBuilder {
    if (typeof fieldOrConditions === 'object') {
      // Handle object of conditions
      Object.entries(fieldOrConditions).forEach(([field, val]) => {
        this.whereConditions.push({ field, operator: '=', value: val });
      });
      return this;
    }

    let operator = '=';
    let actualValue = operatorOrValue;

    if (arguments.length === 3) {
      operator = operatorOrValue;
      actualValue = value;
    }

    this.whereConditions.push({ 
      field: fieldOrConditions, 
      operator, 
      value: actualValue 
    });
    
    return this;
  }

  whereEquals(field: string, value: any): QueryBuilder {
    return this.where(field, '=', value);
  }

  whereNot(field: string, value: any): QueryBuilder {
    return this.where(field, '!=', value);
  }

  whereLike(field: string, value: string): QueryBuilder {
    return this.where(field, 'LIKE', value);
  }

  whereNotLike(field: string, value: string): QueryBuilder {
    return this.where(field, 'NOT LIKE', value);
  }

  whereIn(field: string, values: any[]): QueryBuilder {
    this.whereConditions.push({ field, operator: 'IN', value: values });
    return this;
  }

  whereNotIn(field: string, values: any[]): QueryBuilder {
    this.whereConditions.push({ field, operator: 'NOT IN', value: values });
    return this;
  }

  whereBetween(field: string, min: any, max: any): QueryBuilder {
    this.whereConditions.push({ field, operator: 'BETWEEN', value: [min, max] });
    return this;
  }

  whereNotBetween(field: string, min: any, max: any): QueryBuilder {
    this.whereConditions.push({ field, operator: 'NOT BETWEEN', value: [min, max] });
    return this;
  }

  whereNull(field: string): QueryBuilder {
    this.whereConditions.push({ field, operator: 'IS NULL', value: null });
    return this;
  }

  whereNotNull(field: string): QueryBuilder {
    this.whereConditions.push({ field, operator: 'IS NOT NULL', value: null });
    return this;
  }

  whereExists(subquery: QueryBuilder): QueryBuilder {
    this.whereConditions.push({ 
      field: '', 
      operator: 'EXISTS', 
      value: subquery 
    });
    return this;
  }

  whereNotExists(subquery: QueryBuilder): QueryBuilder {
    this.whereConditions.push({ 
      field: '', 
      operator: 'NOT EXISTS', 
      value: subquery 
    });
    return this;
  }

  // OR WHERE conditions
  orWhere(field: string, operator: string, value?: any): QueryBuilder;
  orWhere(field: string, value: any): QueryBuilder;
  orWhere(field: string, operatorOrValue?: string | any, value?: any): QueryBuilder {
    // Implementation similar to where() but with OR logic
    // This would require refactoring the condition structure to support AND/OR
    return this.where(field, operatorOrValue as string, value);
  }

  // GROUP BY and HAVING
  groupBy(fields: string | string[]): QueryBuilder {
    this.groupByFields = Array.isArray(fields) ? fields : [fields];
    return this;
  }

  having(field: string, operator: string, value?: any): QueryBuilder {
    let actualOperator = '=';
    let actualValue = operator;

    if (arguments.length === 3) {
      actualOperator = operator;
      actualValue = value;
    }

    this.havingConditions.push({ 
      field, 
      operator: actualOperator, 
      value: actualValue 
    });
    return this;
  }

  havingCount(field: string, operator: string, value: number): QueryBuilder {
    return this.having(`COUNT(${field})`, operator, value);
  }

  // ORDER BY
  orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): QueryBuilder {
    this.orderByFields.push(`${field} ${direction}`);
    return this;
  }

  orderByDesc(field: string): QueryBuilder {
    return this.orderBy(field, 'DESC');
  }

  orderByRaw(raw: string): QueryBuilder {
    this.orderByFields.push(raw);
    return this;
  }

  latest(field: string = 'created_at'): QueryBuilder {
    return this.orderByDesc(field);
  }

  oldest(field: string = 'created_at'): QueryBuilder {
    return this.orderBy(field, 'ASC');
  }

  // LIMIT and OFFSET
  limit(count: number): QueryBuilder {
    this.limitValue = count;
    return this;
  }

  offset(count: number): QueryBuilder {
    this.offsetValue = count;
    return this;
  }

  skip(count: number): QueryBuilder {
    return this.offset(count);
  }

  take(count: number): QueryBuilder {
    return this.limit(count);
  }

  firstRow(): QueryBuilder {
    return this.limit(1);
  }

  paginate(page: number, perPage: number): QueryBuilder {
    this.limitValue = perPage;
    this.offsetValue = (page - 1) * perPage;
    return this;
  }

  // UNION operations
  union(query: QueryBuilder): QueryBuilder {
    this.unionQueries.push(query);
    return this;
  }

  unionAll(query: QueryBuilder): QueryBuilder {
    // Note: SQLite doesn't differentiate UNION and UNION ALL like other databases
    return this.union(query);
  }

  // CTE (Common Table Expressions)
  with(alias: string, query: QueryBuilder): QueryBuilder {
    this.cteQueries.set(alias, query);
    return this;
  }

  // Subqueries
  whereSubQuery(field: string, operator: string, subquery: QueryBuilder): QueryBuilder {
    this.subQueries.push({ query: subquery, alias: '' });
    this.whereConditions.push({ field, operator, value: subquery });
    return this;
  }

  // Aggregation functions
  count(field: string = '*'): QueryBuilder {
    this.selectFields = [`COUNT(${field}) as count`];
    return this;
  }

  sum(field: string): QueryBuilder {
    this.selectFields = [`SUM(${field}) as sum`];
    return this;
  }

  avg(field: string): QueryBuilder {
    this.selectFields = [`AVG(${field}) as avg`];
    return this;
  }

  max(field: string): QueryBuilder {
    this.selectFields = [`MAX(${field}) as max`];
    return this;
  }

  min(field: string): QueryBuilder {
    this.selectFields = [`MIN(${field}) as min`];
    return this;
  }

  // SQL Generation
  toSQL(): { sql: string; params: any[] } {
    let sql = '';
    const params: any[] = [];

    // CTE queries
    if (this.cteQueries.size > 0) {
      const cteList: string[] = [];
      this.cteQueries.forEach((query, alias) => {
        const { sql: cteSql, params: cteParams } = query.toSQL();
        cteList.push(`${alias} AS (${cteSql})`);
        params.push(...cteParams);
      });
      sql += `WITH ${cteList.join(', ')} `;
    }

    // Main SELECT
    sql += `SELECT ${this.selectFields.join(', ')} FROM ${this.tableName}`;

    // JOINs
    if (this.joinClauses.length > 0) {
      this.joinClauses.forEach(join => {
        sql += ` ${join.type} JOIN ${join.table} ON ${join.condition}`;
      });
    }

    // WHERE conditions
    if (this.whereConditions.length > 0) {
      const conditions: string[] = [];
      this.whereConditions.forEach(condition => {
        const { clause, conditionParams } = this.buildCondition(condition);
        conditions.push(clause);
        params.push(...conditionParams);
      });
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    // GROUP BY
    if (this.groupByFields.length > 0) {
      sql += ` GROUP BY ${this.groupByFields.join(', ')}`;
    }

    // HAVING
    if (this.havingConditions.length > 0) {
      const conditions: string[] = [];
      this.havingConditions.forEach(condition => {
        const { clause, conditionParams } = this.buildCondition(condition);
        conditions.push(clause);
        params.push(...conditionParams);
      });
      sql += ` HAVING ${conditions.join(' AND ')}`;
    }

    // ORDER BY
    if (this.orderByFields.length > 0) {
      sql += ` ORDER BY ${this.orderByFields.join(', ')}`;
    }

    // LIMIT
    if (this.limitValue !== null) {
      sql += ` LIMIT ${this.limitValue}`;
    }

    // OFFSET
    if (this.offsetValue !== null) {
      sql += ` OFFSET ${this.offsetValue}`;
    }

    // UNION queries
    if (this.unionQueries.length > 0) {
      this.unionQueries.forEach(unionQuery => {
        const { sql: unionSql, params: unionParams } = unionQuery.toSQL();
        sql += ` UNION ${unionSql}`;
        params.push(...unionParams);
      });
    }

    return { sql, params };
  }

  private buildCondition(condition: QueryCondition): { clause: string; conditionParams: any[] } {
    const { field, operator, value } = condition;
    const params: any[] = [];

    switch (operator.toUpperCase()) {
      case 'IN':
      case 'NOT IN':
        const placeholders = (value as any[]).map(() => '?').join(', ');
        params.push(...(value as any[]));
        return { 
          clause: `${field} ${operator} (${placeholders})`, 
          conditionParams: params 
        };

      case 'BETWEEN':
      case 'NOT BETWEEN':
        params.push(value[0], value[1]);
        return { 
          clause: `${field} ${operator} ? AND ?`, 
          conditionParams: params 
        };

      case 'IS NULL':
      case 'IS NOT NULL':
        return { 
          clause: `${field} ${operator}`, 
          conditionParams: [] 
        };

      case 'EXISTS':
      case 'NOT EXISTS':
        const { sql: subSql, params: subParams } = (value as QueryBuilder).toSQL();
        params.push(...subParams);
        return { 
          clause: `${operator} (${subSql})`, 
          conditionParams: params 
        };

      default:
        if (value instanceof QueryBuilder) {
          const { sql: subSql, params: subParams } = value.toSQL();
          params.push(...subParams);
          return { 
            clause: `${field} ${operator} (${subSql})`, 
            conditionParams: params 
          };
        }
        params.push(value);
        return { 
          clause: `${field} ${operator} ?`, 
          conditionParams: params 
        };
    }
  }

  // Execution methods (require DAO)
  async get(): Promise<SQLiteRow[]> {
    if (!this.dao) {
      throw new Error('DAO instance required for query execution');
    }
    const { sql, params } = this.toSQL();
    const result = await this.dao.execute(sql, params);
    return result.rows;
  }

  async first(): Promise<SQLiteRow | null> {
    this.limit(1);
    const results = await this.get(); // This will apply the limit(1) set by firstRow()
    return results.length > 0 ? results[0] : null;
  }

  async pluck(column: string): Promise<any[]> {
    this.select(column);
    const results = await this.get();
    return results.map(row => row[column]);
  }

  async exists(): Promise<boolean> {
    this.select('1').limit(1);
    const results = await this.get();
    return results.length > 0;
  }

  async countResult(): Promise<number> {
    this.count();
    const result = await this.first();
    return result ? result.count : 0;
  }

  // Static helper methods for DML operations
  static insert(tableName: string, data: Record<string, any>): { sql: string; params: any[] } {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map(() => '?').join(', ');

    return {
      sql: `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${placeholders})`,
      params: values
    };
  }

  static insertMany(tableName: string, dataArray: Record<string, any>[]): { sql: string; params: any[] } {
    if (dataArray.length === 0) {
      throw new Error('Data array cannot be empty');
    }

    const fields = Object.keys(dataArray[0]);
    const placeholders = fields.map(() => '?').join(', ');
    const valueGroups = dataArray.map(() => `(${placeholders})`).join(', ');

    const allValues = dataArray.flatMap(data => Object.values(data));

    return {
      sql: `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES ${valueGroups}`,
      params: allValues
    };
  }

  static update(tableName: string, data: Record<string, any>, where: string, whereParams: any[] = []): { sql: string; params: any[] } {
    const sets = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const params = [...Object.values(data), ...whereParams];

    return {
      sql: `UPDATE ${tableName} SET ${sets} WHERE ${where}`,
      params
    };
  }

  static delete(tableName: string, where: string, whereParams: any[] = []): { sql: string; params: any[] } {
    return {
      sql: `DELETE FROM ${tableName} WHERE ${where}`,
      params: whereParams
    };
  }

  static upsert(tableName: string, data: Record<string, any>, conflictColumns: string[]): { sql: string; params: any[] } {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map(() => '?').join(', ');

    const updateColumns = fields.filter(field => !conflictColumns.includes(field));
    const updateClause = updateColumns.length > 0
      ? updateColumns.map(col => `${col} = excluded.${col}`).join(', ')
      : '';

    let sql = `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${placeholders})`;

    if (updateColumns.length > 0) {
      sql += ` ON CONFLICT(${conflictColumns.join(', ')}) DO UPDATE SET ${updateClause}`;
    } else {
      sql += ` ON CONFLICT(${conflictColumns.join(', ')}) DO NOTHING`;
    }

    return { sql, params: values };
  }

  // Utility methods
  clone(): QueryBuilder {
    if (!this.dao) throw new Error('DAO instance required for cloning QueryBuilder');
    const cloned = new QueryBuilder(this.dao);
    cloned.tableName = this.tableName;
    cloned.selectFields = [...this.selectFields];
    cloned.joinClauses = [...this.joinClauses];
    cloned.whereConditions = [...this.whereConditions];
    cloned.groupByFields = [...this.groupByFields];
    cloned.havingConditions = [...this.havingConditions];
    cloned.orderByFields = [...this.orderByFields];
    cloned.limitValue = this.limitValue;
    cloned.offsetValue = this.offsetValue;
    cloned.unionQueries = [...this.unionQueries];
    cloned.subQueries = [...this.subQueries];
    cloned.cteQueries = new Map(this.cteQueries);
    return cloned;
  }

  toRawSQL(): string {
    const { sql, params } = this.toSQL();
    let rawSql = sql;
    params.forEach(param => {
      if (typeof param === 'string') {
        rawSql = rawSql.replace('?', `'${param.replace(/'/g, "''")}'`);
      } else if (param === null || param === undefined) {
        rawSql = rawSql.replace('?', 'NULL');
      } else {
        rawSql = rawSql.replace('?', String(param));
      }
    });
    return rawSql;
  }

  explain(): QueryBuilder {
    this.selectFields = ['EXPLAIN QUERY PLAN ' + this.selectFields.join(', ')];
    return this;
  }
}