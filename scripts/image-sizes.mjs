// 扫描 public/image 生成尺寸表，供构建后注入 <img width/height> 使用。
// 必须在 astro build 之前运行（package.json 的 build/predev 已串联）。
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const PUBLIC = "public";
const ROOT = "public/image";
const OUT = "src/generated/image-sizes.json";
const EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"]);

async function walk(dir) {
	const out = [];
	let entries;
	try {
		entries = await fs.readdir(dir, { withFileTypes: true });
	} catch {
		return out;
	}
	for (const entry of entries) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) out.push(...(await walk(full)));
		else if (entry.isFile() && EXT.has(path.extname(entry.name).toLowerCase()))
			out.push(full);
	}
	return out;
}

const files = await walk(ROOT);
const sizes = {};

await Promise.all(
	files.map(async (file) => {
		try {
			const meta = await sharp(file).metadata();
			if (!meta.width || !meta.height) return;
			const key = `/${path.relative(PUBLIC, file).split(path.sep).join("/")}`;
			sizes[key] = { width: meta.width, height: meta.height };
		} catch (error) {
			console.warn(`[image-size] 跳过 ${file}: ${error.message}`);
		}
	}),
);

await fs.mkdir(path.dirname(OUT), { recursive: true });
await fs.writeFile(OUT, `${JSON.stringify(sizes, null, "\t")}\n`, "utf8");

console.log(`[image-size] ${Object.keys(sizes).length} 张图片尺寸 → ${OUT}`);
