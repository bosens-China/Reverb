# 晓声 (Reverb)

*操千曲而后晓声，让每一次聆听都算数。*

**晓声 (Reverb)** 是一款专为语言学习者打造的沉浸式听力练习与复习工具。它源于一个核心理念：精通听力没有捷径，唯有通过大量的、可量化的刻意练习。本应用旨在将枯燥的听力训练，转变为一个高效、专注且可追踪的流程。

## ✨ 核心功能

### 🎧 听力库管理 (Listening Library)

- **课程化管理**: 您可以为不同的学习材料（如“新概念英语”、“雅思听力”）创建独立的课程库。
- **批量导入音频**: 支持通过文件或文件夹的形式，将本地 MP3 音频批量添加为课程的“听力素材”。
- **文件有效性检测**: 自动检测音频文件是否位于本地，避免无效练习。

### 🎯 自定义练习节奏 (Custom Rhythm)

- **完全可定制**: 自由设定练习的每一个环节，包括名称（如“泛听”、“精听”、“跟读”）、类型（练习/休息）和时长。
- **科学模板**: 提供一个默认的练习节奏模板，方便您快速上手。

### 🧘 沉浸式练习模式 (Immersive Mode)

- **无干扰全屏**: 自动进入无干扰的全屏模式，让您完全聚焦于当前的听力任务。
- **智能界面隐藏**: 鼠标静止3秒后，所有UI元素及指针将自动隐藏，营造纯净的听力环境。
- **快捷键支持**: 提供丰富的快捷键，覆盖播放/暂停、快进/快退、音量调节等核心操作，实现全键盘控制。

### 📊 学习分析与回顾 (Analytics & Review)

- **每周趋势图**: 以折线图清晰展示最近一周的学习时长趋势，并可悬停查看每日练习详情。
- **学习日历**: 以打卡日历的形式，直观记录您的学习足迹，让每一份努力都有迹可循。

### 💾 数据无忧 (Worry-Free Data)

- **自动持久化**: 您的所有课程、听力素材、练习记录和自定义设置都将自动保存在本地，即开即用。
- **窗口状态记忆**: 自动记忆您上次关闭应用时的窗口大小与侧边栏状态，提供无缝的使用体验。

## 🛠️ 技术栈

- **框架**: [Electron](https://www.electronjs.org/), [React](https://react.dev/)
- **语言**: [TypeScript](https://www.typescriptlang.org/)
- **构建工具**: [Vite](https://vitejs.dev/)
- **路由**: [TanStack Router](https://tanstack.com/router)
- **状态管理**: [Zustand](https://github.com/pmndrs/zustand)
- **UI & 样式**: [Ant Design](https://ant.design/), [UnoCSS](https://unocss.dev/), [ECharts](https://echarts.apache.org/)
- **Hooks 工具库**: [ahooks](https://ahooks.js.org/)
- **性能优化**: [React Compiler](https://react.dev/blog/2024/02/15/react-labs-what-we-have-been-working-on#react-compiler)

## 🚀 项目设置

### 安装依赖

```bash
pnpm install
```

### 本地开发

```bash
pnpm dev
```

### 构建应用

```bash
# For Windows
pnpm build:win

# For macOS
pnpm build:mac

# For Linux
pnpm build:linux
```
