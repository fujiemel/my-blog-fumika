// 构建完成后给 <img> 补 width/height，避免图片加载时的布局抖动（CLS）。
//
// 为什么放在 build:done 而不是 rehype：
// 正文图片会经过 Astro 的图片管线（__ASTRO_IMAGE_），自定义 data-* 会被丢弃；
// 直接改最终 HTML 最稳，且能同时覆盖正文图、说说配图、头像等所有官方输出。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SIZES_FILE = "src/generated/image-sizes.json";

function walk(dir) {
	const out = [];
	let entries;
	try {
		entries = fs.readdirSync(dir, { withFileTypes: true });
	} catch {
		return out;
	}
	for (const entry of entries) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) out.push(...walk(full));
		else if (entry.isFile() && entry.name.endsWith(".html")) out.push(full);
	}
	return out;
}

/**
 * 把 CDN 地址还原成本地 /image/... 键，便于查尺寸表
 */
function toKey(src, cdnBase) {
	if (cdnBase && src.startsWith(`${cdnBase}/`)) {
		return `/image/${src.slice(cdnBase.length + 1)}`;
	}
	if (src.startsWith("/image/")) return src;
	return null;
}

export function imageDimensions({ cdnBase = "" } = {}) {
	return {
		name: "image-dimensions",
		hooks: {
			"astro:build:done": ({ dir, logger }) => {
				let sizes = {};
				try {
					sizes = JSON.parse(
						fs.readFileSync(path.join(process.cwd(), SIZES_FILE), "utf8"),
					);
				} catch {
					logger.warn(
						`未找到 ${SIZES_FILE}，跳过尺寸注入（先运行 scripts/image-sizes.mjs）`,
					);
					return;
				}

				const root = fileURLToPath(dir);
				let updated = 0;
				let missing = 0;

				for (const file of walk(root)) {
					const html = fs.readFileSync(file, "utf8");
					const next = html.replace(/<img\b[^>]*>/g, (tag) => {
						const src = /\bsrc="([^"]+)"/.exec(tag)?.[1];
						if (!src) return tag;
						const key = toKey(src, cdnBase);
						if (!key) return tag;

						const size = sizes[key];
						if (!size) {
							missing++;
							return tag;
						}
						if (/\bwidth=/.test(tag) && /\bheight=/.test(tag)) return tag;

						let withSize = tag;
						if (!/\bwidth=/.test(withSize)) {
							withSize = withSize.replace("<img", `<img width="${size.width}"`);
						}
						if (!/\bheight=/.test(withSize)) {
							withSize = withSize.replace(
								"<img",
								`<img height="${size.height}"`,
							);
						}
						updated++;
						return withSize;
					});

					if (next !== html) fs.writeFileSync(file, next, "utf8");
				}

				logger.info(
					`图片尺寸注入：${updated} 张已补全${missing > 0 ? `，${missing} 张缺少尺寸记录` : ""}`,
				);
			},
		},
	};
}
