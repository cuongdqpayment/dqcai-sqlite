
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
    this.orderByFields.push(${field} );
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
    let sql = SELECT  FROM ;
    
    if (this.whereConditions.length > 0) {
      sql +=  WHERE ;
    }
    
    if (this.orderByFields.length > 0) {
      sql +=  ORDER BY ;
    }
    
    if (this.limitValue !== null) {
      sql +=  LIMIT ;
    }
    
    if (this.offsetValue !== null) {
      sql +=  OFFSET ;
    }
    
    return sql;
  }

  // Insert methods
  static insert(tableName: string, data: Record<string, any>): string {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map(() => '?').join(', ');
    
    return INSERT INTO  () VALUES ();
  }

  static update(tableName: string, data: Record<string, any>, where: string): string {
    const sets = Object.keys(data).map(key => ${key} = ?).join(', ');
    return UPDATE  SET  WHERE ;
  }

  static delete(tableName: string, where: string): string {
    return DELETE FROM  WHERE ;
  }
}

