import { UniversalDAO } from "../core/universal-dao";
import { ImportOptions, ImportResult } from "../types";

// src/utils/csv-import.ts
export class CSVImporter {
  private dao: UniversalDAO;

  constructor(dao: UniversalDAO) {
    this.dao = dao;
  }

  async importFromCSV(
    tableName: string,
    csvData: string,
    options: {
      delimiter?: string;
      hasHeader?: boolean;
      columnMappings?: Record<string, string>;
      transform?: Record<string, (value: any) => any>;
    } & Partial<ImportOptions> = {}
  ): Promise<ImportResult> {
    const delimiter = options.delimiter || ',';
    const hasHeader = options.hasHeader !== false;
    
    const lines = csvData.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      throw new Error('CSV data is empty');
    }
    
    let headers: string[] = [];
    let dataStartIndex = 0;
    
    if (hasHeader) {
      headers = lines[0]
        .split(delimiter)
        .map(h => h.trim().replace(/^["']|["']$/g, ''));
      dataStartIndex = 1;
    } else {
      const firstRowCols = lines[0].split(delimiter).length;
      headers = Array.from({ length: firstRowCols }, (_, i) => `column_${i + 1}`);
    }
    
    const data: Record<string, any>[] = [];
    for (let i = dataStartIndex; i < lines.length; i++) {
      const values = lines[i]
        .split(delimiter)
        .map(v => v.trim().replace(/^["']|["']$/g, ''));
      
      const row: Record<string, any> = {};
      headers.forEach((header, index) => {
        let value: any = values[index] || null;
        
        // Apply column mapping
        const mappedHeader = options.columnMappings?.[header] || header;
        
        // Apply transformation
        if (options.transform?.[mappedHeader]) {
          value = options.transform[mappedHeader](value);
        }
        
        row[mappedHeader] = value;
      });
      
      data.push(row);
    }
    
    return await this.dao.importData({
      tableName,
      data,
      ...options
    });
  }

  static parseCSVValue(value: string): any {
    if (value === '' || value === null) return null;
    
    // Try to parse as number
    if (/^-?\d+\.?\d*$/.test(value)) {
      return value.includes('.') ? parseFloat(value) : parseInt(value);
    }
    
    // Try to parse as boolean
    const lower = value.toLowerCase();
    if (lower === 'true' || lower === 'false') {
      return lower === 'true';
    }
    
    // Try to parse as date
    const date = new Date(value);
    if (!isNaN(date.getTime()) && value.match(/^\d{4}-\d{2}-\d{2}/)) {
      return date.toISOString();
    }
    
    return value;
  }
}