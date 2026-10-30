import type { LIGHT_DARK_MODE, SupportedLang } from "@/types/config";
import { siteConfig } from "../config";

export const PAGE_SIZE = 8;

export const LIGHT_MODE = "light";
export const DARK_MODE = "dark";
export const DEFAULT_MODE: LIGHT_DARK_MODE =
	siteConfig.theme.mode === "light" ? LIGHT_MODE : DARK_MODE;

export const DEFAULT_HUE = siteConfig.theme.hue;

// Banner height unit: vh
export const BANNER_HEIGHT = 35;
export const BANNER_HEIGHT_EXTEND = 30;
export const BANNER_HEIGHT_HOME: number = BANNER_HEIGHT + BANNER_HEIGHT_EXTEND;

// The height the main panel overlaps the banner, unit: rem
export const MAIN_PANEL_OVERLAPS_BANNER_HEIGHT = 3.5;

// Page width: rem
export const PAGE_WIDTH = 75;

export const ALL_LANGUAGES = [
	"en",
	"es",
	"fa",
	"fr",
	"id",
	"ja",
	"ko",
	"th",
	"tr",
	"vi",
	"zh-CN",
	"zh-TW",
] as const;

// 路由使用连字符形式（zh-CN），配置里可能是下划线（zh_CN），统一后再比较
export const DEFAULT_LANG: SupportedLang = siteConfig.lang.replace(
	"_",
	"-",
) as SupportedLang;

const baseLangs =
	siteConfig.supportedLangs && siteConfig.supportedLangs.length > 0
		? siteConfig.supportedLangs.map(
				(lang) => lang.replace("_", "-") as SupportedLang,
			)
		: [...ALL_LANGUAGES];

const activeConfigLang = siteConfig.lang.replace("_", "-") as SupportedLang;

export const SUPPORTED_LANG: readonly SupportedLang[] = baseLangs.includes(
	activeConfigLang,
)
	? baseLangs
	: [activeConfigLang, ...baseLangs];
