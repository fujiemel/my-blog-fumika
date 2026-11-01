// 将正文里硬编码的 R2 绝对地址拉回本地，并改写为 /image/... 相对路径。
// 与 sync-images.mjs 方向相反：那个是本地 → R2，这个是 R2 → 本地。
//
// 用法：
//   node --env-file=.env scripts/pull-images.mjs            # 下载缺失图片并改写正文
//   node --env-file=.env scripts/pull-images.mjs --dry-run  # 只打印将要执行的操作
//   node --env-file=.env scripts/pull-images.mjs --force    # 覆盖已存在的本地文件
import fs from "node:fs/promises";
import path from "node:path";

const DRY = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");

const CONTENT_ROOT = "src/content";
const IMAGE_ROOT = "public/image";

const cdnBase = (process.env.R2_PUBLIC_URL ?? "").replace(/\/+$/, "");

if (!cdnBase) {
	console.error("[pull] 未配置 R2_PUBLIC_URL，无法确定远程图片地址");
	process.exit(1);
}

/** 把 CDN 地址转成本地路径；不是本站 CDN 的返回 null */
function toLocalPath(url) {
	if (!url.startsWith(`${cdnBase}/`)) return null;
	const rel = url
		.slice(cdnBase.length + 1)
		.split("?")[0]
		.split("#")[0];
	// 只处理内容图，config/beian 等不该出现在正文
	if (!rel.startsWith("posts/") && !rel.startsWith("moments/")) return null;
	return { rel, publicPath: `/${IMAGE_ROOT.replace(/^public\//, "")}/${rel}` };
}

async function walk(dir) {
	let entries;
	try {
		entries = await fs.readdir(dir, { withFileTypes: true });
	} catch {
		return [];
	}
	const files = [];
	for (const entry of entries) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) files.push(...(await walk(full)));
		else if (entry.isFile() && /\.(md|mdx)$/.test(entry.name)) files.push(full);
	}
	return files;
}

async function exists(file) {
	try {
		await fs.access(file);
		return true;
	} catch {
		return false;
	}
}

async function download(publicPath) {
	const url = `${cdnBase}${publicPath.slice("/image".length)}`;
	const res = await fetch(url, { redirect: "follow" });
	if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
	const buf = Buffer.from(await res.arrayBuffer());
	const target = path.join("public", publicPath.replace(/^\//, ""));
	await fs.mkdir(path.dirname(target), { recursive: true });
	await fs.writeFile(target, buf);
	return { target, size: buf.length };
}

const files = await walk(CONTENT_ROOT);
const urlPattern = /https?:\/\/[^\s)"'<>]+/g;

const targets = new Map(); // url -> { rel, publicPath, files: Set }
for (const file of files) {
	const text = await fs.readFile(file, "utf8");
	for (const match of text.matchAll(urlPattern)) {
		const local = toLocalPath(match[0]);
		if (!local) continue;
		const entry = targets.get(match[0]) ?? { ...local, files: new Set() };
		entry.files.add(file);
		targets.set(match[0], entry);
	}
}

if (targets.size === 0) {
	console.log("[pull] 正文里没有发现 CDN 绝对地址，无需处理");
	process.exit(0);
}

let downloaded = 0;
let skipped = 0;
let rewritten = 0;

for (const [url, entry] of targets) {
	const localFile = path.join("public", entry.publicPath.replace(/^\//, ""));

	if (DRY) {
		console.log(
			`[dry] ${url} -> ${entry.publicPath}${(await exists(localFile)) ? "（已存在）" : ""}`,
		);
		continue;
	}

	if (!(await exists(localFile)) || FORCE) {
		const { size } = await download(entry.publicPath);
		downloaded++;
		console.log(`[get] ${entry.publicPath} (${(size / 1024).toFixed(0)}KB)`);
	} else {
		skipped++;
	}
}

if (DRY) process.exit(0);

// 下载完整后再改写，避免中途失败留下半套引用
for (const [url, entry] of targets) {
	for (const file of entry.files) {
		const text = await fs.readFile(file, "utf8");
		if (!text.includes(url)) continue;
		await fs.writeFile(file, text.split(url).join(entry.publicPath), "utf8");
		rewritten++;
	}
}

console.log(
	`\n[pull] 下载 ${downloaded} 张，已存在跳过 ${skipped} 张，改写引用 ${rewritten} 处`,
);
