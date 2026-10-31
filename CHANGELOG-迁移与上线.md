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
