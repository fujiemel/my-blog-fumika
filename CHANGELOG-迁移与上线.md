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
  "version": "1.0",
  "build": {
    "command": "pnpm install --frozen-lockfile && pnpm run build",
    "outputDirectory": "dist",
    "nodeVersion": "22"
  }
}
```

### 字段说明

| 字段 | 值 | 说明 |
| --- | --- | --- |
| `command` | `pnpm install --frozen-lockfile && pnpm run build` | 项目 `preinstall` 有 `only-allow pnpm`，必须用 pnpm；`--frozen-lockfile` 保证依赖版本与本地一致 |
| `outputDirectory` | `dist` | Astro 默认输出目录 |
| `nodeVersion` | `22` | Astro 7 要求 Node `>=22.12.0`，项目 `.nvmrc` 也是 22 |

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
