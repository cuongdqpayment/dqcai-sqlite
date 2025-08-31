import { SQLiteAdapter, SQLiteConnection, SQLiteConfig } from './types';
import { NodeAdapter } from './adapters/node-adapter';
import { BrowserAdapter } from './adapters/browser-adapter';
import { DenoAdapter } from './adapters/deno-adapter';
import { BunAdapter } from './adapters/bun-adapter';
import { ReactNativeAdapter } from './adapters/react-native-adapter';
export class SQLiteManager {
  private adapters: SQLiteAdapter[] = [];
  private currentAdapter: SQLiteAdapter | null = null;

  constructor() {
    this.adapters = [
      new ReactNativeAdapter(), // Check React Native first
      new BunAdapter(),
      new DenoAdapter(),
      new NodeAdapter(),
      new BrowserAdapter()
    ];
  }

  private detectEnvironment(): SQLiteAdapter {
    for (const adapter of this.adapters) {
      if (adapter.isSupported()) {
        return adapter;
      }
    }
    throw new Error('No supported SQLite adapter found for this environment');
  }

  async connect(config: string | SQLiteConfig): Promise<SQLiteConnection> {
    const path = typeof config === 'string' ? config : config.path;
    
    if (!this.currentAdapter) {
      this.currentAdapter = this.detectEnvironment();
    }

    try {
      return await this.currentAdapter.connect(path);
    } catch (error) {
      throw new Error(`Failed to connect to SQLite database: ${error}`);
    }
  }

  getEnvironmentInfo(): string {
    try {
      // Safe check for React Native
      if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
        // Safe check for Windows environment
        if (typeof globalThis.Windows !== 'undefined') {
          return 'React Native Windows';
        }
        
        // Safe check for Platform API
        try {
          // Try to import Platform from react-native if available
          const Platform = this.getPlatform();
          if (Platform && Platform.OS === 'windows') {
            return 'React Native Windows';
          }
        } catch {
          // Platform not available, continue
        }
        
        return 'React Native';
      }
      
      // if (typeof Bun !== 'undefined') return 'Bun';
      // if (typeof Deno !== 'undefined') return 'Deno';
      if (typeof window !== 'undefined') return 'Browser';
      if (typeof process !== 'undefined') return 'Node.js';
      return 'Unknown';
    } catch {
      return 'Unknown';
    }
  }

  private getPlatform(): any {
    try {
      // Try to require Platform from react-native
      if (typeof require !== 'undefined') {
        const { Platform } = require('react-native');
        return Platform;
      }
    } catch {
      // react-native not available
    }
    
    // Try global Platform
    try {
      return globalThis.Platform;
    } catch {
      return null;
    }
  }
}
