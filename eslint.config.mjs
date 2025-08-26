import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import pluginReact from 'eslint-plugin-react'
import reactRefresh from 'eslint-plugin-react-refresh'
import reactHooks from 'eslint-plugin-react-hooks'

// defineConfig 提供了类型提示，非常好
export default tseslint.config(
  // 1. 全局忽略配置
  //    和 .eslintignore 文件功能类似

  { ignores: ['**/node_modules', '**/dist', '**/out'] },

  // 2. ESLint 官方推荐的基础规则
  js.configs.recommended,

  // 3. TypeScript 核心配置
  //    使用 tseslint.configs.recommendedTypeChecked 会提供更严格的类型检查规则
  //    如果项目设置了 tsconfig.json 的 "strict" 模式，推荐使用这个
  ...tseslint.configs.recommended,

  // 4. 为根目录下的配置文件（如 vite.config.ts, eslint.config.js）设置 Node.js 环境
  {
    files: ['**/*.{js,cjs,mjs,ts,cts,mts}'],
    languageOptions: {
      globals: {
        ...globals.node
      }
    }
  },

  // 5. 核心应用代码（src 目录）的配置
  {
    files: ['src/**/*.{ts,tsx}'],

    // React 相关插件和配置都集中在这里
    plugins: {
      react: pluginReact,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh
    },

    languageOptions: {
      // 解析器选项，开启 JSX 支持
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      },
      // 为 src 目录下的文件设置浏览器环境
      globals: {
        ...globals.browser
        // 如果你有通过 Electron preload 暴露的全局变量，也可以在这里定义
        // 'myCustomGlobal': 'readonly',
      }
    },

    settings: {
      react: {
        version: 'detect' // 自动检测 React 版本
      }
    },

    rules: {
      // 继承 React 推荐规则
      ...pluginReact.configs.recommended.rules,
      // 继承 React Hooks 推荐规则
      ...reactHooks.configs.recommended.rules,

      // --- 自定义或覆盖的规则 ---

      // 现代 React (v17+) 不再需要在作用域中引入 React
      'react/react-in-jsx-scope': 'off',
      // 如果 props 使用了 TS，则不需要 prop-types
      'react/prop-types': 'off',

      // React Refresh 插件的规则，确保组件能正确热更新
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // 关于你遇到的 react-hooks/exhaustive-deps 警告，规则配置在这里。
      // 保持 'warn' 或 'error' 是最佳实践，即使在使用 React Compiler 时。
      'react-hooks/exhaustive-deps': 'warn'
    }
  }
)
