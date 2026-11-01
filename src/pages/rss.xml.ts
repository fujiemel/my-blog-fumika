import rss from "@astrojs/rss";
import { cdnImage } from "@utils/cdn";
import { getSortedPosts } from "@utils/content-utils";
import { getPostUrlBySlug, siteUrl } from "@utils/url-utils";
import type { APIContext } from "astro";
import MarkdownIt from "markdown-it";
import sanitizeHtml from "sanitize-html";
import { siteConfig } from "@/config";

const parser = new MarkdownIt();

function stripInvalidXmlChars(str: string): string {
	return str.replace(
		// biome-ignore lint/suspicious/noControlCharactersInRegex: https://www.w3.org/TR/xml/#charsets
		/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\uFDD0-\uFDEF\uFFFE\uFFFF]/g,
		"",
	);
}

/**
 * 站内图片在正文里是 `/image/...` 这样的相对站点的路径，
 * 阅读器没有站点上下文，必须转成绝对地址（并走 CDN）。
 */
function absolutizeImageUrls(html: string, postUrl: string): string {
	return html.replace(
		/(<img\b[^>]*?\bsrc=")([^"]*)(")/gi,
		(match, before: string, src: string, after: string) => {
			if (!src || /^(?:[a-z]+:)?\/\//i.test(src) || src.startsWith("data:")) {
				return match;
			}

			let absolute: string;
			if (src.startsWith("/")) {
				const cdn = cdnImage(src);
				absolute = cdn === src ? siteUrl(src) : cdn;
			} else {
				absolute = new URL(src, postUrl).href;
			}

			return `${before}${absolute}${after}`;
		},
	);
}

/** 无 description 时用正文首段生成摘要，避免 RSS 条目描述为空 */
function toPlainText(markdown: string, maxLength = 160): string {
	const text = markdown
		.replace(/```[\s\S]*?```/g, " ")
		.replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
		.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
		.replace(/^#{1,6}\s+/gm, "")
		.replace(/[>*_~`]/g, "")
		.replace(/\s+/g, " ")
		.trim();

	return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

export async function GET(context: APIContext): Promise<Response> {
	const blog = await getSortedPosts();

	return rss({
		title: siteConfig.title,
		description: siteConfig.subtitle || "No description",
		site: context.site ?? siteUrl(),
		items: blog.map((post) => {
			const content =
				typeof post.body === "string" ? post.body : String(post.body || "");
			const cleanedContent = stripInvalidXmlChars(content);
			const link = getPostUrlBySlug(post.id);
			const sanitized = sanitizeHtml(parser.render(cleanedContent), {
				allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
			});

			return {
				title: post.data.title,
				pubDate: post.data.published,
				description: post.data.description || toPlainText(cleanedContent),
				link,
				content: absolutizeImageUrls(sanitized, siteUrl(link)),
				categories: post.data.tags,
			};
		}),
		customData: `<language>${siteConfig.lang}</language>`,
	});
}
