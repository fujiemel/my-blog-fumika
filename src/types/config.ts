import type { InferEntrySchema, RenderedContent } from "astro:content";
import type {
	ALL_LANGUAGES,
	DARK_MODE,
	LIGHT_MODE,
} from "@constants/constants";

export type ConfigLang =
	| "en"
	| "zh_CN"
	| "zh_TW"
	| "ja"
	| "ko"
	| "es"
	| "th"
	| "vi"
	| "tr"
	| "id"
	| "fr"
	| "fa";

export type SiteConfig = {
	title: string;
	subtitle: string;

	lang: ConfigLang;
	supportedLangs: ConfigLang[];
	// rtl: boolean;  // TODO make it work without destryoing layouts

	theme: {
		hue: number;
		mode: "light" | "dark";
	};
	banner: {
		enable: boolean;
		src: string;
		position?: "top" | "center" | "bottom";
		credit: {
			enable: boolean;
			text: string;
			url?: string;
		};
	};
	toc: {
		enable: boolean;
		depth: 1 | 2 | 3;
	};

	favicon: Favicon[];

	ogImage: {
		useDefault: boolean;
		defaultSrc?: string;
	};
};

export type Favicon = {
	src: string;
	theme?: "light" | "dark";
	sizes?: string;
};

export enum LinkPreset {
	Home = 0,
	Archive = 1,
	About = 2,
	Friends = 3,
	Moments = 4,
}

export type NavBarLink = {
	name: string;
	url: string;
	external?: boolean;
};

export type NavBarConfig = {
	links: (NavBarLink | LinkPreset)[];
};

export type ProfileConfig = {
	avatar?: string;
	name: string;
	bio?: string;
	links: {
		name: string;
		url: string;
		icon: string;
	}[];
};

export type LicenseConfig = {
	enable: boolean;
	name: string;
	url: string;
};

export type LIGHT_DARK_MODE = typeof LIGHT_MODE | typeof DARK_MODE;

export type BlogPostData = {
	body: string;
	title: string;
	published: Date;
	description: string;
	tags: string[];
	draft?: boolean;
	image?: string;
	category?: string;
	prevTitle?: string;
	prevSlug?: string;
	nextTitle?: string;
	nextSlug?: string;
};

export type ExpressiveCodeConfig = {
	theme: string;
};

export type GetSortedPosts = {
	id: string;
	body?: string | undefined;
	collection: "posts";
	data: InferEntrySchema<"posts">;
	rendered?: RenderedContent | undefined;
	filePath?: string;
};

export type WalineConfig = {
	serverURL: string;
	lang?: string;
	login?: "enable" | "disable" | "force";
	visitorCount?: boolean;
	reaction?: boolean;
	meta?: ("nick" | "mail" | "link")[];
	requiredMeta?: ("nick" | "mail" | "link")[];
	pageSize?: number;
};

export type CommentConfig = {
	waline?: WalineConfig;
};

export type GoogleAnalytics = {
	id: string;
};

export type UmamiConfig = {
	/** Umami 统计脚本地址，如 https://umami.example.com/script.js */
	scriptUrl: string;
	/** 站点在 Umami 后台的 Website ID */
	websiteId: string;
	/** 单页应用切换时手动上报访问，避免漏记 */
	trackPath?: boolean;
};

export type AnalyticsConfig = {
	enabled: boolean;
	google?: GoogleAnalytics;
	umami?: UmamiConfig;
};

export type FooterConfig = {
	enable: boolean;
	/** 站点上线时间，用于计算「已稳定运行」时长，格式 YYYY-MM-DD。留空则不显示 */
	since?: string;
	/** 正式 ICP 备案（工信部），留空则不显示 */
	icp?: {
		text: string;
		url: string;
	};
	/** 娱乐性质的萌 ICP 备案，留空则不显示 */
	moeIcp?: {
		text: string;
		url: string;
	};
	/** 公安联网备案信息，留空则不显示 */
	gongan?: {
		/** 备案号文本，如 京公网安备11010502030146号 */
		text: string;
		url: string;
	};
	/** 追加到页脚的自定义 HTML，会原样渲染 */
	customHtml?: string;
};

export type DeployConfig = {
	siteUrl: string;
	baseUrl: string;
};

export type SupportedLang = (typeof ALL_LANGUAGES)[number];
