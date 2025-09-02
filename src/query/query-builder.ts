// src/query/query-builder.ts
export class QueryBuilder {
  private tableName = '';
  private selectFields: string[] = ['*'];
  private joinClauses: string[] = [];
  private whereConditions: string[] = [];
  private groupByFields: string[] = [];
  private havingConditions: string[] = [];
  private orderByFields: string[] = [];
  private limitValue: number | null = null;
  private offsetValue: number | null = null;
  private params: any[] = [];

  static table(name: string): QueryBuilder {
    const builder = new QueryBuilder();
    builder.tableName = name;
    return builder;
  }

  select(fields: string | string[]): QueryBuilder {
    this.selectFields = Array.isArray(fields) ? fields : [fields];
    return this;
  }

  join(table: string, condition: string, type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' = 'INNER'): QueryBuilder {
    this.joinClauses.push(`${type} JOIN ${table} ON ${condition}`);
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

  where(condition: string, value?: any): QueryBuilder {
    this.whereConditions.push(condition);
    if (value !== undefined) {
      this.params.push(value);
    }
    return this;
  }

  whereEquals(field: string, value: any): QueryBuilder {
    return this.where(`${field} = ?`, value);
  }

  whereLike(field: string, value: string): QueryBuilder {
    return this.where(`${field} LIKE ?`, value);
  }

  whereIn(field: string, values: any[]): QueryBuilder {
    const placeholders = values.map(() => '?').join(', ');
    this.whereConditions.push(`${field} IN (${placeholders})`);
    this.params.push(...values);
    return this;
  }

  whereBetween(field: string, min: any, max: any): QueryBuilder {
    return this.where(`${field} BETWEEN ? AND ?`, min).where('', max);
  }

  whereNull(field: string): QueryBuilder {
    return this.where(`${field} IS NULL`);
  }

  whereNotNull(field: string): QueryBuilder {
    return this.where(`${field} IS NOT NULL`);
  }

  groupBy(fields: string | string[]): QueryBuilder {
    this.groupByFields = Array.isArray(fields) ? fields : [fields];
    return this;
  }

  having(condition: string, value?: any): QueryBuilder {
    this.havingConditions.push(condition);
    if (value !== undefined) {
      this.params.push(value);
    }
    return this;
  }

  orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): QueryBuilder {
    this.orderByFields.push(`${field} ${direction}`);
    return this;
  }

  orderByDesc(field: string): QueryBuilder {
    return this.orderBy(field, 'DESC');
  }

  limit(count: number): QueryBuilder {
    this.limitValue = count;
    return this;
  }

  offset(count: number): QueryBuilder {
    this.offsetValue = count;
    return this;
  }

  paginate(page: number, perPage: number): QueryBuilder {
    this.limitValue = perPage;
    this.offsetValue = (page - 1) * perPage;
    return this;
  }

  toSQL(): { sql: string; params: any[] } {
    let sql = `SELECT ${this.selectFields.join(', ')} FROM ${this.tableName}`;
    
    if (this.joinClauses.length > 0) {
      sql += ` ${this.joinClauses.join(' ')}`;
    }
    
    if (this.whereConditions.length > 0) {
      sql += ` WHERE ${this.whereConditions.join(' AND ')}`;
    }
    
    if (this.groupByFields.length > 0) {
      sql += ` GROUP BY ${this.groupByFields.join(', ')}`;
    }
    
    if (this.havingConditions.length > 0) {
      sql += ` HAVING ${this.havingConditions.join(' AND ')}`;
    }
    
    if (this.orderByFields.length > 0) {
      sql += ` ORDER BY ${this.orderByFields.join(', ')}`;
    }
    
    if (this.limitValue !== null) {
      sql += ` LIMIT ${this.limitValue}`;
    }
    
    if (this.offsetValue !== null) {
      sql += ` OFFSET ${this.offsetValue}`;
    }
    
    return { sql, params: this.params };
  }

  // Static helper methods for INSERT, UPDATE, DELETE
  static insert(tableName: string, data: Record<string, any>): { sql: string; params: any[] } {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map(() => '?').join(', ');
    
    return {
      sql: `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${placeholders})`,
      params: values
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
}