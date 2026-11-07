# 迁移与上线变更记录

记录从 `next-theme-coline`（Next.js）迁移到 Fumika（Astro）的全部改动，以及部署到阿里云 ESA Pages 的配置。

上线域名：**https://www.080527.xyz**

---

## 一、仓库原有问题修复

迁移前先做了全面检查，发现 5 个问题，其中 2 个会导致构建失败或整站样式丢失。

### 1. 生产构建直接失败

**现象：** `astro build` 报错退出：

```
browserType.launch: Executable doesn't exist at
.../ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-win64/chrome-headless-shell.exe
```

**原因：** `rehype-mermaid` 在构建期用 Playwright 启动无头浏览器把 Mermaid 渲染成图片。本地装的是 Chromium 1248，而 `playwright@1.63.0` 要求 1243，版本不匹配。

**处理：** 改为**浏览器端渲染**，构建期不再依赖 Playwright。

- 重写 `src/plugins/rehype-mermaid.mjs`：把 ```mermaid 代码块转成 `<pre class="mermaid">`，不再调用 Playwright
- `src/components/misc/Markdown.astro`：加入客户端渲染逻辑，页面加载后动态 `import("mermaid")` 绘制图表，并适配 Swup 的 `page:view` 事件
- `src/styles/mermaid.css`：重写为适配 `<pre>` 的样式
- `package.json`：`build` 脚本去掉 `playwright install chromium`；移除 `rehype-mermaid`、`playwright` 依赖，新增 `mermaid@11.17.2`

### 2. 主题样式靠「巧合」引入（严重）

**现象：** `src/styles/main.css` 定义了全部 Tailwind 主题变量和 `card-base`、`btn-plain` 等自定义 utility，但它**从未被 import 过**，只在 `Layout.astro` 里被 `@reference` 引用。

**原因：** 它实际是被 `ImageWrapper.astro` 中 `import.meta.glob("../../**")` 这个超宽 glob 顺带打包进来的。

**验证：** 把 glob 收窄为只匹配图片后重新构建，`.card-base`、`--page-bg`、`onload-animation` 等定义**全部从产物消失**，整站视觉会崩。

**处理：**

- `src/layouts/Layout.astro`：显式 import 全部全局样式
  ```ts
  import "@styles/variables.scss";
  import "@styles/main.css";
  import "@styles/markdown.css";
  import "@styles/markdown-extend.scss";
  import "@styles/transition.css";
  import "@styles/scrollbar.css";
  import "@styles/expressive-code.css";
  import "@styles/photoswipe.css";
  import "@styles/mermaid.css";
  ```
- `src/components/misc/ImageWrapper.astro`：glob 收窄为 `"../../**/*.{jpg,jpeg,png,webp,avif,gif,svg}"`，只匹配图片

### 3. 非英文站点路由全错

**现象：** 配置 `lang: "zh_CN"` 时，所有页面都被加上 `/zh-CN` 前缀，根路径没有首页。

**原因：** `DEFAULT_LANG` 直接取配置值 `zh_CN`（下划线），而路由语言是 `zh-CN`（连字符），比较永远不相等。

**处理：** `src/constants/constants.ts`

```ts
// 路由使用连字符形式（zh-CN），配置里可能是下划线（zh_CN），统一后再比较
export const DEFAULT_LANG: SupportedLang = siteConfig.lang.replace("_", "-") as SupportedLang;
```

### 4. 分页数字链接硬编码首页

**现象：** 分页组件的数字页码跳转写死为 `/`、`/2/`，在说说这类非首页列表中点击会跳回首页。

**处理：** `src/components/control/Pagination.astro` 改为从 Astro 返回的 `page.url.last` 反推列表根路径：

```ts
const listRoot =
  page.url.last?.replace(/\/\d+\/?$/, "/") ?? page.url.first ?? Astro.url.pathname;

const getPageUrl = (p: number) => {
  if (p === 1) return listRoot;
  return `${listRoot.replace(/\/$/, "")}/${p}/`;
};
```

### 5. 内容错误：图片扩展名写错

源站一条说说正文把截图写成 `.png`，实际文件是 `.webp`，导致图片 404。迁移时已修正。

---

## 二、内容迁移

### 文章（5 篇）

从 `content/posts/*/index.mdoc` 迁移到 `src/content/posts/*/index.md`：

| 目录 | 标题 | 发布日期 |
| --- | --- | --- |
| `blog-attacked` | 博客被攻击 | 2026-01-09 |
| `laojunshan` | 老君山 | 2025-08-26 |
| `luoyang-three-day-trip` | 洛阳三日游记 | 2025-08-25 |
| `summer-jobs-2026` | 中三毕业暑假工 | 2026-09-10 |
| `vocational-exam-skills` | 职教高考（技能） | 2026-03-28 |

Frontmatter 字段转换：

| Coline | Fumika |
| --- | --- |
| `title` | `title` |
| `published_time` | `published` |
| `modified_time` | `updated`（与发布日期相同则省略） |
| `categories[0]` | `category` |
| `tags` | `tags` |

### 说说（30 条）

从 `content/moments/*/index.mdoc` 迁移到 `src/content/moments/*/index.md`，仅迁移 `status: publish` 的记录。

Frontmatter：`published_time` → `published`，`images` → `images`。

### 图片

`public/image/` 下全部迁移：`moments/`、`posts/`、`config/author/`，合计约 6.6 MB。

### 站点配置

`src/config.ts`：

- `title`: `0527 的小窝`
- `subtitle`: `记录学习与生活`
- `lang`: `zh_CN`，`supportedLangs`: `["zh_CN"]`
- `banner.src`: 换成迁移来的图片 `assets/images/banner.webp`
- `banner.credit.enable`: `false`
- `profileConfig.avatar`: `/image/config/author/avatar.400x400.jpg`
- `profileConfig.name`: `0527`
- `profileConfig.bio`: `记录学习、生活与折腾。`
- Giscus `lang`: `zh-CN`
- `deployConfig.siteUrl`: `https://www.080527.xyz`

### 清理的演示内容

- 删除 demo 文章（markdown、expressive-code、mermaid 等示例）
- 删除 demo 图片（`demo-banner.jpg`、`demo-avatar.jpg`、`example.jpg`、`guide-cover.jpg`）
- 清空 `src/content/data/friends.json` 中的演示友链
- 重写 `src/content/spec/zh-CN/about.md` 为个人自述

---

## 三、新增：说说页面

### 数据层

**`src/content.config.ts`** 新增 `moments` collection：

```ts
const momentsCollection = defineCollection({
  loader: glob({ base: "./src/content/moments", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    published: z.date(),
    images: z.array(z.string()).optional().default([]),
    location: z.string().optional(),
  }),
});
```

**`src/utils/content-utils.ts`** 新增 `getSortedMoments()`，按发布时间倒序。

**`src/utils/url-utils.ts`** 新增 `getMomentUrlBySlug()`。

### 页面

| 文件 | 说明 |
| --- | --- |
| `src/pages/[...lang]/moments/[...page].astro` | 列表页，每页 8 条，带分页 |
| `src/pages/[...lang]/moments/[slug].astro` | 详情页，带更早/更新导航与评论 |
| `src/components/MomentCard.astro` | 说说卡片组件 |

### 设计

- 卡片沿用主题的 `card-base`，与文章卡片同一视觉语言
- 时间使用主题次要文字色（`text-black/30 dark:text-white/30`）
- 图片网格按数量自适应：1 张大图（4:3）、2 张或 4 张两列、其余三列
- 详情页返回按钮 + 更早/更新导航，交互与文章页的前后篇一致

### 导航与 i18n

- `src/types/config.ts`：`LinkPreset` 新增 `Moments = 4`
- `src/constants/link-presets.ts`：新增说说导航项
- `src/i18n/i18nKey.ts`：新增 `moments`、`momentsCount`、`momentsImage`、`earlierMoment`、`laterMoment`
- 12 个语言包全部补齐对应翻译

---

## 四、阿里云 ESA Pages 部署配置

### 配置文件

根目录新增 **`esa.jsonc`**：

```jsonc
{
  "$schema": "https://esa.aliyun.com/schema/esa.jsonc",
  "name": "my-blog-fumika",
  "assets": {
    "directory": "./dist"
  },
  "build": {
    "command": "pnpm install --frozen-lockfile && pnpm run build",
    "nodeVersion": "22"
  }
}
```

### 字段说明

| 字段 | 值 | 说明 |
| --- | --- | --- |
| `name` | `my-blog-fumika` | 项目名，缺省取目录名 |
| `assets.directory` | `./dist` | **静态资源目录**，ESA 只认这个字段名 |
| `build.command` | `pnpm install --frozen-lockfile && pnpm run build` | 项目 `preinstall` 有 `only-allow pnpm`，必须用 pnpm；`--frozen-lockfile` 保证依赖版本与本地一致 |
| `build.nodeVersion` | `22` | Astro 7 要求 Node `>=22.12.0`，项目 `.nvmrc` 也是 22 |

> **易错点：** 不能用 `build.outputDirectory`。ESA 的产物目录字段是顶层的 `assets.directory`，写成 `outputDirectory` 会导致构建成功后仍报
> `Assets directory not set, skipping...` / `Both assets and function js file are not found`，站点部署为空。

### 构建流程

`pnpm run build` 实际执行：

```
astro build  →  生成 dist/
pagefind --site dist  →  生成搜索索引 dist/pagefind/
```

产物约 18 MB，Pagefind 构建后会索引 37 个页面、2246 个词条。

### 上线检查清单

- [x] `deployConfig.siteUrl` 为 `https://www.080527.xyz`（影响 canonical、sitemap、RSS、OG）
- [x] `esa.jsonc` 构建命令本地实测通过
- [x] `pnpm install --frozen-lockfile` 无报错
- [x] `astro check` / `tsc` / `biome` 全部 0 错误
- [x] 说说列表、详情、分页链接实测正确
- [ ] 在 ESA 控制台绑定域名 `www.080527.xyz`
- [ ] 配置 DNS 解析到 ESA
- [ ] 开启 HTTPS 证书
- [ ] 如需评论，替换 `src/config.ts` 中 `commentConfig.giscus` 为自有仓库（当前沿用主题作者的 repo）

> **注意：** `src/config.ts` 里的 Giscus 配置目前仍是原主题作者的仓库 `iyanarmanda/fumika`。评论会写到那个仓库的 Discussions 里，上线前请换成自己的仓库。

---

## 五、验证结果

| 检查项 | 结果 |
| --- | --- |
| `astro check` | 0 errors / 0 warnings / 0 hints（66 files） |
| `tsc --noEmit` | 通过 |
| `biome check ./src` | 通过（82 files） |
| `vitest run` | 26 tests passed |
| `pnpm run build` | 通过，44 页 |
| Pagefind 索引 | 37 页 / 2246 词 |
| 浏览器实测 | 卡片白底 16px 圆角、导航含「说说」、时间正确、图片无 404、分页链接互通 |

---

## 六、已知说明

1. **Mermaid 改为客户端渲染**：图表需要浏览器 JS 绘制，不再是构建期的静态图片。首次可见会稍有延迟，换来的是构建不依赖 Playwright、CI 更稳定。
2. **SourceMap 引用**：主题原 `Layout.astro` 中的注释与部分 demo 资源已清理，若后续从上游 Fumika 合并更新，注意 `ImageWrapper.astro` 的 glob 不要改回 `"../../**"`。

---

# 功能增强变更记录

迁移上线后的功能迭代，分为构建告警清理、评论与统计接入、页脚备案、页面切换动效修复、归档页混排五部分。

---

## 七、构建告警清理

`pnpm build` 原先输出 4 类告警，全部消除。

### 1. 友链集合为空

**现象：**

```
[WARN] [file-loader] No items found in ./src/content/data/friends.json
The collection "friends" does not exist or is empty.
```

**原因：** `friends.json` 是空数组 `[]`，Astro 的 `file()` loader 在数组为空时不会建立集合，`getCollection("friends")` 因此报错。

**处理：** 先填入一条本站占位条目（`src/content/data/friends.json`），后续替换为真实友链即可。

### 2. 图标目录不存在

```
[WARN] [astro-icon] Failed to load icons from "src/icons": ENOENT
```

**原因：** `astro-icon` 默认扫描 `src/icons` 存放本地 SVG，项目未创建该目录。

**处理：** 新建 `src/icons/` 并放入 `.gitkeep`。实测空目录可正常加载（0 个图标），不会报错。

### 3. 打包体积告警

```
(!) Some chunks are larger than 500 kB after minification.
```

**原因：** Mermaid 的语法解析器 647 KB、cytoscape 425 KB、KaTeX 253 KB。这些都由动态 `import()` 按需加载，只在含对应内容的页面才下载，属于合理体积。

**处理：** `astro.config.mjs` 中 `build.chunkSizeWarningLimit` 由默认 500 调整为 1024。

### 4. 无效的图标配置项

`astro.config.mjs` 的 `icon.include` 中混入一行 `"preprocess: vitePreprocess(),": ["*"]`，明显是主题作者的粘贴残留，不是图标集名称。已删除。

---

## 八、评论系统：Giscus → Waline

### 动机

Giscus 依赖 GitHub Discussions，访客必须登录 GitHub 才能评论。Waline 支持匿名评论，数据自托管。

### 改动

| 文件 | 说明 |
| --- | --- |
| `src/components/comment/Waline.astro` | 新增，评论挂载与生命周期管理 |
| `src/components/comment/index.astro` | 改为包裹 Waline，未配置时不渲染外层卡片 |
| `src/components/comment/Giscus.svelte` | 删除 |
| `src/styles/giscus-{base,dark,light}.css` | 删除 |
| `package.json` | 移除 `@giscus/svelte`，新增 `@waline/client@^3.16.1` |
| `src/types/config.ts` | `GiscusConfig` 替换为 `WalineConfig` |

### 关键实现

- **按需加载**：`import("@waline/client")` 动态引入，CSS 通过 `import "@waline/client/style"` 一并拆分。构建产物为独立的 `slim.js`（204 KB）+ `Waline.css`（22 KB），首页不加载。
- **主题跟随**：`dark: "html.dark"`，与站点深浅色切换联动。
- **Swup 兼容**：监听 `page:view` 重新挂载、`content:replace`（before）销毁旧实例，避免切换页面后评论错位或重复挂载。
- **避免重复计数**：`pageview: false`，阅读量交由 Umami 统计。
- **未配置即隐藏**：`serverURL` 为空字符串时，`comment/index.astro` 直接不渲染，不会发出无效请求。

### 调用方调整

Waline 用 `location.pathname` 定位评论串，不再需要文章对象。`src/pages/[...lang]/posts/[...slug].astro` 中 `<Comment post={entry} lang={lang}>` 改为 `<Comment lang={lang}>`。

---

## 九、访问统计：Umami

### 新增文件

`src/components/analytics/Umami.astro`，在 `Layout.astro` 中紧挨 `GoogleAnalytics` 挂载。

### 配置

`src/config.ts`：

```ts
export const analyticsConfig: AnalyticsConfig = {
	enabled: true,
	umami: {
		scriptUrl: "", // 例如 https://umami.example.com/script.js
		websiteId: "", // Umami 后台的 Website ID
		trackPath: true,
	},
};
```

### 关键实现

Umami 的 `data-auto-track` 只在首次加载时上报，Swup 切页不会自动记录。因此在 `trackPath: true` 时额外挂载 `page:view` hook 调用 `window.umami.track()` 手动补报。

`scriptUrl` 或 `websiteId` 任一为空时，脚本完全不注入。

---

## 十、页脚：运行时长与三类备案

### 配置化

原先页脚是纯静态 HTML，备案信息硬编码。现改为 `src/config.ts` 中的 `footerConfig`：

```ts
export const footerConfig: FooterConfig = {
	enable: true,
	since: "2026-10-30",       // 上线日期，用于计算「已稳定运行」；留空则不显示
	icp:    { text: "", url: "https://beian.miit.gov.cn/" },                  // 正式 ICP，留空不显示
	moeIcp: { text: "萌ICP备20259970号", url: "https://icp.gov.moe/?keyword=20259970" }, // 娱乐性质
	gongan: { text: "", url: "https://beian.mps.gov.cn/#/query/webSearch?code=" },        // 公安联网备案
	customHtml: "",            // 追加自定义 HTML，原样渲染
};
```

三类备案并排显示，各自为空则自动省略，移动端自动换行。

### 运行时长

新增 `src/components/misc/SiteRuntime.astro`，每秒刷新「X 天 XX 小时 XX 分 XX 秒」。

两个实现细节：

- 页脚在桌面端和移动端各渲染一份（`MainLayout` 中 `hidden lg:block` / `block lg:hidden`），因此用 `.site-runtime` 类选择器批量更新，不能用 `id`。
- Swup 切页会重建页脚 DOM，需在 `page:view` 时重新启动计时器，否则切页后数字停止跳动。

### 公安备案图标

`public/image/beian/gongan.png`（62×67，取自 `beian.mps.gov.cn`）。公安备案要求图标与文字同时可点击，因此必须本地托管，不能引用外链。

---

## 十一、页面切换动效修复

导航切页时存在两类「抽动」，成因不同，分两次修复。

### 1. 竖向抽动（先下沉再上浮）

**原因：** 两个动画的位移方向相反且叠加。

- 淡出：`html.is-animating .transition-swup-fade` 使用 `opacity-0 translate-y-4`（向下 1rem）
- 入场：`.onload-animation` 使用 `fade-in-up` 关键帧（从向下 2rem 开始上浮）

**处理：** `src/styles/transition.css` 淡出只保留透明度变化，去掉 `translate-y-4`。

**附带：** `--content-delay` 原先只在 `link:click` 中重置，浏览器前进/后退不触发该 hook，首屏 150ms 延迟会带到新页面。已在 `visit:start` 中兜底重置（`src/layouts/Layout.astro`）。

**附带：** 归档页原为 `client:only="svelte"`，服务端只输出 `astro-island` 空壳，Svelte 加载完成前是空白，同样表现为闪一下。改为 `client:load` 后时间轴由服务端直接渲染。

### 2. 横向抽动（先左移再复位）

**主因：** `Layout.astro` 中 `#page-height-extend` 是 `h-[300vh]` 的撑高块。切页时先显示它（防止滚动位置跳变），`visit:end` 后隐藏。原本无竖向滚动条的页面突然出现滚动条，内容区宽度减少约 15px、整体左移，隐藏后右移复位。

**处理：** `src/styles/main.css` 给 `html` 加 `scrollbar-gutter: stable`，始终预留滚动条槽位，无论滚动条是否存在内容宽度都不变。

**次因：** `initCustomScrollbar()` 绑定在 `content:replace` 上，每次切页都执行，而它初始化的是 `<body>`——body 从不参与 Swup 替换。等于每切一页就叠加一份 OverlayScrollbars 实例。已加 `bodyScrollbarInitialized` 标记，全页只初始化一次。

---

## 十二、归档页：文章与说说混排

### 改造前

`ArchivePanel.svelte` 用 `client:only` 渲染，只接收 `sortedPosts`，时间轴只有文章。

### 改造后

文章与说说混排进同一条时间轴，按时间倒序，同年内文章排在说说之前。

**数据层**（`src/utils/content-utils.ts`）：

- 新增 `getMomentsWithExcerpt()`，用 Astro 的 `render()` 取 `remarkPluginFrontmatter.excerpt`，再经 `toExcerpt()` 清洗 markdown 标记并截断。
- 摘要长度上限 20 字（`toExcerpt` 的 `maxLength` 默认值），超出补 `…`。

**展示层**（`src/components/ArchivePanel.svelte`）：

| 元素 | 文章 | 说说 |
| --- | --- | --- |
| 节点 | 小方块，悬停拉长为竖线 | 空心小圆点，悬停填充主题色 |
| 标题 | 粗体、`text-75` | 摘要、常规字重、`text-50` |
| 右侧标注 | 「文章」 | 「说说」 |

年份行统计拆分显示，例如「3 篇文章 · 30 条说说」，不再把说说算进文章数。

### 两个设计决定

1. **摘要截断到 20 字**：初版为 60 字，在窄屏下与右侧标注挤在一起，压缩到 20 字后一行可轻松放下。
2. **有筛选条件时只显示文章**：说说没有标签和分类，若带 `?tag=` / `?category=` 参数时仍混排说说，会让人误以为筛选失效。

### i18n

新增 `I18nKey.postLabel`（归档页的类型标注），12 个语言文件均已补齐。与既有的 `postCount`（「篇文章」，用于年份统计）语义不同，未合并。

---

## 十三、本次验证结果

| 检查项 | 结果 |
| --- | --- |
| `pnpm run build` | 通过，44 页，**零警告** |
| `astro check` | 0 errors / 0 warnings / 0 hints（69 files） |
| `tsc --noEmit` | 通过 |
| `svelte-check` | 0 errors / 0 warnings（858 files） |
| `biome check` | 通过 |
| 归档时间轴 | 35 条 = 5 篇文章 + 30 条说说，跨 2026/2025 两个年份块 |
| 页脚 | 三类备案、运行时长均正确渲染（桌面/移动各一份） |
| Waline | 未配置时不输出容器；配置后容器与 data 属性正确，`slim.js` 为独立分包 |
| Umami | 未配置时不注入脚本 |

### 未实测项

环境中无浏览器，以下需在 `pnpm dev` 下手动确认：

- [ ] 切页动效：首页 ↔ 其他页（banner 高度变化）是否还有位移
- [ ] Waline 实际发评论、切页后是否正确重建
- [ ] Umami 后台能否收到 Swup 切页的 PV
- [ ] 归档页在手机窄屏下三列布局是否拥挤
- [ ] `scrollbar-gutter: stable` 在 OverlayScrollbars 接管滚动条时是否生效

---

## 十四、上线前待填配置

`src/config.ts` 中以下字段当前为空占位，**留空时对应功能自动关闭、不会报错**：

| 字段 | 说明 |
| --- | --- |
| `commentConfig.waline.serverURL` | Waline 服务端地址 |
| `analyticsConfig.umami.scriptUrl` / `websiteId` | Umami 脚本地址与站点 ID |
| `footerConfig.icp.text` | 正式 ICP 备案号（工信部） |
| `footerConfig.gongan.text` / `url` | 公安联网备案号，URL 的 `code=` 后接编号数字 |
| `src/content/data/friends.json` | 当前为本站占位条目，替换为真实友链 |

> `footerConfig.moeIcp` 是娱乐性质的萌 ICP 备案，非正式备案，用作点缀。

---

## 十五、Windows → Linux 迁移后的环境清理（2026-11-01）

从 Windows 整目录复制到 Linux 后，项目里混入了大量与平台绑定的残留。

| 项目 | 现象 | 处理 |
| --- | --- | --- |
| `node_modules/` | 812MB，只含 `win32-x64` 原生包（esbuild、sharp、biome、lightningcss、oxide、rolldown 等），`.bin` 全是 `.CMD`/`.ps1` shim | 删除后用 pnpm 重装，改为 Linux 原生二进制 |
| `dist/`、`.astro/` | Windows 构建产物与开发缓存，`.astro/*.log` 里是旧机器的 PID/路径 | 删除后重新生成 |
| 文件权限 | 623 个文件全部是 `755`（复制带来的可执行位） | 文件 `644`、目录 `755` |
| `LICENSE` | CRLF 换行 | 统一为 LF |
| `.git/config` | `filemode=false`、`ignorecase=true`、`symlinks=false`（Windows 的克隆参数） | 改为 `true` / `false` / `true`，并补齐仓库级 `user.name`/`user.email` |
| `.gitattributes` | 只有 `* text=auto`，Windows 上仍可能检出 CRLF | 改为 `* text=auto eol=lf`，图片/字体标记 `binary`；`*.bat`/`*.cmd` 固定 `eol=crlf` 以防将来加脚本 |
| `.gitignore` | 没有 Windows 系统文件规则 | 增加 `Thumbs.db`、`Desktop.ini`、`$RECYCLE.BIN/`、`*.lnk`、`*.stackdump` |

> 本机 `192.168.1.1` 的 DNS 不响应，`pnpm install` 需要临时在命名空间里挂载公共 DNS 才能联网；这一步没有改动系统配置。

---

## 十六、隐藏问题审查与修复

这轮把主题源码、构建产物、RSS、SEO、脚本都过了一遍，确认并修复了 11 个问题，其中 2 个会造成内容缺失。

### 1. 同步脚本一次最多只上传 4 张图（严重，静默丢图）

**现象：** `pnpm release` 新增一批 jpg 图片时，只有前几张会出现在 R2 上，其余无报错地跳过；且同一批图片每次发布都会重新上传。

**原因：** `scripts/sync-images.mjs` 的 worker 里，转换完 webp 后直接 `return`，结束的是**整个 worker 循环**而不是当前任务，并发为 4 时最多处理 4 张转换图。另外 manifest 用原图路径（`001.jpg`）登记，转换后本地只剩 `001.webp`，下次按 `.webp` 查不到指纹，导致重复上传。

**修复：**

- 去掉 `return`，统一走「上传 → 写回 webp → 删原图 → 记录 manifest」流程
- manifest 改为按**输出文件**（webp）路径登记，并清理原图条目
- 指纹改为按**实际上传的字节**计算，保证下次运行能命中并跳过

### 2. RSS 订阅链接少了斜杠

**现象：** `<link rel="alternate" type="application/rss+xml" href="https://www.080527.xyzrss.xml">`，阅读器无法订阅。

**原因：** `Layout.astro` 用 `` `${import.meta.env.SITE}rss.xml` `` 拼接，而 `site` 配置末尾没有斜杠。

**修复：** 改用 `siteUrl("rss.xml")` 生成。

### 3. RSS 正文图片是站内相对路径

**现象：** 订阅源里图片地址为 `/image/posts/...`，离开站点后全部裂图。

**原因：** `rss.xml.ts` 用默认 `markdown-it` 渲染正文，没有经过站点的 CDN 映射与绝对化处理。

**修复：** 新增 `absolutizeImageUrls()`，把 `<img src>` 统一转成绝对地址（`/image/posts|moments/` 走 CDN，其余走站点域名），无 description 时用正文首段生成摘要。

### 4. SEO description 的兜底是死代码

**现象：** 所有文章（`description: ""`）的 meta description 都是站点副标题「记录学习与生活」，6 篇文章完全重复。

**原因：** `description = siteConfig.subtitle` 写在解构默认值里，后面的 `if (!description)` 永远不会成立。

**修复：**

- 去掉默认值，改为 `pageData.description → 站点副标题 → 标题` 依次兜底
- 文章页显式传入「首段摘要」作为描述
- 统一压成单行并截断到 160 字（此前摘要里的换行会直接进入 `content` 属性）

### 5. 文章页重复渲染两次

`[...slug].astro` 里 `render(entry)` 调用了两次（一次取 `Content`/`headings`，一次取 `remarkPluginFrontmatter`），改为一次解构。

### 6. 时间显示依赖构建机时区

**现象：** 说说时间在 UTC 的 CI 上会比实际早 8 小时，归档的年份分组在跨年边界也会错位。

**原因：** `Intl.DateTimeFormat` 未指定 `timeZone`，`ArchivePanel` 用 `getMonth()`/`getFullYear()` 取本地时区。

**修复：** `date-utils.ts` 新增统一格式化函数（固定 `Asia/Shanghai`）：`formatDateToYYYYMMDD`、`formatMonthDay`、`formatDateTime`、`getSiteYear`，说说明细、卡片、归档、SEO/JSON-LD 全部改用它们。

### 7. 说说分页与同日说说的标题/描述重复

**现象：** `/moments/2/`、`/moments/3/`… 的 `<title>` 和 description 完全相同；同一天的两条说说详情页标题也完全相同。

**修复：** 分页标题加 `· 2/4`，描述带页码与总数；说说明细标题改用「时间 + 摘要」，并同步到 description。

### 8. 文章排序比较器不返回 0

`content-utils.ts` 的 `sort` 只返回 `-1 / 1`，同日期文章顺序不稳定，改为 `dateB - dateA`。

### 9. 上一篇/下一篇丢失语言前缀

文章页的上一篇/下一篇链接调用 `getPostUrlBySlug()` 时没传 `lang`，多语言部署下会跳到默认语言，已补上。

### 10. 目录（TOC）在动画不触发时失效

`TOC.astro` 只靠 `.prose` 的 `animationend` 初始化，系统开启「减少动态效果」或动画被禁用时右侧目录永远不初始化。改为监听动画 + 600ms 兜底，并加 `initialized` 防止重复初始化。

### 11. 开发模式搜索提示写错包管理器

`Search.svelte` 的假结果提示是 `npm build && npm preview`，改为 `pnpm`。

---

## 十七、图片占位与加载失败兜底

站内正文图基本都在 R2，DNS/网络异常时整块空白，且此前没有任何占位或失败提示。这轮补了一套轻量方案。

### 状态机

所有图片统一经历三个状态，通过 `data-img-state` 表达：

| 状态 | 触发 | 表现 |
| --- | --- | --- |
| `pending` | 初始标记 / 脚本接管时图片尚未完成 | 底色 + 流光骨架，隐藏 alt 文本 |
| `loaded` | `load` 事件或 `complete && naturalWidth > 0` | 240ms 淡入，骨架停止 |
| `error` | `error` 事件 / 已完成但宽度为 0 | 替换为本地内联 SVG 占位图，`object-fit: contain` 保留版面 |

### 涉及文件

- 新增 `src/utils/image-placeholder.ts`：`initImagePlaceholders()` 扫描并接管图片，占位图为内联 data URI，不依赖网络与 base 路径；占位图本身失败时不再递归
- 新增 `src/styles/image-placeholder.css`：骨架流光、淡入、失败态样式，适配 `prefers-reduced-motion`
- `Layout.astro`：首屏初始化，并在 Swup 的 `content:replace` / `page:view` 后重新扫描
- `rehype-lazy-load-image.mjs`：正文图片补 `decoding="async"`、`data-img-placeholder`、`data-img-state`
- `ImageWrapper.astro`：封面/横幅/头像统一加占位标记；本地图片找不到时直接渲染占位图而不是空白；站内 `/image/posts|moments/` 前缀也走 CDN 映射
- `MomentCard.astro`、说说明细页：配图同样加占位标记

> 注意：Markdown 图片会经过 Astro 的 `rehype-images` + `updateImageReferencesInBody` 管线，该管线只保留 `class`/`for` 等少数属性，`data-*` 会被丢弃。因此正文图的骨架由客户端脚本补上；服务端能保留属性的场景（横幅、封面、说说配图）则直接输出。

### 实测

用无头 Chromium 打开构建产物，并把外网域名解析指向黑洞：

| 结果 | 数量 |
| --- | --- |
| 远程图 → `error` 并替换占位图 | 23 |
| 本地图 → `loaded` | 4 |

---

## 十八、已知遗留（持续更新）

| 项目 | 说明 | 建议 |
| --- | --- | --- |
| 本地图与 R2 双份 | `public/image` 约 15MB，会整目录复制进 `dist`；线上正文图实际走 CDN | 若在意产物体积，可在构建后清理 `dist/image/posts|moments`（需保证正文都已改为相对路径，现已满足） |
| 远程图片无 `width`/`height` | Astro 的 `inferSize` 需要构建机能访问 CDN，离线时会退化为普通 `<img>` | 构建环境保持可访问 CDN，或为图片补尺寸 |
| alt 文本是自动生成的 | 目前按图片前文语境截取 28 字生成，能通过无障碍/SEO 检查，但不够贴合画面 | 有空时按「这张图拍的是什么」逐张润色 |
| 无浏览器端自动化测试 | 占位逻辑目前只做了无头 Chromium 手工验证 | 如长期维护可加 Playwright |
| `ZodTypeAny` 弃用提示 | `astro check` 的唯一 1 条 hint，来自 `content.config.ts` | 跟随 Zod 升级调整类型 |

---

## 十九、本轮验证结果

| 检查项 | 结果 |
| --- | --- |
| `pnpm build` | 通过，45 页；Pagefind 索引 38 页 / 2380 词 |
| `pnpm check` | 0 errors / 0 warnings / 1 hint（`ZodTypeAny` 弃用，历史遗留） |
| `svelte-check` | 0 errors / 0 warnings |
| `vitest` | 26 项全部通过 |
| RSS | `<link rel="alternate">` 为 `https://www.080527.xyz/rss.xml`；正文图片均为 CDN 绝对地址；条目描述不再为空 |
| SEO | 文章 meta description 取首段摘要并压成单行；6 篇文章描述不再重复 |
| 说说 | 分页标题带页码，同日说说标题带摘要，标题/描述无重复 |
| 图片 | 无头 Chromium 验证：外网不可达时 23 张图进入占位态，本地 4 张正常淡入 |
| 内部链接 | 全站扫描 0 条死链；本地图片引用 0 条缺失 |

---

## 二十、2026-11-01 追加：图片路径统一、离线预览与工程化

### 1. 正文图片全部改为 `/image/...` 相对路径

- 新增 `scripts/pull-images.mjs`：反向同步 R2 → 本地，扫描 `src/content` 里硬编码的 CDN 地址，下载到 `public/image` 并改写正文
- 本次下载 40 张（约 8MB），改写 40 处引用；`laojunshan`、`luoyang-three-day-trip`、`blog-attacked` 不再写死域名
- 新增 `pnpm pull-images`，支持 `--dry-run` / `--force`，可重复执行

### 2. 开发模式改用本地图片

**原因：** `rehypeCdnImage` 之前不看运行模式，`pnpm dev` 也把正文图指向 CDN，断网或 DNS 异常时本地预览全裂。

**处理：** `astro.config.mjs` 仅在 `NODE_ENV === "production"` 时启用 CDN 映射。

| 命令 | 图片地址 |
| --- | --- |
| `pnpm dev` | `/image/posts/...`（本地） |
| `pnpm build` | `https://blog-images.395718.xyz/posts/...`（CDN） |

### 3. 图片 alt 补全

- 45 处空 alt 按「图片前文最近一段文字」自动生成，截断到 28 字
- 构建产物 270 张图片：缺 `alt` 属性 0，空 `alt` 0
- 自动文案偏「上下文描述」，够用但不精确，建议后续逐张润色

### 4. 每页恰好一个 `<h1>`

- 文章标题由 `div` 改为 `h1`（样式类不变）
- 首页、归档页、说说列表、说说明细补 `sr-only` 标题
- 全站 45 页 h1 数量均为 1（此前 42 页缺失）

### 5. 工程化

| 项目 | 说明 |
| --- | --- |
| `.env.example` | 新增；`.gitignore` 增加 `!.env.example`，方便换机器重建配置 |
| husky | 执行 `pnpm local-prepare` 启用，`.husky/_` 生成并加入 `.gitignore`，pre-commit（lint-staged）与 pre-push（`pnpm check`）真正生效 |
| `scripts/check-dist.mjs` | 新增构建产物检查，接入 `pnpm build` / `pnpm release`，也可单独 `pnpm check:dist` |

检查项与处置：

| 检查 | 级别 |
| --- | --- |
| 站内链接、`_astro` 静态资源是否存在 | 失败（退出码 1） |
| 正文引用的 `/image/...` 是否存在 | 失败 |
| 正文是否硬编码 CDN 地址 | 失败 |
| 重复 `<title>` / description | 提示 |
| 图片缺少 `alt` 属性 | 提示 |

### 6. 追加验证结果

| 检查项 | 结果 |
| --- | --- |
| `pnpm build` | 通过，45 页；`check-dist` 通过 |
| `pnpm check` | 0 errors / 0 warnings / 1 hint |
| `vitest` | 26 项全部通过 |
| 开发模式 | 页面输出 `/image/posts/...`，断网可正常预览 |
| 生产构建 | 图片仍为 CDN 绝对地址 |
| h1 / alt | 45 页 h1 均为 1；270 张图片无空 alt |
| 重复描述 | 仅首页、关于、友链共用站点副标题（提示项） |



---

## 二十一、2026-11-01 功能迭代：B/D/E/F/G/I/J/O

本轮按约定只做 8 项，其余功能不动。

### B. 图片尺寸（防 CLS）

- 新增 `scripts/image-sizes.mjs`：构建前用 sharp 扫描 `public/image`，生成 `src/generated/image-sizes.json`
- 新增 `src/integrations/image-dimensions.mjs`：`astro:build:done` 时给最终 HTML 的 `<img>` 补 `width`/`height`，CDN 地址会被还原成 `/image/...` 查表
- 选择「构建后改 HTML」而不是 rehype 的原因：正文图片会经过 Astro 图片管线，`data-*` 会被丢弃，改最终产物最稳
- `package.json`：`build` 前置生成尺寸表，新增 `predev` 与 `images:sizes`
- 本次补全 **148 张**图片的尺寸；Lighthouse CLS **0.002**

### D. 标签页与分类页

- 新增路由：
  - `src/pages/[...lang]/tags/[tag]/[...page].astro`
  - `src/pages/[...lang]/categories/[category]/[...page].astro`
- 支持分页、独立 title/description、进 sitemap
- `getTagUrl` / `getCategoryUrl` 改指向新路由；未分类仍走 `/archive/?uncategorized=true`
- 旧查询参数链接（`/archive/?tag=`）保持可用
- 生成 **10 个标签页 + 4 个分类页**，站点页面数 45 → 59
- `url-utils.test.ts` 同步更新，26 项测试通过

### E. 搜索快捷键

`Search.svelte` 新增：

- `Ctrl/Cmd + K` 打开并聚焦搜索框
- `Esc` 关闭面板
- `↑ / ↓` 在结果间移动并高亮，`Enter` 打开选中结果
- 修复「聚焦空输入框时面板被立即关闭」的旧行为
- 面板底部增加快捷键提示

实测（无头 Chromium）：快捷键打开、输入出结果、方向键高亮、回车跳转全部通过。

### F. 相关文章

- `content-utils.ts` 构建期计算：标签 Jaccard 相似度 + 同分类加权 0.25，取前 3
- 全部为 0 时按最近文章兜底
- 文章页底部新增「相关阅读」卡片

### G. 置顶文章

- `content.config.ts` 新增 `pinned: boolean`（默认 `false`）
- 列表排序：置顶优先，其余按时间倒序
- 文章卡片与文章标题上方显示「置顶」标记
- 当前没有文章设置 `pinned: true`，功能待内容启用

### I. 阅读进度条与分享

- `ReadingProgress.astro` + `utils/reading-progress.ts`：顶部 3px 进度条，`requestAnimationFrame` 节流，仅文章页渲染
- `ShareButtons.astro` + `utils/share.ts`：复制链接、系统分享（`navigator.share` 可用时自动显示）、微博、X
- 复制成功显示「已复制」提示；`http` 环境下回退到 `execCommand`
- 监听器只在 `Layout` 绑定一次，Swup 切页后重新同步

实测：Ctrl+K 同批测试通过；分享按钮复制到剪贴板内容为文章绝对地址，提示正常显示。

### J. 中文排版与思源黑体

- 新增依赖 `@fontsource-variable/noto-sans-sc`（可变字重，101 个 unicode-range 切片）
- `--font-sans` 改为 `Roboto → Noto Sans SC Variable → system`，代码块仍用 JetBrains Mono
- `markdown.css` 增加中文排版：正文行高 1.85、段距 1.05em、h2/h3 间距、列表行高、图片与分割线间距、桌面端字号 1.0625rem
- 产物中字体共 5.4MB，但浏览器只会按 unicode-range 下载当前页面用到的切片

### O. Lighthouse CI

- 新增 `lighthouserc.json`：`staticDistDir` 模式，跑首页与一篇文章
- 预算：性能/无障碍/最佳实践 `warn ≥ 0.9`，SEO `error ≥ 0.9`，CLS `error ≤ 0.05`，LCP `warn ≤ 2.5s`
- `.github/workflows/build.yml` 在 Node 22 的构建任务后执行 `lhci autorun`
- 新增 devDependency `@lhci/cli`，`.lighthouseci/` 已忽略

### 顺带修复的可访问性问题

Lighthouse 首轮报告暴露了几个真实问题：

| 问题 | 原因 | 修复 |
| --- | --- | --- |
| 空链接 | `footerConfig.icp.text` / `gongan.text` 为空时仍渲染 `<a>` | 仅在文本非空时渲染 |
| 分页空 `href` | 无上一页/下一页时输出 `<a href="">` | 改为 `aria-hidden` 的 `<span>` |
| 标签/分类可访问名称不匹配 | 计数徽标被计入可见文本 | 徽标加 `aria-hidden` |
| `a` 内嵌 `button` | `ButtonLink` 结构非法 | 内层改为 `div` |
| 标题层级跳跃 | 部分文章从 `h3` 开始 | 正文前加 `sr-only` 的 `h2` |

### 验证结果

| 检查项 | 结果 |
| --- | --- |
| `pnpm build` | 通过，59 页；check-dist 通过 |
| `pnpm check` | 0 errors / 0 warnings / 1 hint（历史遗留） |
| `vitest` | 26 项通过 |
| Lighthouse（本地无外网） | SEO 1.0、CLS 0.002、无障碍 0.96 / 0.93；性能与 LCP 因本机 DNS 不可用，数值不代表线上 |
| 功能实测 | Ctrl+K、结果高亮、回车跳转、进度条、复制链接、标签页均通过 |

> 注意：本机外网 DNS 仍不可用，Lighthouse 的性能分数与 LCP 会被 CDN/Waline/Umami 请求超时拖累，需要以 CI（有网络）结果为准。

---

## 二十二、2026-11-01 修正：移除分享、修复进度条、清理洛阳图片遗留

### 1. 移除分享模块

- 删除 `ShareButtons.astro`、`utils/share.ts` 及 `Layout` / 文章页中的引用与初始化
- 清理 `share`、`copyLink`、`copied` 三个 i18n key（12 种语言文件）
- 阅读进度条保留

### 2. 修复阅读进度条不可见

**现象：** 文章页顶部看不到进度条，但滚动时 `transform` 数值确实在变化。

**原因：** 进度条渲染在 `#content-wrapper` 内，该元素带 `onload-animation` 的 `transform`（`fill-mode: forwards` 会一直保留），导致内部 `position: fixed` 相对该内容区而不是视口定位。实测进度条被定位到 `top: 259px; left: 344px`，滚动后直接离开可视区域。

**修复：**

- 进度条移到 `Layout.astro` 的 `<body>` 直属层级，避免任何 transform 祖先
- `utils/reading-progress.ts` 按 `location.pathname` 判断是否文章页：非文章页直接隐藏，Swup 切页后重新判断

**实测：** 文章页 `top: 0; left: 0`，滚动后 `scaleX` 正常增长；首页 `display: none`；从首页 Swup 切到文章页后重新显示。

### 3. 清理洛阳文章的迁移遗留

**现象：** 《洛阳三日游记》正文里有多处看起来像图片的位置显示为一行文本。

**原因：** 迁移前旧主题有 22 张图片没有成功导入，留下了 `Missing image nal/img/...` 的占位文本（文件名还带 `luoayng` 拼写错误）。这些是迁移前就存在的问题，不是本次改动导致的。

**确认：** 列出 R2 全部 70 个对象，没有任何 `nal/img` 或对应时间戳的文件，确认无法恢复原图。

**处理：** 删除全部 22 行占位文本；文章保留 16 张可用图片（001–016）。

### 4. 验证结果

| 检查项 | 结果 |
| --- | --- |
| `pnpm build` | 59 页；check-dist 通过 |
| `pnpm check` | 0 errors / 0 warnings / 1 hint（历史遗留） |
| `vitest` | 26 项通过 |
| 正文残留 | `Missing image` 0 处 |
| 分享 | DOM 中 0 处 |
| 进度条 | 文章页 `top/left = 0`，首页隐藏，Swup 切页正常 |

---

## 二十三、2026-11-01 找回《洛阳三日游记》缺失的 22 张图片

### 来源

旧博客工程与素材盘：

- 旧文章：`next-theme-coline-master/content/posts/luoyang-three-day-trip/index.mdoc`
- 图片素材：`Desktop/blogimages/img/`

旧文章里同样存在 22 行 `Missing image nal/img/...`，但对应文件都在 `blogimages/img/` 里，按文件名可以一一对应。

### 处理

- 22 张图片统一转为 WebP（最大宽度 1600，质量 82），放入 `public/image/posts/luoyang-three-day-trip/`
- 保留原文件名与时间戳，修正两处 `luoayng-` 拼写为 `luoyang-`
- 按旧文章中的原始位置补回 22 处引用，并按上下文自动生成 alt
- 文章图片从 16 张恢复到 **38 张**，`Missing image` 文本 0 处
- 图片目录从 15MB 增至约 23MB，`image-sizes` 重新生成（92 张）

### 验证

| 检查项 | 结果 |
| --- | --- |
| `pnpm build` | 59 页；check-dist 通过 |
| 正文图片 | 38 张，滚动到底全部加载成功 |
| 残留占位 | `Missing image` 0 处 |
| 重复图片 | 0 组（SHA-256 校验） |

---

## 二十四、2026-11-01 图片统一重命名为 001–038

### 处理

- 《洛阳三日游记》的 38 张图片按正文出现顺序统一命名为 `001.webp` – `038.webp`
- 先移到临时目录再落到最终文件名，避免 `012.webp` 这类新旧同名互相覆盖
- 重写正文引用时按顺序重新编号（第一次替换脚本存在「新名字又是旧名字」的替换链问题，导致引用重复，已修正并复核）

### 校验

| 检查项 | 结果 |
| --- | --- |
| 文件数 | 38，编号连续无缺口 |
| 内容对应 | 逐张与重命名前 SHA-256 比对，38/38 一致 |
| 重复图片 | 0 组 |
| 正文引用 | 38 处，顺序为 001 → 038 |
| 构建产物 | 38 个引用，check-dist 通过 |

> 文件名变化意味着 R2 上的 key 也会变化，需要重新执行 `pnpm sync-images`（或 `pnpm release`）上传；旧的时间戳文件名对象可在确认后删除。

---

## 二十五、2026-11-07 审查报告修复

来源：一份外部审查报告，逐项复核后修复了 4 个问题，并补回一张遗漏图片。

### 1. 主题色（hue）无法持久化

**原因：** `setHue()` 只改 CSS 变量，没有写 `localStorage`；`getHue()` 只读构建期的 `data-hue`。

**修复：**

- `setting-utils.ts`：`setHue()` 写入 `localStorage`，`getHue()` 优先读取保存值
- `DisplaySettings.svelte`：初始值改为 `getHue()`，重置按钮固定回到站点默认色（`DEFAULT_HUE`），不再把「上次保存的颜色」当默认

**验证：** 设置 `hue=200` 刷新后仍为 200；拖动滑块到 120 后刷新保持 120。

> 注意：主题色选择器在生产构建里被 `!import.meta.env.PROD` 隐藏，只有开发模式能看到入口；持久化对 dev 生效。

### 2. 说说页前后导航方向与文案不一致

**原因：** `prev` 实际是更旧的说说、`next` 是更新的，但模板左侧用了 `next` 却写「更早的说说」，右侧用了 `prev` 却写「更新的说说」。

**修复：** 左按钮改用 `prev`（更早）+ earlierMoment，右按钮改用 `next`（更新）+ laterMoment。

**验证：**

- `2026-11-04-2`：左 → `2026-11-04-1`「更早」；右 → `2026-11-05-1`「更新」
- `2026-11-05-1`（最新）：左 → `2026-11-04-2`；右侧禁用

### 3. SEO 描述重复 / 404 使用站点副标题

- `archive.astro` 补 `description={i18n(I18nKey.archive)}`
- `404.astro` 补 `description={i18n(I18nKey.notFound)}`

`check-dist` 的「重复描述」警告随之消失。

### 4. vitest 使用 `__dirname`

改为 `import.meta.dirname`，消除 Vite 的未来兼容警告。

### 5. 其他清理

- `.r2-manifest.json` 删除 3 条本地已不存在的记录（`posts/_test/sample.jpg`、`posts/2026-10-31/001.jpg`、`002.jpg`）
- `sync-images.mjs` 保存 manifest 前自动清理失效条目，避免长期膨胀
- `git log --all -- .env` 为空，确认 `.env` 从未进入提交历史

### 6. 补回老君山缺失的 015

旧文章里这张图的 URL 因为文件名带空格被截断（`...001%20(135`），迁移时遗漏。已从旧素材目录找回：

- 原图 1920×1080 → 1600×900 WebP
- 插入到「十里画屏」段落之后，alt 为「雾中的十里画屏栈道」
- 编号恢复为 001–024 连续
- 已上传 R2

### 7. 未改动项

`pinned`（置顶）字段逻辑正常，但当前没有任何文章设置 `pinned: true`，属于内容未启用，不是代码 bug。

### 验证结果

| 检查项 | 结果 |
| --- | --- |
| `pnpm build` | 68 页，check-dist 通过，无重复描述警告 |
| `pnpm check` | 0 errors / 0 warnings |
| `vitest` | 26 项通过 |
| 主题色 | 刷新后保持 |
| 说说导航 | 方向与文案一致 |
| 老君山 | 001–024 连续，R2 已上传 |
