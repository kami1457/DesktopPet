# DesktopPet

一个可自定义的桌宠项目，提供两种形态：

- `origin`：纯前端 HTML/CSS/JS 版本，可直接在浏览器运行。
- `release`：基于 Electron 的 Windows 桌面版，可双击 `EXE` 运行。

项目内置桌宠动画、互动动作、好感度与饱食度、番茄钟、待办事项、暗色模式、图片替换等功能。

## 项目特性

- 可拖拽桌宠，支持抛投物理效果。
- 右键菜单快捷操作：打招呼、转圈、伸懒腰、跳舞、跳跃、睡觉、喂食等。
- 设置面板支持调整大小、透明度、动画速度、镜像、跟随鼠标、睡眠时间、状态条显示等。
- 支持上传/批量导入桌宠图片，并可导出/导入配置。
- 内置好感度等级、饱食度与心情状态系统。
- 附带番茄钟与待办事项小工具。

## 安装方法

### Windows 成品安装（推荐）

`release` 目录中已经提供了可直接使用的安装产物：

1. 双击 `release\DesktopPet Setup 1.0.0.exe`，按安装向导完成安装。
2. 同目录下的 `release\DesktopPet\` 可视作安装后的程序目录（包含 `DesktopPet.exe`）。
3. 若无需重新开发或打包，可直接运行已安装程序。

### 方式一：浏览器版本（无需安装依赖）

1. 进入 `origin` 目录。
2. 使用浏览器打开 `index.html`。

### 方式二：Electron 开发与打包（需要 Node.js 与 npm）

1. 安装 [Node.js](https://nodejs.org/)（建议 LTS 版本，包含 npm）。
2. 进入目录：

```powershell
cd .\release\DesktopPet\resources\app
```

3. 安装依赖：

```powershell
npm install
```

## 使用方法

### 浏览器版本

```powershell
cd .\origin
# 双击 index.html，或在浏览器中打开该文件
```

### Electron 版本（开发运行）

```powershell
cd .\release\DesktopPet\resources\app
npm start
```

### Electron 版本（打包）

```powershell
cd .\release\DesktopPet\resources\app
npm run build:portable
```

打包完成后可在 `dist\DesktopPet\DesktopPet.exe` 直接运行。

## 项目结构

```text
DesktopPet/
├─ README.md
├─ origin/                           # 原始网页版桌宠
│  ├─ index.html                     # 页面结构与 UI
│  ├─ pet.js                         # 桌宠核心逻辑
│  └─ style.css                      # 样式
└─ release/
   ├─ DesktopPet Setup 1.0.0.exe     # 安装包（点击即可安装）
   └─ DesktopPet/                    # 安装后程序目录（含可执行文件）
      ├─ DesktopPet.exe              # 主程序
      └─ resources/
         └─ app/                     # Electron 项目源码
            ├─ main.js               # Electron 主进程
            ├─ preload.js            # 预加载与鼠标穿透控制
            ├─ index.html            # 渲染层页面
            ├─ pet.js                # 桌宠核心引擎
            ├─ style.css             # 样式
            └─ package.json          # 依赖与脚本
```

## 备注

- 项目为 Windows 桌面场景设计，`release` 目录已包含安装包与安装后目录。
- 配置与互动数据会保存在本地浏览器/Electron 存储中（`localStorage`）。
