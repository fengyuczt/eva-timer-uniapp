# EVA Timer UniApp

## 项目简介

`eva-timer-uniapp` 是一个基于 `uni-app x` 的 EVA 风格计时器项目。

这个项目的目标，是把原始 `eva` 页面资源整理并接入 `uni-app x`，让它可以：

- 在 HBuilderX 中直接运行
- 构建为 Android App
- 在手机横屏场景下使用
- 保留 EVA 风格的界面、字体、SVG 资源和交互逻辑

目前项目已经将原始页面嵌入到 `uni-app x` 页面中，并针对手机端显示、全屏、设置面板、SVG 裁剪等问题做过适配。

## 主要功能

- EVA 风格倒计时 / 正计时 / 当前时间显示
- 横屏显示
- 设置面板
- 全屏开关
- 主题切换
  - 默认显示
  - 灰度模式
  - 线框模式
  - 新剧场版主题
- SVG 裁剪调节
  - `Crop L`
  - `Crop R`
  - `Crop T`
  - `Crop B`

## 项目结构

```text
eva-timer-uniapp/
├─ pages/                  uni-app 页面
├─ static/eva/             当前实际使用的 EVA 资源
├─ hybrid/eva/             同步保留的混合资源副本
├─ tools/                  辅助工具
├─ manifest.json           应用配置
├─ pages.json              页面配置
├─ App.uvue                应用入口
└─ main.uts                uni-app x 入口脚本
```

## 关键目录说明

### `pages/`

`uni-app x` 的页面目录。当前主要入口页是：

- `pages/index/index.uvue`

这个页面负责承载 EVA 计时器页面。

### `static/eva/`

这是当前项目实际运行时主要使用的目录，重点文件包括：

- `static/eva/app.html`
- `static/eva/settings.html`
- `static/eva/js/eva-timer.js`
- `static/eva/js/svgui.js`
- `static/eva/js/timer.js`
- `static/eva/js/resources.js`
- `static/eva/images/eva-timer.svg`

如果需要修改运行中的 EVA 页面逻辑，通常应该优先修改这里。

### `hybrid/eva/`

这是与 `static/eva/` 同步保留的一份副本，主要用于兼容和备份当前资源结构。

为了避免后续内容不一致，修改 `static/eva/` 后，通常也需要同步 `hybrid/eva/`。

## 当前实现方式

项目不是把 EVA 界面完全重写成原生 `uni-app` 组件，而是采用了“`uni-app x` 页面 + 内嵌 EVA 页面资源”的方式。

这样做的好处是：

- 能较完整保留原始视觉效果
- 更容易沿用现有 SVG / JS / 字体资源
- 修改 EVA 页面逻辑时更直接

## 设置项说明

当前设置面板支持以下内容：

- 活动时长
- 紧急时长
- 计时模式切换
- 全屏开关
- 主题切换
- 自动播放
- SVG 裁剪参数

其中 SVG 裁剪参数会直接影响主界面的显示范围，用来控制：

- 左侧裁掉多少
- 右侧裁掉多少
- 上方裁掉多少
- 下方裁掉多少

## 适配说明

这个项目已经针对手机使用场景做过一轮适配，重点包括：

- 横屏显示
- 设置弹窗居中
- 手机端滚动优化
- 点击事件兼容
- Android 旧版本 WebView 兼容处理
- 本地资源嵌入，避免 `file://` 加载失败

## 资源说明

项目中包含以下类型资源：

- SVG 界面资源
- 字体文件
- HTML / CSS / JS 页面资源
- 原始 Python 参考逻辑

其中：

- `static/eva/py/`
- `hybrid/eva/py/`

主要用于保留原始参考实现，当前手机端实际运行逻辑主要还是 JS 版本。

## 开发注意事项

1. 当前实际运行入口以 `static/eva/` 为主  
   修改功能时优先看 `static/eva/`。

2. `resources.js` 需要同步更新  
   当你修改以下文件后，通常要重新生成嵌入资源：
   - `settings.html`
   - `svgui.css`
   - `eva-timer.css`
   - `images/eva-timer.svg`

3. `hybrid/eva/` 最好同步  
   避免后续维护时出现两边逻辑不一致。

4. 手机端优先关注兼容性  
   尤其是旧版 Android WebView，对部分新语法和页面能力支持有限。

## 适用场景

这个项目适合：

- EVA 风格展示计时器
- 手机横屏计时界面
- 活动倒计时展示
- 自定义主题风格时间面板

## 后续可继续扩展的方向

- 持久化保存设置
- 更细的主题控制
- 更方便的 SVG 裁剪滑块
- 原生 `uni-app` 组件化重构
- App 图标、启动图、发行配置进一步完善
