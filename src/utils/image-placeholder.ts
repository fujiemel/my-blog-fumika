/**
 * 图片占位与失败兜底。
 *
 * - 加载中：由 CSS 根据 `data-img-state="pending"` 显示骨架底色
 * - 加载成功：切到 `loaded`，淡入并停止骨架动画
 * - 加载失败：切到 `error`，替换成本地内联占位图，避免浏览器默认的破图图标
 *
 * 站内图片多来自 R2，网络或 DNS 异常时经常整块空白，故统一兜底。
 */

/** 内联 SVG 占位图，不依赖网络与 base 路径 */
export const IMAGE_PLACEHOLDER =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='200' viewBox='0 0 320 200'%3E%3Crect width='320' height='200' fill='%23e5e7eb'/%3E%3Cg fill='none' stroke='%239ca3af' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='96' y='70' width='128' height='80' rx='10'/%3E%3Ccircle cx='132' cy='98' r='9'/%3E%3Cpath d='M100 140l34-30 22 18 18-14 30 26'/%3E%3C/g%3E%3C/svg%3E";

type ImgState = "pending" | "loaded" | "error";

function setState(img: HTMLImageElement, state: ImgState): void {
	img.dataset.imgState = state;
}

function markLoaded(img: HTMLImageElement): void {
	if (img.dataset.imgState === "error") return;
	setState(img, "loaded");
}

function markFailed(img: HTMLImageElement): void {
	if (img.dataset.imgState === "error") return;
	setState(img, "error");
	img.classList.add("img-fallback");
	img.removeAttribute("srcset");
	img.removeAttribute("sizes");
	// 占位图本身也可能加载失败（例如浏览器禁用 data URI），此时不再递归
	img.addEventListener(
		"error",
		() => img.classList.add("img-fallback-broken"),
		{
			once: true,
		},
	);
	img.src = IMAGE_PLACEHOLDER;
}

function watchImage(img: HTMLImageElement): void {
	if (img.dataset.imgState === "loaded" || img.dataset.imgState === "error") {
		return;
	}
	if (!img.getAttribute("src")) return;

	// Markdown 图片会经过 Astro 的图片管线，data-* 属性会被丢弃，
	// 这里统一补上解码提示，效果与在 rehype 阶段添加一致
	if (!img.decoding) img.decoding = "async";

	// 标记为待加载，交给 CSS 绘制骨架
	if (!img.dataset.imgState) setState(img, "pending");

	if (img.complete) {
		if (img.naturalWidth > 0) markLoaded(img);
		else markFailed(img);
		return;
	}

	img.addEventListener("load", () => markLoaded(img), { once: true });
	img.addEventListener("error", () => markFailed(img), { once: true });
}

/** 扫描并接管图片；Swup 切页后需要对新的 DOM 重新调用 */
export function initImagePlaceholders(root: ParentNode = document): void {
	for (const img of root.querySelectorAll<HTMLImageElement>("img")) {
		watchImage(img);
	}
}
