export class QueryBuilder {
  private tableName = '';
  private selectFields: string[] = ['*'];
  private whereConditions: string[] = [];
  private orderByFields: string[] = [];
  private limitValue: number | null = null;
  private offsetValue: number | null = null;

  static table(name: string): QueryBuilder {
    const builder = new QueryBuilder();
    builder.tableName = name;
    return builder;
  }

  select(fields: string | string[]): QueryBuilder {
    this.selectFields = Array.isArray(fields) ? fields : [fields];
    return this;
  }

  where(condition: string): QueryBuilder {
    this.whereConditions.push(condition);
    return this;
  }

  orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): QueryBuilder {
    this.orderByFields.push(`${field} ${direction}`);
    return this;
  }

  limit(count: number): QueryBuilder {
    this.limitValue = count;
    return this;
  }

  offset(count: number): QueryBuilder {
    this.offsetValue = count;
    return this;
  }

  toSQL(): string {
    let sql = `SELECT ${this.selectFields.join(', ')} FROM ${this.tableName}`;
    
    if (this.whereConditions.length > 0) {
      sql += ` WHERE ${this.whereConditions.join(' AND ')}`;
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
    
    return sql;
  }

  // Insert methods
  static insert(tableName: string, data: Record<string, any>): string {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map(() => '?').join(', ');
    
    return `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${placeholders})`;
  }

  static update(tableName: string, data: Record<string, any>, where: string): string {
    const sets = Object.keys(data).map(key => `${key} = ?`).join(', ');
    return `UPDATE ${tableName} SET ${sets} WHERE ${where}`;
  }

  static delete(tableName: string, where: string): string {
    return `DELETE FROM ${tableName} WHERE ${where}`;
  }
}
