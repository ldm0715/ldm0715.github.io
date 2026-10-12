# 宣纸主题：暗角 / 飞白修复 · 朱印阅读进度 · 播放器选型

日期：2026-09-10
状态：已实施（播放器选型待定）

## Context

主题 `xuanzhi` 的真实仓库是 `F:\hugo_theme`，站点 `F:\hugo_gcnanmu` 通过
`themes/xuanzhi` junction 挂载它，站点侧没有 `layouts/` 和 `assets/`。
因此本次改动除播放器 demo 外全部落在主题仓库。

三项诉求，前两项是缺陷修复，第三项是功能新增，外加一个待决的选型。

## 一、暗角"没有效果"——根因是几何，不是浓度

原实现：

```css
background: radial-gradient(ellipse 130% 95% at 50% 35%, transparent 60%, var(--vignette) 100%);
```

椭圆半径取视口的 130%×95%（**半径**，不是直径），圆心在 50%/35%。
把视口角点代入归一化椭圆方程 `sqrt((dx/rx)² + (dy/ry)²)`：

| 位置 | 落在渐变的 | 说明 |
|---|---|---|
| 左上角 | 53% | `transparent` 一直到 60% 才结束 → **完全没着色** |
| 右下角 | 78% | 过渡区走了 46%，乘 0.06 alpha → **实际压暗 2.8%** |
| 上边中点 | 37% | 同样在透明区 |

结论：整个视口有一大半压根落不进渐变过渡区，最深的地方也只有 2.8% 的压暗。
**只调 alpha 治不好这个问题**，必须先缩小椭圆。

修复：

- `main.css` 几何改为 `radial-gradient(ellipse 78% 78% at 50% 42%, transparent 35%, var(--vignette) 100%)`
  → 四角 0.13–0.18、边中点 0.05–0.11、中心 0（圆心略偏上，保住「纸从上方受光」）
- `token.css` `--vignette` 亮色 0.06 → 0.18，暗色 0.16 → 0.40
- 新增 `--vignette-swatch`（亮 0.38 / 暗 0.55），面板样张改吃这个 token。
  原先样张硬编码 rgba，与页面实际浓度各改各的，是个维护陷阱
- `@media print` 补 `html[data-bg="noise-vignette"] body::after { display: none !important; }`。
  打印块里那句 `background: #fff !important` 管不到固定定位的 `body::after` 遮罩，
  不加这条，打印会有一圈灰晕

`z-index: 0`（压在正文之上）保持不变——光线衰减本就同时作用于字，且 0.18 只在最角落。

## 二、飞白——形状是「断笔」，墨色还反了

原实现有两个独立缺陷：

1. **墨色反了。** 飞白没有自己的 `background-color`，于是继承了基础 `.post-content hr`
   的 `--hr-ink-strong`（alpha 0.8），成了四式中**最浓**的一条。枯笔落墨最少，该最淡。
2. **形状是断笔，不是飞白。** 四条互相不相连的 path，段长 51/85/67/52、缝宽 6–10、
   厚度恒 2–3px。注释承诺的「笔画渐细」没有兑现；更关键的是缺了飞白的本体——
   **笔画内部**的纵向露白。

修复：

- 新增 `--hr-ink-feibai`（亮 `rgba(90,75,50,0.38)` / 暗 `rgba(220,210,188,0.34)`），
  四式中最淡
- mask 改为「一条连续笔身（中段约 4.3px、两端收到出尖）+ `fill-rule="evenodd"` 挖三条
  不等长纵丝（72 / 76 / 50），y 位置错开」。同一套写法主题里已有先例——
  「一笔」也是靠 evenodd 挖洞
- `.swatch-hr-feibai` 不再用 `repeating-linear-gradient` 画等距断续的赝品，
  改为 `::before` 复用**同一条 mask**，样张 = 实物。
  走 `::before` 是因为 mask 会连 `.swatch` 的纸底一起蒙掉

`一笔 / 断栏 / 墨点` 三条样张有同类问题，不在本次范围。

## 三、朱印承载阅读进度

### 交互

| 状态 | 印面 | 进度指示 | 按钮栈 |
|---|---|---|---|
| 收起（默认） | 站名首字「宫」 | 印面外一圈**方框**，随进度描边填充 | 3 个 |
| 展开 | 站名首字「宫」 | 隐去（回到纯朱印） | 4 个，末位是进度读数 |

**改过两版，记一下为什么**：

1. 进度指示最初是**圆环**，用户看了说「太蠢」——印本来就是方的（方印），
   圆环跟形制不对路。改成 `<rect>` 描边，`rx=1.5` 对应印面的 `border-radius: 2px`。
   顺带不用再 `rotate(-90deg)`：`<rect>` 天然从左上角起、顺时针走，
   这正是边框式进度该有的读法。
2. 进度数字最初要**点一下才弹卡片**。用户要求直接显示。现在按钮栈末位就是读数，
   卡片、`#post-progress-card`、`showCard` 的分支一并删掉。

### 实现要点

- 方框 48×48 rx1.5、描边 2.5px（占距中心 22.75–25.25px），印面半宽 20px，留 2.75px 空隙。
  SVG `inset: -8px`、**绝对定位**——留在流里会变成 grid 子项，
  破坏 `.post-seal` 的 `place-items: center`
- **不用 `pathLength="100"` 归一化**：那是 SVG2 给基本图形的扩展，浏览器支持不齐；
  一旦不认，`stroke-dasharray` 会按用户单位解，整个进度错位。改成自己算周长：
  `4×(48−2×1.5) + 2π×1.5 = 189.42`（已用脚本核对），存成 `--seal-perimeter`。
  于是 `stroke-dashoffset: calc(var(--seal-perimeter) * (1 - var(--seal-progress) / 100))`
- 读数用 `<span>` 而非 `<button>`：它是**指示**不是**控件**，没有可点的动作。
  CSS 把 `cursor` 和悬停浮起都关掉，免得给出可点的暗示。百分号是纯装饰，走 `::after`
- 进度以 `.post-content` 为界，不是整页——页脚和上下篇导航不该计入
- 滚动节流到 `requestAnimationFrame`，且**只在整数百分比变化时写 DOM**
- 正文图片无固定尺寸，`offsetHeight` 随解码变化，所以 `load` 和 `resize` 都要重新 `measure()`
- `.post-toolbar.is-open` 由 JS 在展开时同步，CSS 据此隐去方框

## 四、播放器：Plyr + APlayer

控件与播放逻辑交给两个成熟库（Plyr 管视频、APlayer 管音频），主题这边负责短代码、皮肤与初始化胶水。

### 为什么用第三方

媒体播放器真正的难点是 **seek 节流、缓冲状态机、移动端自动播放策略**——这三样在真实浏览器环境里的打磨，正是这两个库的价值所在。

### 一条要留着的提醒：换库不等于问题已解决

开发过程中出现过「播放中途卡住」的症状，**始终没有定位到根因**。选第三方是在这个前提下做的权衡，不是确诊后的治疗。**如果根因在网络、素材或浏览器策略上，换成 Plyr 会以完全相同的方式复现。**

顺带记两个当时查出来的边界缺陷，与选型无关，但任何自己实现进度条的人都会撞上：

- 进度条的 `pointerup` / `pointercancel` 只绑在进度条元素上时，指针在窗口外松开会让
  `is-scrubbing` 永久卡住，之后鼠标划过进度条就一直在 seek
- 无节流地在 `pointermove` 上写 `currentTime`，高刷屏上是上百次/秒，每次都会中止在途加载、重发 Range 请求

### 最终结构

| 短代码 | 渲染方 | 需闭合 |
|---|---|---|
| `video` | Plyr | 否 |
| `audio` | APlayer（单曲） | 否 |
| `playlist` | APlayer（多曲，YAML 内容体） | 是 |

- `assets/vendor/{plyr,aplayer}/` —— 自托管 dist，出处/许可/升级须知见那里的 README
- `static/vendor/plyr.svg` —— Plyr 图标 sprite，运行时取，必须走 static
- `partials/player-src.html` —— 路径归一化（保留：两个方案都要用）
- `partials/player-audio.html` —— 归一化曲目 → JSON → APlayer 容器
- `main.css` 的「播放器」一节 —— Plyr 压 CSS 变量，APlayer 靠 `.xz-player--audio` 前缀
- `site.js` 的播放器模块 —— 只剩初始化胶水（约 110 行）

**单曲与列表仍是两颗短代码**：Hugo 按「模板里有没有引用 `.Inner`」决定短代码要不要
闭合，一颗既收参数又读 `.Inner` 的短代码会让 `{{< audio src="…" >}}` 直接构建失败。

### 迁移中踩到的坑（都已修）

1. **`resources.Concat` 按目标路径缓存。** 两个分支（有/无 vendor）最初共用
   `css/xuanzhi.css` 这个目标名，结果先算出来的那份被复用给所有页面——媒体页永远
   拿不到 vendor CSS，而且**结果随构建顺序漂移**。必须给不同内容不同目标名。
2. **`APlayer.min.js` 不以换行结尾，末行是 `//# sourceMappingURL=`。** 直接参与拼接
   会把紧随其后的 `site.js` 第一行整行注释掉，且构建不报错。已删掉两个文件的
   sourceMappingURL。
3. **`jsonify` 在 `<script>` 里会被再转义一次。** html/template 把结果当成 JS 字符串
   字面量，输出成 `"[{\"url\":…}]"`，`JSON.parse` 拿到的是字符串不是数组。必须过
   `safeJS`（安全性由 jsonify 自身保证，它默认把 `<` `>` `&` 转成 `<` 之类）。
4. **APlayer 的 `lrcType` 默认是 0（不显示歌词）**，传了 `lrc` 也不会有任何提示。
   模板按「这组曲目有没有 lrc」自动设成 3。
5. **Plyr 的 `iconUrl` 默认指向 `cdn.plyr.io`**，不指到自托管的那份就是一片空白。
6. **打印隐藏清单写的是旧的 `.xz-player`**，类名改名成 `--video`/`--audio` 后匹配不上，
   播放器会被打印出来。

### 两个库的取舍（留在代码注释里，供后人判断）

- APlayer 的主题色是**行内样式**（`theme()` 直接写 `style.backgroundColor`），选择器
  压不过，几处只能上 `!important`。好处是它**不做颜色运算**，所以传
  `var(--color-accent)` 能跟着明暗/点缀色实时变，比死色值好。
- APlayer 的 `mutex` 只管它自己的实例，管不到 Plyr，所以 site.js 里补了一层音视频互斥。
- 两个库合计约 175KB，用 `.HasShortcode` 判断页面是否嵌了媒体，**只有嵌了才加载**。

### 特异性

播放器住在 `.post-content` 里，主题对 `p` / `figure` / `figcaption` / `video` / `img`
都有元素级规则（多为 `(0,1,1)`），裸类名会被盖掉。触过的雷：`.post-content figcaption`
是带两侧引线的题跋式 flex 容器、`.post-content video` 带圆角和外边距。所以播放器的
规则一律带 `.xz-player--video` / `.xz-player--audio` 前缀。

## 验证情况

- `hugo` 构建通过，无 warn
- 产物核对：新 markup（`post-seal-ring` / `data-act="progress"` / `post-progress-card`）、
  新 token（`--vignette` / `--vignette-swatch` / `--hr-ink-feibai`）、
  暗角新几何、飞白新 mask、打印排除规则、`site.js` 的 `is-open` /
  `seal-progress` 均已进入编译产物
- `node --check` 校验 `site.js` 与 demo 内联脚本语法通过

**尚未做视觉验收**——暗角浓度、飞白笔形、进度环观感都需要在浏览器里逐项过一遍
（见下）。

## 待办

- [ ] 浏览器逐项验收：暗角四象限与打印、飞白笔形与墨色对比、进度方框滚动/展开/短笺满环
- [ ] 浏览器验收播放器：三种短代码、播放列表展开/切曲、歌词同步、音视频互斥、窄屏、全屏
- [ ] **确认原症状（播着播着卡住）是否真的消失**——这次选型是权衡不是确诊
- [x] ~~`static/player-demo.html`~~ 已删除（2026-09-10，选型做完后无用）
- [ ] （可选）统一 `一笔 / 断栏 / 墨点` 三条样张，让它们也复用真实 mask

## 附：为什么封面不能从音频文件里自动读（已验证，别再试）

需求是「丢一个 FLAC 进去，主题自动用它的内嵌封面」。**Hugo 模板做不到**，
不是配置问题，是语言能力问题。2026-09-10 用真实的 26.7 MB FLAC 实测过：

- 字节偏移**能**算出来：`split` 之后取第一段的 `len` 就是字节位置（`strings.Index`
  在 Hugo 里根本不存在）。实测 JPEG 起始偏移 `soi=3389`，数值合理。
- 但**没有任何字节安全的切片原语**能消费这个偏移。Hugo 的 `substr` 是**按 rune 切**的，
  二进制里的非法 UTF-8 字节会被替换成 `U+FFFD`，偏移和长度全错——实测 `jpeglen=49158337`，
  比整个文件（26730518）还大，抽出来的东西 `file` 判为 `data` 而非 JPEG。
- base64 绕道也不成立：base64 是 3 字节一组，而 3 字节的 JPEG 标记（`FF D8 FF`）
  落在哪一组取决于偏移，得试三种对齐，仍然脆弱。
- 顺带量到的代价：`os.ReadFile` 在 head.html 里就是**每个页面读一遍 26 MB**，
  构建从 1.4 秒涨到 11 秒。

可行的替代（本次未实现，用户决定不做）：主题带一个 `scripts/` 里的抽取脚本
（`ffmpeg -i x.flac -an -c:v copy -frames:v 1 x.jpg`），抽出来的图与音频同名放在旁边；
短代码再用 `fileExists` 做同名兜底。这样正文里可以不写 `cover=`，但仍需在加入媒体后
跑一次脚本。**注意 `fileExists` 的路径是相对站点根目录的**，主题若这么做等于假设了
站点的 `static/` 结构。

目前的做法就是显式写 `cover=`。成本只是每次填一个文件名。

## 环境提醒

本次新增了 3 个 partial、3 个短代码文件。主题 `CLAUDE.md` 记着一条已知坑：
**新建 / 删除 partial 后 Hugo 的 watcher 不一定重建，需要重启 `hugo server`。**
如果 server 一直开着，改完这些文件后请重启它。
