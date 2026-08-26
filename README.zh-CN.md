# Obsidian LaTeX Studio

[English](README.md)

LaTeX Studio 把 Obsidian 桌面版变成一个轻量 LaTeX 工作环境。它直接编辑完整的 `.tex`、`.sty` 和 `.cls` 文件，通过本地 TeX 引擎编译，并在编辑器旁边显示生成的 PDF。

## 当前功能

- 使用 CodeMirror 6 编辑完整 LaTeX 源文件并提供语法高亮
- 支持 `latexmk` 和 Tectonic，自动模式会优先尝试 `latexmk`
- 支持命令面板、侧边栏按钮和保存后自动编译
- 编译成功后在 Obsidian 分栏中打开或刷新 PDF
- 解析编译错误并跳转到第一个错误行
- 生成 SyncTeX 文件，为后续正向和反向定位预留基础

## 系统要求

- Obsidian 1.8 或更高版本
- macOS、Windows 或 Linux 桌面端
- 至少安装一个 LaTeX 编译器：
  - `latexmk`：通常由 TeX Live、MacTeX 或 MiKTeX 提供
  - [Tectonic](https://tectonic-typesetting.github.io/)：安装较轻量，首次编译会下载所需宏包

## 手动安装

1. 在 vault 中创建目录：

   ```text
   <vault>/.obsidian/plugins/latex-studio/
   ```

2. 将以下三个文件复制进去：

   ```text
   main.js
   manifest.json
   styles.css
   ```

3. 打开 Obsidian 的“设置 → 第三方插件”，启用 **LaTeX Studio**。
4. 在 vault 中打开一个 `.tex` 文件。

## 使用方法

- 点击左侧 Sigma 图标编译当前 LaTeX 文档。
- 或打开命令面板，执行“Compile active LaTeX document”。
- 默认保存 `.tex` 文件后会自动编译，并在右侧显示 PDF。
- 可以在插件设置中选择 `Auto`、`latexmk` 或 `Tectonic`，也可以填写编译器绝对路径。

## 本地开发

```bash
npm install
npm run check
```

`npm run check` 会依次执行 TypeScript 类型检查、单元测试和生产构建。构建输出为项目根目录下的 `main.js`。

## 安全说明

插件使用参数数组直接调用本地编译器，不经过 shell。但是 LaTeX 模板和宏包本身仍可能访问本机文件或执行受编译器允许的操作。只编译可信工程；除非明确理解风险，否则不要启用 shell escape。

## 开发路线

- 主文件指令与多文件依赖监听
- Bibliography、索引和自定义构建配方
- 独立编译日志与诊断面板
- SyncTeX 源码到 PDF、PDF 到源码双向定位
- LaTeX 大纲、标签引用、自动补全和片段
- Windows、Linux、macOS 自动化测试与 Obsidian 社区插件发布

## 开源协议

MIT
