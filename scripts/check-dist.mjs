// 构建产物检查：内部链接、本地图片引用、重复标题/描述、图片 alt。
// 用法：pnpm check:dist
// 出错（死链/缺图/正文硬编码 CDN）返回非零；内容层面的问题只提示，不阻断。
import fs from "node:fs";
import path from "node:path";

const DIST = "dist";
const CONTENT = "src/content";
const PUBLIC = "public";
const BASE = "/";

function walk(dir, filter) {
	const out = [];
	let entries;
	try {
		entries = fs.readdirSync(dir, { withFileTypes: true });
	} catch {
		return out;
	}
	for (const entry of entries) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) out.push(...walk(full, filter));
		else if (filter(entry.name)) out.push(full);
	}
	return out;
}

function exists(file) {
	try {
		fs.accessSync(file);
		return true;
	} catch {
		return false;
	}
}

/** 把站内路径解析到 dist 下的真实文件 */
function resolveDistFile(urlPath) {
	let p = urlPath;
	if (BASE !== "/" && p.startsWith(BASE)) p = p.slice(BASE.length - 1);
	const target = path.join(DIST, p.replace(/^\//, ""));
	const candidates = p.endsWith("/")
		? [path.join(target, "index.html")]
		: [target, `${target}.html`, path.join(target, "index.html")];
	return candidates.find(exists);
}

const SKIP_PREFIX = [
	"http://",
	"https://",
	"//",
	"mailto:",
	"tel:",
	"javascript:",
	"data:",
	"#",
	"?",
];

const htmlFiles = walk(DIST, (name) => name.endsWith(".html"));
const missingLinks = new Map();
const missingAttrs = [];
const titles = new Map();
const descriptions = new Map();

for (const file of htmlFiles) {
	const html = fs.readFileSync(file, "utf8");

	const title = html.match(/<title>(.*?)<\/title>/s)?.[1];
	if (title) titles.set(title, [...(titles.get(title) ?? []), file]);

	const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1];
	if (desc) descriptions.set(desc, [...(descriptions.get(desc) ?? []), file]);

	for (const tag of html.match(/<(?:img|a|link|script)\b[^>]*>/gi) ?? []) {
		if (/^<img/i.test(tag) && !/\balt=/.test(tag)) {
			missingAttrs.push(`${file}: ${tag.slice(0, 80)}`);
		}
		for (const [, attr, value] of tag.matchAll(/\b(?:href|src)="([^"]*)"/gi)) {
			void attr;
			if (!value || SKIP_PREFIX.some((p) => value.startsWith(p))) continue;
			const pathname = decodeURIComponent(value.split(/[?#]/)[0]);
			if (!pathname) continue;
			if (!resolveDistFile(pathname)) {
				const item = missingLinks.get(pathname) ?? {
					count: 0,
					from: new Set(),
				};
				item.count++;
				item.from.add(file);
				missingLinks.set(pathname, item);
			}
		}
	}
}

// 正文里引用的本地图片必须真的存在
const missingImages = [];
const markdownFiles = walk(CONTENT, (name) => /\.(md|mdx)$/.test(name));
for (const file of markdownFiles) {
	const text = fs.readFileSync(file, "utf8");
	for (const [, rel] of text.matchAll(/!\[[^\]]*\]\((\/image\/[^)\s]+)\)/g)) {
		const target = path.join(PUBLIC, rel.replace(/^\//, ""));
		if (!exists(target)) missingImages.push(`${file}: ${rel}`);
	}
}

// 正文不应硬编码 CDN 绝对地址（会绕过本地 → CDN 映射）
// CI 没有 .env，尝试从文件里读一次，读不到就跳过这项检查
function readCdnBase() {
	const fromEnv = (process.env.R2_PUBLIC_URL ?? "").trim();
	if (fromEnv) return fromEnv.replace(/\/+$/, "");
	try {
		const text = fs.readFileSync(".env", "utf8");
		const value = /^R2_PUBLIC_URL=(.+)$/m.exec(text)?.[1]?.trim() ?? "";
		return value.replace(/\/+$/, "");
	} catch {
		return "";
	}
}

const cdnBase = readCdnBase();
const hardcoded = [];
if (cdnBase) {
	for (const file of markdownFiles) {
		const text = fs.readFileSync(file, "utf8");
		const count = text.split(`${cdnBase}/`).length - 1;
		if (count > 0) hardcoded.push(`${file}: ${count} 处`);
	}
}

const duplicates = (map) =>
	[...map.entries()].filter(([, files]) => files.length > 1);

let failed = false;

if (missingLinks.size > 0) {
	failed = true;
	console.error(`\n✗ 站内链接缺失 ${missingLinks.size} 个：`);
	for (const [url, { count, from }] of missingLinks) {
		console.error(`  ${url}  (${count} 处，来自 ${[...from][0]})`);
	}
}

if (missingImages.length > 0) {
	failed = true;
	console.error(`\n✗ 本地图片缺失 ${missingImages.length} 处：`);
	for (const item of missingImages) console.error(`  ${item}`);
}

if (hardcoded.length > 0) {
	failed = true;
	console.error("\n✗ 正文硬编码 CDN 地址（请改成 /image/... 相对路径）：");
	for (const item of hardcoded) console.error(`  ${item}`);
}

const dupTitles = duplicates(titles);
const dupDescs = duplicates(descriptions);

if (dupTitles.length > 0) {
	console.warn(`\n! 重复标题 ${dupTitles.length} 组：`);
	for (const [title, files] of dupTitles) {
		console.warn(
			`  ${title} → ${files.map((f) => f.replace("dist", "")).join(", ")}`,
		);
	}
}

if (dupDescs.length > 0) {
	console.warn(`\n! 重复描述 ${dupDescs.length} 组：`);
	for (const [desc, files] of dupDescs) {
		console.warn(`  ${desc.slice(0, 40)}… → ${files.length} 页`);
	}
}

if (missingAttrs.length > 0) {
	console.warn(`\n! 缺少 alt 属性的图片 ${missingAttrs.length} 张：`);
	for (const item of missingAttrs.slice(0, 10)) console.warn(`  ${item}`);
}

if (!failed) {
	console.log(
		`\n✓ 检查通过：${htmlFiles.length} 个页面，站内链接与本地图片均可用` +
			`${dupTitles.length || dupDescs.length || missingAttrs.length ? "（存在提示项）" : ""}`,
	);
}

process.exit(failed ? 1 : 0);
