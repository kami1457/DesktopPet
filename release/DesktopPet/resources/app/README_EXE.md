# HTML 桌宠转 EXE 说明

本目录原有的 `index.html / pet.js / style.css` 没有改为其它技术栈，只额外增加了一个 Electron 壳层：

- `main.js`：创建透明、无边框、置顶的桌宠窗口
- `preload.js`：让非桌宠区域鼠标穿透，保留桌宠本体与面板点击
- `package.json`：提供启动与打包 EXE 的脚本
- `build-portable.ps1`：不依赖额外打包器，直接组装可双击运行的 EXE 目录

## 本地运行

```powershell
npm.cmd install
npm.cmd start
```

## 生成可双击运行的 EXE 目录

推荐直接执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\build-portable.ps1
```

或：

```powershell
npm.cmd run build:portable
```

生成后直接双击：

```text
dist\DesktopPet\DesktopPet.exe
```

## 打包单文件便携版 EXE（可选）

```powershell
npm.cmd run build
```

打包成功后会在 `dist` 目录生成可直接双击运行的便携版 EXE。

## 打包安装版 EXE（NSIS 安装程序）

```powershell
npm.cmd run build:install
```

打包成功后会在 `dist` 目录生成安装程序（如 `DesktopPet Setup 1.0.0.exe`）。

当前已配置为“自定义安装”模式：安装时会显示向导页面，并允许用户自行选择安装目录（非一键静默安装）。
安装向导中还新增了“创建桌面快捷方式”勾选项，可按需选择。
程序窗口已避开任务栏工作区并降低置顶层级，避免运行后任务栏不显示的问题。
桌宠右键菜单新增“🚪 退出程序”，并支持快捷键 `Ctrl + Shift + Q` 快速退出（无需再到任务栏操作）。

若在部分 Windows 环境遇到 `Cannot create symbolic link` 报错，可在管理员权限终端执行构建，或开启“开发者模式”后重试。
