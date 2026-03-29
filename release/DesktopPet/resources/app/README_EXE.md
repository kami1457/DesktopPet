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
