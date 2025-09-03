// src/utils/csv-import.ts
import { UniversalDAO } from '../core/universal-dao';
import { ImportOptions, ImportResult, ColumnMapping } from '../types';

export interface CSVParseOptions {
  delimiter?: string;
  quote?: string;
  escape?: string;
  hasHeader?: boolean;
  skipEmptyLines?: boolean;
  trimWhitespace?: boolean;
  encoding?: string;
}

export interface CSVImportOptions extends CSVParseOptions {
  columnMappings?: Record<string, string> | ColumnMapping[];
  transform?: Record<string, (value: any, row: Record<string, any>, index: number) => any>;
  validate?: Record<string, (value: any, row: Record<string, any>, index: number) => boolean | string>;
  onRowParsed?: (row: Record<string, any>, index: number) => Record<string, any> | null;
  onRowError?: (error: Error, row: Record<string, any>, index: number) => boolean; // return true to skip, false to abort
  maxRows?: number;
  startFromRow?: number;
  dateFormats?: string[];
  booleanValues?: {
    true: string[];
    false: string[];
  };
}

export interface CSVParseResult {
  data: Record<string, any>[];
  headers: string[];
  totalRows: number;
  parsedRows: number;
  skippedRows: number;
  errors: Array<{
    row: number;
    column?: string;
    error: string;
    rawData?: string;
  }>;
}

export class CSVImporter {
  private dao: UniversalDAO;

  constructor(dao: UniversalDAO) {
    this.dao = dao;
  }

  /**
   * Parse CSV string into structured data
   */
  parseCSV(csvData: string, options: CSVParseOptions = {}): CSVParseResult {
    const opts = {
      delimiter: ',',
      quote: '"',
      escape: '"',
      hasHeader: true,
      skipEmptyLines: true,
      trimWhitespace: true,
      ...options,
    };

    const result: CSVParseResult = {
      data: [],
      headers: [],
      totalRows: 0,
      parsedRows: 0,
      skippedRows: 0,
      errors: [],
    };

    if (!csvData || csvData.trim().length === 0) {
      result.errors.push({
        row: 0,
        error: 'CSV data is empty',
      });
      return result;
    }

    try {
      const lines = this.splitCSVLines(csvData, opts);
      result.totalRows = lines.length;

      if (lines.length === 0) {
        result.errors.push({
          row: 0,
          error: 'No valid lines found in CSV data',
        });
        return result;
      }

      // Parse headers
      let dataStartIndex = 0;
      if (opts.hasHeader && lines.length > 0) {
        try {
          result.headers = this.parseCSVRow(lines[0], opts);
          if (opts.trimWhitespace) {
            result.headers = result.headers.map(h => h.trim());
          }
          dataStartIndex = 1;
        } catch (error) {
          result.errors.push({
            row: 1,
            error: `Failed to parse header row: ${(error as Error).message}`,
            rawData: lines[0],
          });
          return result;
        }
      } else {
        // Generate default headers
        const firstRow = this.parseCSVRow(lines[0], opts);
        result.headers = firstRow.map((_, index) => `column_${index + 1}`);
      }

      // Parse data rows
      for (let i = dataStartIndex; i < lines.length; i++) {
        const lineNumber = i + 1;
        const line = lines[i];

        if (opts.skipEmptyLines && line.trim().length === 0) {
          result.skippedRows++;
          continue;
        }

        try {
          const values = this.parseCSVRow(line, opts);
          const row: Record<string, any> = {};

          // Map values to headers
          result.headers.forEach((header, index) => {
            let value = values[index] || null;
            
            if (opts.trimWhitespace && typeof value === 'string') {
              value = value.trim();
            }

            // Convert empty strings to null
            if (value === '') {
              value = null;
            }

            row[header] = value;
          });

          result.data.push(row);
          result.parsedRows++;
        } catch (error) {
          result.errors.push({
            row: lineNumber,
            error: `Failed to parse row: ${(error as Error).message}`,
            rawData: line,
          });
          result.skippedRows++;
        }
      }

      return result;
    } catch (error) {
      result.errors.push({
        row: 0,
        error: `CSV parsing failed: ${(error as Error).message}`,
      });
      return result;
    }
  }

  /**
   * Advanced CSV import with comprehensive options
   */
  async importFromCSV(
    tableName: string,
    csvData: string,
    options: CSVImportOptions & Partial<ImportOptions> = {}
  ): Promise<ImportResult & { parseResult: CSVParseResult }> {
    const startTime = Date.now();

    // Parse CSV first
    const parseResult = this.parseCSV(csvData, options);
    
    if (parseResult.errors.length > 0 && parseResult.data.length === 0) {
      throw new Error(`CSV parsing failed: ${parseResult.errors.map(e => e.error).join('; ')}`);
    }

    let processedData = parseResult.data;

    // Apply row limits
    if (options.startFromRow && options.startFromRow > 0) {
      processedData = processedData.slice(options.startFromRow);
    }
    
    if (options.maxRows && options.maxRows > 0) {
      processedData = processedData.slice(0, options.maxRows);
    }

    // Apply column mappings
    if (options.columnMappings) {
      processedData = this.applyColumnMappings(processedData, options.columnMappings);
    }

    // Apply transformations and validations
    const transformedData: Record<string, any>[] = [];
    const transformErrors: Array<{ row: number; error: string }> = [];

    for (let i = 0; i < processedData.length; i++) {
      const row = processedData[i];
      let transformedRow = { ...row };

      try {
        // Apply onRowParsed callback
        if (options.onRowParsed) {
          const result = options.onRowParsed(transformedRow, i);
          if (result === null) {
            continue; // Skip this row
          }
          transformedRow = result;
        }

        // Apply field transformations
        if (options.transform) {
          for (const [field, transformer] of Object.entries(options.transform)) {
            if (transformedRow.hasOwnProperty(field)) {
              try {
                transformedRow[field] = transformer(transformedRow[field], transformedRow, i);
              } catch (error) {
                transformErrors.push({
                  row: i + 1,
                  error: `Transform error for field '${field}': ${(error as Error).message}`,
                });
                
                if (options.onRowError) {
                  const shouldSkip = options.onRowError(error as Error, transformedRow, i);
                  if (!shouldSkip) {
                    throw error;
                  }
                  continue;
                }
                throw error;
              }
            }
          }
        }

        // Apply field validations
        if (options.validate) {
          for (const [field, validator] of Object.entries(options.validate)) {
            if (transformedRow.hasOwnProperty(field)) {
              try {
                const validationResult = validator(transformedRow[field], transformedRow, i);
                if (validationResult !== true) {
                  const errorMessage = typeof validationResult === 'string' 
                    ? validationResult 
                    : `Validation failed for field '${field}'`;
                  
                  const validationError = new Error(errorMessage);
                  
                  if (options.onRowError) {
                    const shouldSkip = options.onRowError(validationError, transformedRow, i);
                    if (!shouldSkip) {
                      throw validationError;
                    }
                    continue;
                  }
                  throw validationError;
                }
              } catch (error) {
                transformErrors.push({
                  row: i + 1,
                  error: `Validation error for field '${field}': ${(error as Error).message}`,
                });
                throw error;
              }
            }
          }
        }

        // Apply automatic type conversion
        transformedRow = this.autoConvertTypes(transformedRow, options);
        
        transformedData.push(transformedRow);
      } catch (error) {
        if (options.onRowError) {
          const shouldSkip = options.onRowError(error as Error, transformedRow, i);
          if (shouldSkip) {
            continue;
          }
        }
        throw error;
      }
    }

    // Import to database
    const importResult = await this.dao.importData({
      tableName,
      data: transformedData,
      batchSize: options.batchSize || 1000,
      onProgress: options.onProgress,
      onError: options.onError,
      skipErrors: options.skipErrors || false,
      validateData: options.validateData !== false,
      updateOnConflict: options.updateOnConflict || false,
      conflictColumns: options.conflictColumns,
      includeAutoIncrementPK: options.includeAutoIncrementPK || false,
    });

    // Combine parse errors with import errors
    const allErrors = [
      ...parseResult.errors.map(e => ({
        rowIndex: e.row - 1,
        error: e.error,
        rowData: e.rawData ? { _raw: e.rawData } : {},
      })),
      ...transformErrors.map(e => ({
        rowIndex: e.row - 1,
        error: e.error,
        rowData: {},
      })),
      ...importResult.errors,
    ];

    return {
      ...importResult,
      errors: allErrors,
      parseResult,
    };
  }

  /**
   * Import CSV from file path (Node.js/Deno environments)
   */
  async importFromFile(
    tableName: string,
    filePath: string,
    options: CSVImportOptions & Partial<ImportOptions> = {}
  ): Promise<ImportResult & { parseResult: CSVParseResult }> {
    let csvData: string;

    try {
      // Try Deno first
      if (typeof globalThis.Deno !== 'undefined' && globalThis.Deno.readTextFile) {
        csvData = await globalThis.Deno.readTextFile(filePath);
      }
      // Try Node.js
      else if (typeof require !== 'undefined') {
        const fs = require('fs').promises;
        csvData = await fs.readFile(filePath, options.encoding || 'utf8');
      }
      // Try browser File API (if file is provided as File object)
      else if (typeof filePath === 'object' && 'text' in filePath) {
        csvData = await (filePath as any).text();
      }
      else {
        throw new Error('File reading not supported in this environment');
      }
    } catch (error) {
      throw new Error(`Failed to read CSV file '${filePath}': ${(error as Error).message}`);
    }

    return await this.importFromCSV(tableName, csvData, options);
  }

  /**
   * Export table data to CSV format
   */
  async exportToCSV(
    tableName: string,
    options: {
      columns?: string[];
      where?: string;
      orderBy?: string;
      limit?: number;
      delimiter?: string;
      quote?: string;
      includeHeaders?: boolean;
      dateFormat?: string;
      nullValue?: string;
    } = {}
  ): Promise<string> {
    const opts = {
      delimiter: ',',
      quote: '"',
      includeHeaders: true,
      dateFormat: 'YYYY-MM-DD HH:mm:ss',
      nullValue: '',
      ...options,
    };

    // Build query
    let sql = `SELECT ${options.columns ? options.columns.join(', ') : '*'} FROM ${tableName}`;
    const params: any[] = [];

    if (options.where) {
      sql += ` WHERE ${options.where}`;
    }

    if (options.orderBy) {
      sql += ` ORDER BY ${options.orderBy}`;
    }

    if (options.limit) {
      sql += ` LIMIT ${options.limit}`;
    }

    // Execute query
    const result = await this.dao.execute(sql, params);
    
    if (result.rows.length === 0) {
      return opts.includeHeaders && options.columns 
        ? this.formatCSVRow(options.columns, opts) 
        : '';
    }

    const rows: string[] = [];

    // Add headers
    if (opts.includeHeaders) {
      const headers = options.columns || Object.keys(result.rows[0]);
      rows.push(this.formatCSVRow(headers, opts));
    }

    // Add data rows
    for (const row of result.rows) {
      const values = Object.values(row).map(value => {
        if (value === null || value === undefined) {
          return opts.nullValue;
        }
        if (value instanceof Date) {
          return this.formatDate(value, opts.dateFormat);
        }
        return String(value);
      });
      
      rows.push(this.formatCSVRow(values, opts));
    }

    return rows.join('\n');
  }

  // Private helper methods

  private splitCSVLines(csvData: string, options: CSVParseOptions): string[] {
    const lines: string[] = [];
    let currentLine = '';
    let inQuotes = false;
    let quoteCount = 0;

    for (let i = 0; i < csvData.length; i++) {
      const char = csvData[i];
      const nextChar = csvData[i + 1];

      if (char === options.quote) {
        quoteCount++;
        inQuotes = !inQuotes;
        
        // Handle escaped quotes
        if (nextChar === options.quote && options.escape === options.quote) {
          currentLine += char + nextChar;
          i++; // Skip next quote
          quoteCount++;
          continue;
        }
      }

      if (char === '\n' && !inQuotes) {
        if (options.skipEmptyLines && currentLine.trim().length === 0) {
          currentLine = '';
          continue;
        }
        lines.push(currentLine);
        currentLine = '';
        inQuotes = false;
        quoteCount = 0;
      } else if (char === '\r' && nextChar === '\n' && !inQuotes) {
        if (options.skipEmptyLines && currentLine.trim().length === 0) {
          currentLine = '';
          i++; // Skip \n
          continue;
        }
        lines.push(currentLine);
        currentLine = '';
        i++; // Skip \n
        inQuotes = false;
        quoteCount = 0;
      } else {
        currentLine += char;
      }
    }

    // Add last line if it exists
    if (currentLine.length > 0) {
      if (!options.skipEmptyLines || currentLine.trim().length > 0) {
        lines.push(currentLine);
      }
    }

    return lines;
  }

  private parseCSVRow(line: string, options: CSVParseOptions): string[] {
    const values: string[] = [];
    let currentValue = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === options.quote) {
        if (inQuotes && nextChar === options.quote && options.escape === options.quote) {
          // Escaped quote
          currentValue += options.quote;
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === options.delimiter && !inQuotes) {
        values.push(currentValue);
        currentValue = '';
      } else {
        currentValue += char;
      }
    }

    // Add last value
    values.push(currentValue);

    return values;
  }

  private formatCSVRow(values: string[], options: { delimiter: string; quote: string }): string {
    return values.map(value => {
      const strValue = String(value);
      
      // Quote if contains delimiter, quote, or newline
      if (strValue.includes(options.delimiter) || 
          strValue.includes(options.quote) || 
          strValue.includes('\n') || 
          strValue.includes('\r')) {
        return options.quote + strValue.replace(new RegExp(options.quote, 'g'), options.quote + options.quote) + options.quote;
      }
      
      return strValue;
    }).join(options.delimiter);
  }

  private applyColumnMappings(
    data: Record<string, any>[], 
    mappings: Record<string, string> | ColumnMapping[]
  ): Record<string, any>[] {
    if (Array.isArray(mappings)) {
      // ColumnMapping[] format
      return data.map(row => {
        const newRow: Record<string, any> = {};
        
        mappings.forEach(mapping => {
          if (row.hasOwnProperty(mapping.sourceColumn)) {
            let value = row[mapping.sourceColumn];
            
            if (mapping.transform) {
              value = mapping.transform(value);
            }
            
            newRow[mapping.targetColumn] = value;
          }
        });
        
        return newRow;
      });
    } else {
      // Record<string, string> format
      return data.map(row => {
        const newRow: Record<string, any> = {};
        
        Object.entries(row).forEach(([key, value]) => {
          const newKey = mappings[key] || key;
          newRow[newKey] = value;
        });
        
        return newRow;
      });
    }
  }

  private autoConvertTypes(
    row: Record<string, any>, 
    options: CSVImportOptions
  ): Record<string, any> {
    const converted: Record<string, any> = {};

    Object.entries(row).forEach(([key, value]) => {
      converted[key] = this.convertValue(value, options);
    });

    return converted;
  }

  private convertValue(value: any, options: CSVImportOptions): any {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const strValue = String(value).trim();

    // Boolean conversion
    if (options.booleanValues) {
      const lowerValue = strValue.toLowerCase();
      if (options.booleanValues.true.some(t => t.toLowerCase() === lowerValue)) {
        return true;
      }
      if (options.booleanValues.false.some(f => f.toLowerCase() === lowerValue)) {
        return false;
      }
    } else {
      // Default boolean values
      const lowerValue = strValue.toLowerCase();
      if (['true', '1', 'yes', 'on'].includes(lowerValue)) {
        return true;
      }
      if (['false', '0', 'no', 'off'].includes(lowerValue)) {
        return false;
      }
    }

    // Number conversion
    if (/^-?\d+$/.test(strValue)) {
      const intValue = parseInt(strValue);
      if (!isNaN(intValue)) {
        return intValue;
      }
    }

    if (/^-?\d*\.?\d+$/.test(strValue)) {
      const floatValue = parseFloat(strValue);
      if (!isNaN(floatValue)) {
        return floatValue;
      }
    }

    // Date conversion
    if (options.dateFormats) {
      for (const format of options.dateFormats) {
        const date = this.parseDate(strValue, format);
        if (date) {
          return date.toISOString();
        }
      }
    } else {
      // Default date parsing
      const date = new Date(strValue);
      if (!isNaN(date.getTime()) && strValue.match(/\d{4}-\d{2}-\d{2}/)) {
        return date.toISOString();
      }
    }

    return strValue;
  }

  private parseDate(dateString: string, format: string): Date | null {
    // Simple date format parsing - you might want to use a more robust library like date-fns
    try {
      // This is a simplified implementation
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }

  private formatDate(date: Date, format: string): string {
    // Simple date formatting - you might want to use a more robust library
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return format
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  /**
   * Static utility methods for parsing CSV values
   */
  static parseCSVValue(value: string, options: { 
    autoConvert?: boolean;
    booleanValues?: { true: string[]; false: string[] };
    dateFormats?: string[];
  } = {}): any {
    if (value === '' || value === null) return null;
    
    const opts = {
      autoConvert: true,
      booleanValues: {
        true: ['true', '1', 'yes', 'on'],
        false: ['false', '0', 'no', 'off']
      },
      ...options
    };

    if (!opts.autoConvert) {
      return value;
    }

    const strValue = String(value).trim().toLowerCase();

    // Boolean conversion
    if (opts.booleanValues.true.includes(strValue)) {
      return true;
    }
    if (opts.booleanValues.false.includes(strValue)) {
      return false;
    }

    // Number conversion
    if (/^-?\d+$/.test(value)) {
      const intValue = parseInt(value);
      if (!isNaN(intValue)) return intValue;
    }

    if (/^-?\d*\.?\d+$/.test(value)) {
      const floatValue = parseFloat(value);
      if (!isNaN(floatValue)) return floatValue;
    }

    // Date conversion
    const date = new Date(value);
    if (!isNaN(date.getTime()) && value.match(/\d{4}-\d{2}-\d{2}/)) {
      return date.toISOString();
    }

    return value;
  }

  /**
   * Validate CSV structure
   */
  static validateCSVStructure(csvData: string, options: CSVParseOptions = {}): {
    isValid: boolean;
    errors: string[];
    rowCount: number;
    columnCount: number;
    headers: string[];
  } {
    const result = {
      isValid: true,
      errors: [] as string[],
      rowCount: 0,
      columnCount: 0,
      headers: [] as string[],
    };

    try {
      const importer = new CSVImporter({} as UniversalDAO);
      const parseResult = importer.parseCSV(csvData, options);

      result.rowCount = parseResult.totalRows;
      result.headers = parseResult.headers;
      result.columnCount = parseResult.headers.length;

      if (parseResult.errors.length > 0) {
        result.isValid = false;
        result.errors = parseResult.errors.map(e => e.error);
      }

      if (parseResult.data.length === 0) {
        result.isValid = false;
        result.errors.push('No valid data rows found');
      }

      // Check for consistent column count
      const inconsistentRows = parseResult.data.filter(row => 
        Object.keys(row).length !== result.columnCount
      );

      if (inconsistentRows.length > 0) {
        result.isValid = false;
        result.errors.push(`${inconsistentRows.length} rows have inconsistent column count`);
      }

    } catch (error) {
      result.isValid = false;
      result.errors.push(`Validation failed: ${(error as Error).message}`);
    }

    return result;
  }
}