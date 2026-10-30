import type {
	AnalyticsConfig,
	CommentConfig,
	DeployConfig,
	ExpressiveCodeConfig,
	LicenseConfig,
	NavBarConfig,
	ProfileConfig,
	SiteConfig,
} from "./types/config";
import { LinkPreset } from "./types/config";

export const siteConfig: SiteConfig = {
	title: "0527 的小窝",
	subtitle: "记录学习与生活",
	lang: "zh_CN", // Language code, e.g. 'en', 'zh_CN', 'ja', etc.
	supportedLangs: ["zh_CN"], // Use all supported language if empty. It can be sorted by array order
	theme: {
		hue: 75, // Default hue for the theme color, from 0 to 360. e.g. red: 0, teal: 200, cyan: 250, pink: 345
		mode: "light",
	},
	banner: {
		enable: true,
		src: "assets/images/banner.webp", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
		position: "center", // Equivalent to object-position, only supports 'top', 'center', 'bottom'. 'center' by default
		credit: {
			enable: false, // Display the credit text of the banner image
			text: "畑乃おいも / Hatano Oimo", // Credit text to be displayed
			url: "https://www.pixiv.net/en/artworks/124171254", // (Optional) URL link to the original artwork or artist's page
		},
	},
	toc: {
		enable: true, // Display the table of contents on the right side of the post
		depth: 2, // Maximum heading depth to show in the table, from 1 to 3
	},
	favicon: [
		// Leave this array empty to use the default favicon
		// {
		//   src: '/favicon/icon.svg',    // Path of the favicon, relative to the /public directory
		//   theme: 'light',              // (Optional) Either 'light' or 'dark', set only if you have different favicons for light and dark mode
		//   sizes: '32x32',              // (Optional) Size of the favicon, set only if you have favicons of different sizes
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
		LinkPreset.About,
		LinkPreset.Friends,
	],
};

export const profileConfig: ProfileConfig = {
	avatar: "/image/config/author/avatar.400x400.jpg", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
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
	// Note: Some styles (such as background color) are being overridden, see the astro.config.mjs file.
	// Please select a dark theme, as this blog theme currently only supports dark background color
	theme: "github-dark",
};

// Check https://giscus.app/ to get repoId and categoryId
export const commentConfig: CommentConfig = {
	giscus: {
		repo: "iyanarmanda/fumika",
		repoId: "R_kgDOTQYphQ",
		category: "General", // Choose "Announcements" for prevent visitor leave a comment on GitHub directly
		categoryId: "DIC_kwDOTQYphc4DBG8B",
		mapping: "pathname",
		strict: "0",
		reactionsEnabled: "1",
		emitMetadata: "1",
		inputPosition: "top",
		theme: "reactive",
		lang: "zh-CN",
		loading: "lazy",
	},
};

// Site analytics config, only support GA4 for now
export const analyticsConfig: AnalyticsConfig = {
	enabled: false,
	// Example if using Google Analytics, don't forget to make `enabled` true
	// google: {
	//	 id: "G-xxx",
	// },
};

// Deploy configuration (Netlify, GitHub Pages, Coludflared, etc)
export const deployConfig: DeployConfig = {
	siteUrl: "https://www.080527.xyz",
	baseUrl: "/",
};
