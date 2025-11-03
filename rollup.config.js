import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import esbuild from 'rollup-plugin-esbuild'

export default {
  input: 'src/index.ts', // Điểm vào từ mã TypeScript. -- phương án build trong tham số lệnh
  external: [], // Không có external deps
  output: [
    {
      dir: 'lib',
      format: 'cjs',
      entryFileNames: '[name].js',
      sourcemap: true,
      exports: 'named'
    },
    {
      dir: 'lib',
      format: 'esm',
      entryFileNames: '[name].mjs',
      sourcemap: true,
      exports: 'named'
    }
  ],
  plugins: [
    nodeResolve(), // Giải quyết các phụ thuộc node_modules
    commonjs(), // Chuyển đổi CommonJS sang ESM nếu cần
    typescript({
      tsconfig: './tsconfig.json', declaration: true,
      declarationDir: 'lib',
      declarationMap: true, // Tạo .d.ts.map để debug
      rootDir: 'src'
    }), // Biên dịch TypeScript
    esbuild({
      minify: true,
      target: 'es2017' // Target ES version phù hợp: ES2017+ cho modern browsers // RN 0.60+
    })

  ],
  external: [
    'better-sqlite3',              // Node.js
    'react-native-sqlite-storage',  // React Native
    'expo-sqlite',                  // Expo
    /^react-native/,               // Tất cả RN modules
  ], // Chỉ định các phụ thuộc bên ngoài nếu cần (ví dụ: không bundle tslib nếu dùng importHelpers)
};