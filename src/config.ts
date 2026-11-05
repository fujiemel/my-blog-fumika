import type {
	AnalyticsConfig,
	CommentConfig,
	DeployConfig,
	ExpressiveCodeConfig,
	FooterConfig,
	LicenseConfig,
	NavBarConfig,
	ProfileConfig,
	SiteConfig,
} from "./types/config";
import { LinkPreset } from "./types/config";

export const siteConfig: SiteConfig = {
	title: "0527 的小窝",
	subtitle: "记录学习与生活",
	lang: "zh_CN", // 语言代码，例如 'en'、'zh_CN'、'ja' 等。
	supportedLangs: ["zh_CN"], // 若为空则使用所有支持的语言。可按数组顺序排序
	theme: {
		hue: 75, // 主题色默认色相，范围从 0 到 360。例如 red: 0, teal: 200, cyan: 250, pink: 345
		mode: "light",
	},
	banner: {
		enable: true,
		src: "assets/images/banner.webp", // 相对于 /src 目录；若以 '/' 开头，则相对于 /public 目录
		position: "center", // 相当于 object-position，仅支持 'top'、'center'、'bottom'。默认为 'center'
		credit: {
			enable: false, // 显示横幅图片的署名文本
			text: "畑乃おいも / Hatano Oimo", // 要显示的署名文本
			url: "https://www.pixiv.net/en/artworks/124171254", // （可选）原始作品或艺术家页面的链接
		},
	},
	toc: {
		enable: true, // 在文章右侧显示目录
		depth: 2, // 要显示的最大标题深度，范围从 1 到 3
	},
	favicon: [
		// 让此数组为空即可使用默认 favicon
		// {
		//   src: '/favicon/icon.svg',    // favicon 的路径，相对于 /public 目录
		//   theme: 'light',              // （可选）'light' 或 'dark'，只有在浅/深色模式有不同 favicon 时才设置
		//   sizes: '32x32',              // （可选）favicon 的尺寸，若有不同大小的 favicon 可设定
		// }
	],
	ogImage: {
		useDefault: true,
		defaultSrc: "/media/images/banner.jpg",
	},
};

export const navBarConfig: NavBarConfig = {
	links: [
		LinkPreset.Home,
		LinkPreset.Moments,
		LinkPreset.Archive,
		LinkPreset.Friends,
		LinkPreset.About,
		{
			name: "开往", // 开往 Travellings
			url: "https://www.travellings.cn/train.html",
			external: true,
			// icon: "fa6-solid:train-subway",
		},
	],
};

export const profileConfig: ProfileConfig = {
	avatar: "/image/config/author/avatar.400x400.jpg", // 相对于 /src 目录；若以 '/' 开头，则相对于 /public 目录
	name: "0527",
	bio: "记录学习、生活与折腾。",
	links: [
		{
			name: "GitHub",
			icon: "fa6-brands:github",
			url: "https://github.com/syfxlin/next-theme-coline",
		},
	],
};

export const licenseConfig: LicenseConfig = {
	enable: true,
	name: "CC BY-NC-SA 4.0",
	url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
};

export const expressiveCodeConfig: ExpressiveCodeConfig = {
	// 注意：某些样式（例如背景色）会被覆盖，详见 astro.config.mjs 文件。
	// 请选择深色主题，因为此博客主题目前仅支持深色背景
	theme: "github-dark",
};

// 评论系统（Waline）。serverURL 留空则全站不显示评论区
export const commentConfig: CommentConfig = {
	waline: {
		serverURL: "https://instance.waline.infvar.com/limiverse", // 例如 https://waline.example.com
		lang: "zh-CN",
		login: "enable", // 允许匿名评论，同时支持登录
		visitorCount: true, // 显示阅读量
		reaction: false, // 文章底部表情回应
		meta: ["nick", "mail", "link"],
		requiredMeta: ["nick"],
		pageSize: 10,
	},
};

// 网站分析配置
export const analyticsConfig: AnalyticsConfig = {
	enabled: true,
	// 示例：如果使用 Google Analytics，请不要忘记将 `enabled` 设为 true
	// google: {
	//	 id: "G-xxx",
	// },
	umami: {
		scriptUrl: "https://cloud.umami.is/script.js", // 例如 https://umami.example.com/script.js
		websiteId: "ce42d32d-7a1a-4e52-9f13-75ccdd7e3678", // Umami 后台的 Website ID
		trackPath: true,
	},
};

// 页脚配置
export const footerConfig: FooterConfig = {
	enable: true,
	since: "2026-10-30", // 站点上线日期，用于计算已稳定运行时长；留空则不显示
	icp: {
		text: "苏ICP备2026085465号", // 正式 ICP 备案号，从工信部备案系统获取；留空则不显示
		url: "https://beian.miit.gov.cn/",
	},
	gongan: {
		text: "苏公网安备32132202001596号", // 填公安备案号，如 京公网安备11010502030146号
		url: "https://beian.mps.gov.cn/#/query/webSearch?code=", // code 后面接备案编号中的数字部分
	},
	moeIcp: {
		text: "萌ICP备20259970号", // 娱乐性质的萌 ICP 备案
		url: "https://icp.gov.moe/?keyword=20259970",
	},
	customHtml: "", // 追加到页脚的自定义 HTML，会原样渲染
};

// 部署配置（Netlify、GitHub Pages、Cloudflare 等）
export const deployConfig: DeployConfig = {
	siteUrl: "https://www.080527.xyz",
	baseUrl: "/",
};
