import { visit } from "unist-util-visit";

/**
 * 把正文里的本地内容图映射到 CDN。
 * 内容中始终写 /image/posts/... 或 /image/moments/...，构建时改写为 R2 地址，
 * 本地开发与源文件保持本地路径，便于预览和迁移。
 * config/、beian/ 等站点固定图片不参与映射。
 */
const SYNC_PREFIXES = ["/image/posts/", "/image/moments/"];

/**
 * @param {string} [cdnBase] CDN 根地址，由 astro.config 通过 loadEnv 注入
 */
export function rehypeCdnImage(cdnBase) {
	const base = (cdnBase ?? "").replace(/\/+$/, "");

	return (tree) => {
		if (!base) return;

		visit(tree, "element", (node) => {
			if (node.tagName !== "img") return;

			const src = node.properties?.src;
			if (typeof src !== "string") return;
			if (!SYNC_PREFIXES.some((p) => src.startsWith(p))) return;

			// /image/posts/a/001.webp -> https://cdn/posts/a/001.webp
			node.properties.src = `${base}/${src.slice("/image/".length)}`;
		});
	};
}
