/**
 * 把本地内容图路径映射到 CDN。
 * 与 scripts/sync-images.mjs 的上传范围保持一致：只映射 posts/ 与 moments/，
 * config/、beian/ 等站点固定图片仍读本地。
 * 未配置 R2_PUBLIC_URL 时原样返回，本地开发不受影响。
 */
const SYNC_PREFIXES = ["/image/posts/", "/image/moments/"];

export function cdnImage(src: string): string {
	// 调用时读取，确保构建期 .env 已载入
	const cdnBase = (process.env.R2_PUBLIC_URL ?? "").replace(/\/+$/, "");
	if (!cdnBase) return src;
	if (!SYNC_PREFIXES.some((p) => src.startsWith(p))) return src;

	return `${cdnBase}/${src.slice("/image/".length)}`;
}
