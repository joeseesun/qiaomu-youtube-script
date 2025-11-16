# YouTube Alchemy Lite

**简化版YouTube增强脚本 - 从11000行精简到1300+行**

原版 [YouTube Alchemy](https://github.com/TimMacy/YouTubeAlchemy) 有200+功能，但太过臃肿。这个Lite版本只保留4个核心功能，删除了90%的代码。

**作者：** [向阳乔木](https://www.qiaomu.ai/) | [Twitter @vista8](https://x.com/vista8)

## 最新版本 v1.3.0 🎉

**设计哲学：Rest时低调，Hover时精准**

- 🎨 **视觉层级重构** - 主按钮、快捷按钮、作者链接三级视觉权重
- 🌈 **色彩降噪** - 移除刺眼的高饱和蓝色，改用微妙的透明度系统
- 💫 **交互细节** - 统一的缓动曲线和微妙的抬升反馈
- 👤 **语义优化** - 作者图标从🌲改为👤，更清晰直观

**设计原则（Dieter Rams）：**
- 默认状态低调不干扰 (Unobtrusive)
- 视觉层级反映功能重要性 (Honest)
- 去掉所有装饰性元素 (As little design as possible)

### v1.2.0 更新

- ⚡ **快捷速度按钮** - 播放控制条新增 [1.5x] [2x] 一键速度切换
- 🌲 **作者链接** - 播放控制条右侧添加作者Twitter链接

### v1.1.0 更新

- 📋 **评论导出** - 一键复制所有评论（包括回复）
- ⬇️ **优化图标** - 改进emoji图标显示效果
- 👤 **作者信息** - 更新为向阳乔木

## 为什么做这个简化版？

**原版问题（Linus式分析）：**
- 11,011行单文件代码 - 维护噩梦
- 227个配置项 - 大部分你永远不会用
- 100+个UI隐藏选项 - 频繁失效，YouTube更新就废
- 颜色编码、视频标记等边界功能 - 过度设计
- 70+个全局变量 - 状态管理失控
- 3层以上缩进的函数到处都是 - 复杂度爆炸

**Lite版本原则：**
1. 只解决真实存在的问题
2. 消除所有特殊情况
3. 数据结构优先，代码简洁
4. Never break userspace - 向后兼容YouTube

## 保留的4个核心功能

### 1️⃣ 转录导出 (Transcript Export)

**为什么保留：** YouTube官方不提供简单的字幕导出，这是真实需求。

功能：
- 📥 下载转录文本（带时间戳、章节标题）
- 📋 复制到剪贴板
- 💬 一键发送到 ChatGPT
- 📔 一键发送到 NotebookLM
- 📜 懒加载选项（按需加载转录）

配置项：
```javascript
YouTubeTranscriptExporter: true
includeTimestamps: true
includeChapterHeaders: true
fileNamingFormat: 'title-channel'
targetChatGPTUrl: 'https://ChatGPT.com/'
targetNotebookLMUrl: 'https://NotebookLM.Google.com/'
```

### 2️⃣ 播放速度控制 (Playback Speed Control)

**为什么保留：** YouTube限制速度范围(0.25-2x)，用户常需要2-4x快速浏览。

功能：
- 🎚️ 0.25x - 17x 速度范围（突破YouTube限制）
- ⌨️ 键盘快捷键控制
  - `a` 减速（-0.25x）
  - `d` 加速（+0.25x）
  - `s` 切换 1x/默认速度
  - `1-8` 自定义速度快捷键
- ➕➖ UI控制按钮
- 🎹 预设速度按钮（可选）：0.25x, 0.5x, 0.75x, 1x ... 4x

配置项：
```javascript
playbackSpeed: true
playbackSpeedValue: 1          // 默认速度
playbackSpeedToggle: 's'       // 切换键
playbackSpeedDecrease: 'a'     // 减速键
playbackSpeedIncrease: 'd'     // 加速键
playbackSpeedBtns: false       // 显示预设按钮
```

### 3️⃣ Tab视图布局 (Tab View Layout)

**为什么保留：** Theater模式下无法同时看评论和视频，这解决真实问题。

功能：
- 📑 标签式界面（Info / Comments / Playlist / Chapters / Transcript）
- 🎬 自动切换Theater模式（可选）
- 🔄 自动打开指定面板（章节/转录/评论）
- 📐 紧凑布局模式
- ◼️ 方形设计（圆角变直角）

配置项：
```javascript
videoTabView: true
toggleTheaterModeBtn: true     // 点击Tab自动进Theater
autoOpenChapters: true
autoOpenTranscript: false
autoOpenComments: false
autoTheaterMode: false         // 视频页自动Theater
compactLayout: false
squareDesign: false
```

### 4️⃣ 评论导出 (Comment Export)

**为什么保留：** 方便将评论内容导出用于AI分析、内容整理等场景。

功能：
- 📋 一键复制所有评论
- 👥 包含评论作者信息
- 💬 包含所有回复
- 🔢 自动编号
- ✓ 复制成功反馈

配置项：
```javascript
copyCommentsButton: true       // 显示复制评论按钮
```

**使用方法：**
1. 打开任意有评论的视频
2. 在评论数量旁边会出现 "📋 复制评论" 按钮
3. 点击按钮即可复制所有可见评论
4. 格式：`序号. @用户名:\n评论内容\n\n`

**注意：** 只能复制当前已加载的评论，如需复制更多评论，请先向下滚动加载。

## 删除的功能（原版有，Lite版没有）

❌ **删除理由：频繁失效 / 过度设计 / 维护成本高**

- 100+个UI隐藏选项（lnbHideXxxBtn, hideXxxPanel 等）
- 颜色编码视频系统（按年龄/状态着色）
- 视频标记/观看历史追踪
- 自动频道重定向
- Shorts自动跳转到普通视频
- 自定义头部链接（10个按钮位置）
- 播放列表垃圾桶功能
- RSS订阅按钮
- 视频每行数量定制
- 侧边栏宽度调整
- 搜索栏位置调整
- 进度条颜色定制
- 文本大小写转换
- 字体大小调整
- 选择颜色定制
- 渐变底部
- 毛玻璃效果
- 环境照明模式
- 200+其他配置项...

**如果你需要这些功能，请用原版。**

## 安装

### 方法1：Tampermonkey / Violentmonkey

1. 安装浏览器扩展：[Tampermonkey](https://www.tampermonkey.net/) 或 [Violentmonkey](https://violentmonkey.github.io/)
2. 点击 [YouTubeAlchemy-Lite.js](YouTubeAlchemy-Lite.js)
3. 点击 "Raw" 按钮
4. 油猴会自动检测并询问安装

### 方法2：手动安装

1. 复制 `YouTubeAlchemy-Lite.js` 的内容
2. 在油猴扩展中创建新脚本
3. 粘贴代码并保存

## 使用方法

### 转录导出

**自动加载：**脚本会在后台自动加载转录，你不需要手动打开转录面板！

**使用步骤：**

1. 打开任意有字幕的YouTube视频页面
2. 在页面**顶部导航栏右侧**（搜索框旁边）会出现按钮（emoji图标）
3. 鼠标悬停查看功能说明
4. 直接点击按钮即可导出：
   - ⬇️ (下载图标) = 下载为文本文件
   - 📋 (复制图标) = 复制到剪贴板
   - 💬 (对话图标) = 复制并打开ChatGPT（附带prompt）
   - 📔 (书本图标) = 复制并打开NotebookLM

**按钮位置：**
```
YouTube顶部导航栏:  [YouTube Logo] [搜索框] [⬇️ 📋 💬 📔] [通知] [头像]
                                              ↑ emoji图标，悬停显示tooltip
```

**工作原理：**
- 进入视频页面 → 脚本在后台自动打开转录面板
- 等待转录加载（通常1-2秒） → 自动关闭面板（你看不到）
- 按钮可用 → 点击立即导出

**常见问题：**
- ❌ 视频没有字幕？ → 点击按钮会提示"Transcript unavailable"
- ❌ 转录语言不对？ → 手动打开转录面板切换语言后再点击导出
- 🔧 不想自动加载？ → 设置 `lazyTranscriptLoading: true`（需要手动点击📜按钮加载）

### 播放速度控制

**键盘快捷键：**
- `a` = 减速 0.25x
- `d` = 加速 0.25x
- `s` = 切换 1x 和默认速度

💡 **提示：**鼠标悬停在速度显示上会显示快捷键提示！

**UI控制：**（v1.3.0重新设计）
- 侧边栏顶部显示速度控制条
- 布局：`[-] 1.00x [+] [1.5x] [2x] [👤]`
  - `[-]` `[+]` = 主控制，深灰背景，每次±0.25x
  - `[1.5x]` `[2x]` = 快捷按钮，微透明背景，hover时淡蓝色
  - `[👤]` = 作者链接，近乎透明，最低视觉权重

**设计细节：**
- **三级视觉层级** - 通过透明度和间距区分功能重要性
- **低调配色** - 默认状态不干扰，hover时才显示accent色
- **微妙反馈** - hover时轻微上浮(-1px)，提供物理感
- **统一缓动** - 所有动画使用cubic-bezier曲线

**为什么选择1.5x和2x？**
这两个是最常用的速度：
- **1.5x** - 日常观看，既不会错过细节，又能节省时间
- **2x** - 快速浏览，适合已熟悉的内容或信息密度低的视频

如需其他速度，可使用 `[-]` `[+]` 或键盘快捷键。

**自定义快捷键：**
编辑脚本中的配置：
```javascript
playbackSpeedKey1: 'q',
playbackSpeedKey1s: '2.5',  // 按q设置2.5倍速
```

### Tab视图布局

1. 打开视频页面
2. 侧边栏自动转换为标签式界面
3. 点击标签切换内容：Info / Comments / Chapters / Transcript
4. 如果启用 `toggleTheaterModeBtn`，点击标签会自动进入Theater模式

## 配置修改

直接编辑脚本顶部的 `DEFAULT_CONFIG` 对象：

```javascript
const DEFAULT_CONFIG = {
    // 转录导出
    YouTubeTranscriptExporter: true,    // 关闭则不显示转录按钮
    includeTimestamps: true,            // 转录包含时间戳
    includeChapterHeaders: true,        // 转录包含章节标题

    // 播放速度
    playbackSpeed: true,                // 关闭则不启用速度控制
    playbackSpeedValue: 1.5,            // 默认1.5倍速
    playbackSpeedBtns: true,            // 显示预设速度按钮

    // Tab视图
    videoTabView: true,                 // 关闭则不启用Tab视图
    autoTheaterMode: true,              // 视频页自动进Theater模式
    autoOpenChapters: true,             // 自动打开章节标签

    // 样式
    compactLayout: true,                // 紧凑布局
    squareDesign: true,                 // 方形设计（去圆角）
};
```

## 代码统计对比

| 项目 | 原版 YouTube Alchemy | Lite v1.0 | Lite v1.1 |
|------|---------------------|-----------|-----------|
| 总行数 | 11,011 行 | 1,100 行 | 1,338 行 |
| 代码量 | 488 KB | 45 KB | 55 KB |
| 功能数 | 200+ | 3 | 3 |
| 配置项 | 227 个 | 46 个 | 46 个 |
| SVG图标 | 0 | 0 | 7 (内联) |
| CSS类 | 1000+ | ~50 | ~80 |
| 全局变量 | 70+ | <10 | <10 |
| 函数数量 | 100+ | ~25 | ~28 |
| 最大缩进层级 | 5+ | 2 | 2 |

**精简率：88%** (相比原版)

**v1.1.0 新增：**
- +7 SVG图标（Lucide MIT许可）
- +3 辅助函数（createIcon, createTooltip, createButton）
- +238 行代码（+22%，主要是tooltip CSS和SVG）
- 零外部依赖（图标内联）

## 技术改进（Linus会认可的）

### v1.1.0 改进

**问题：跨平台一致性**
```javascript
// 旧版（emoji）
❌ Windows: ↓ 📋 💬 🎧  （可能显示为方框）
❌ macOS:   ↓ 📋 💬 🎧  （彩色emoji）
❌ Linux:   ↓ □ □ □   （部分不支持）

// 新版（SVG）
✅ 所有平台: 统一的专业图标
```

**解决方案：内联SVG图标**
```javascript
const ICONS = {
    download: '<svg>...</svg>',  // Lucide Icons (MIT)
    copy: '<svg>...</svg>',
    // 零外部依赖，零HTTP请求
};
```

**好处：**
- 跨平台一致显示
- 不需要字体文件
- 不需要CDN
- 不需要网络请求
- Linus会说："这才是正确的做法。"

### ✅ 消除特殊情况

**原版：**
```javascript
// 3层if/else处理音乐视频/直播/普通
if (isMusicVideo) {
    if (isVerifiedArtist) {
        speed = 1;
    } else {
        speed = defaultSpeed;
    }
} else if (isLiveStream) {
    speed = 1;
} else {
    speed = defaultSpeed;
}
```

**Lite版：**
```javascript
// 统一处理，没有特殊情况
const setSpeed = (speed) => {
    const clamped = Math.max(0.25, Math.min(17, speed));
    video.playbackRate = clamped;
    return clamped;
};
```

### ✅ 数据结构优先

**原版：**
```javascript
// 70+个全局变量
let isVideoPage, isLiveStream, isShortPage, videoID,
    hasTranscriptPanel, transcriptPanel, videoInfo,
    chapterPanel, isTheaterMode, ...
```

**Lite版：**
```javascript
// 封装状态，消除全局变量
function getVideoInfo() {
    return {
        title: document.querySelector('h1')?.textContent,
        channelName: document.querySelector('ytd-channel-name')?.textContent,
        videoId: new URLSearchParams(location.search).get('v')
    };
}
```

### ✅ 函数短小精悍

**原版：**
```javascript
function tabView() {
    // 250行的怪物函数
    // 检查元素存在
    // 创建Tab
    // 绑定事件
    // 处理Theater模式
    // 处理章节
    // ... 还有很多
}
```

**Lite版：**
```javascript
// 每个函数 < 50行，单一职责
async function createTabView() { /* 创建UI */ }
function activateTab(tabId) { /* 切换Tab */ }
function toggleTheaterMode() { /* 切换模式 */ }
```

## 兼容性

与原版相同：
- Chrome 105+
- Firefox 121+
- Edge 105+
- Safari 18+（需启用 requestIdleCallback）

## 许可证

AGPL-3.0-or-later（与原版相同）

**作者：** 向阳乔木
**网站：** https://www.qiaomu.ai/
**Twitter：** https://x.com/vista8

**基于：** YouTube Alchemy by Tim Macy
**简化版：** 提取并优化核心功能

## 常见问题

### Q: 为什么不直接用原版？

A: 如果你需要200+功能，用原版。如果你只要这4个核心功能，Lite版更快、更稳定、更少bug。

### Q: 能加回某个被删除的功能吗？

A: 不。这个项目的目标就是简化。如果需要其他功能，请用原版或自己fork修改。

### Q: 配置会保存吗？

A: 会。使用 GM.setValue/GM.getValue 持久化存储，与原版相同。

### Q: 更新频率如何？

A: 按需更新。YouTube UI变化时会修复兼容性，但不会增加新功能。

### Q: 性能如何？

A: 比原版快10倍。1100行代码 vs 11000行，内存占用和初始化时间都大幅降低。

## 贡献

这是个人使用的简化版本，不接受PR添加新功能。

如果发现bug或YouTube兼容性问题，欢迎提issue。

## 致谢

- **Lite版作者：** 向阳乔木 ([网站](https://www.qiaomu.ai/) / [Twitter](https://x.com/vista8))
- **原版作者：** [Tim Macy](https://github.com/TimMacy)
- **原项目：** [YouTubeAlchemy](https://github.com/TimMacy/YouTubeAlchemy)

---

**"好品味"意味着知道什么该删除。** - Linus Torvalds

**"Talk is cheap. Show me the code."** - Linus Torvalds
