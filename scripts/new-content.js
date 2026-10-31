/* 新建文章或说说，自动创建内容文件与对应图片目录。 */

import fs from "node:fs";
import path from "node:path";

const POSTS_DIR = "./src/content/posts";
const MOMENTS_DIR = "./src/content/moments";
const IMAGE_ROOT = "./public/image";

const args = process.argv.slice(2);

function usage() {
	console.error(`用法：
  pnpm new-post <标题>            新建文章    → src/content/posts/<slug>/index.md
  pnpm new-moment [内容]          新建说说    → src/content/moments/<日期>-<序号>/index.md

示例：
  pnpm new-post 我的新文章
  pnpm new-moment "今天天气不错"
  pnpm new-moment                 不带内容，生成空说说`);
	process.exit(1);
}

/** 本地时间格式化为 +08:00 偏移的 ISO 串，与既有内容保持一致 */
function localIso(date = new Date()) {
	const pad = (n) => String(n).padStart(2, "0");
	const offset = -date.getTimezoneOffset();
	const sign = offset >= 0 ? "+" : "-";
	const abs = Math.abs(offset);

	return (
		`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
		`T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
		`.000${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
	);
}

function datePrefix(date = new Date()) {
	const pad = (n) => String(n).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** 中文标题转 URL slug：保留中文，其余转连字符 */
function toSlug(title) {
	return title
		.trim()
		.toLowerCase()
		.replace(/[\\/:*?"<>|]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
}

function ensureDir(dir) {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function createPost(title) {
	if (!title) usage();

	const slug = toSlug(title);
	if (!slug) {
		console.error("标题无法转换为有效目录名");
		process.exit(1);
	}

	const dir = path.join(POSTS_DIR, slug);
	const file = path.join(dir, "index.md");

	if (fs.existsSync(file)) {
		console.error(`已存在：${file}`);
		process.exit(1);
	}

	ensureDir(dir);

	const content = `---
title: ${JSON.stringify(title)}
published: ${datePrefix()}
description: ""
tags: []
category: ""
draft: true
---
`;

	fs.writeFileSync(file, content, "utf8");

	// 图片目录预先建好，写作时直接拖图进去
	const imageDir = path.join(IMAGE_ROOT, "posts", slug);
	ensureDir(imageDir);

	console.log(`文章已创建：${file}`);
	console.log(`图片目录：  ${imageDir}`);
	console.log(`\n正文中引用图片：![](/image/posts/${slug}/001.webp)`);
}

/** 当天已有几条说说，用于生成 -1、-2 序号 */
function nextMomentIndex(prefix) {
	if (!fs.existsSync(MOMENTS_DIR)) return 1;

	const used = fs
		.readdirSync(MOMENTS_DIR)
		.map((name) => new RegExp(`^${prefix}-(\\d+)$`).exec(name))
		.filter(Boolean)
		.map((m) => Number.parseInt(m[1], 10));

	return used.length ? Math.max(...used) + 1 : 1;
}

function createMoment(body = "") {
	const now = new Date();
	const prefix = datePrefix(now);
	const index = nextMomentIndex(prefix);
	const id = `${prefix}-${index}`;

	const dir = path.join(MOMENTS_DIR, id);
	const file = path.join(dir, "index.md");

	if (fs.existsSync(file)) {
		console.error(`已存在：${file}`);
		process.exit(1);
	}

	ensureDir(dir);

	// 说说正文常用换行表达断句，保留用户输入原样
	const content = `---
published: ${localIso(now)}
---

${body}
`;

	fs.writeFileSync(file, content, "utf8");

	const imageDir = path.join(IMAGE_ROOT, "moments", id);
	ensureDir(imageDir);

	console.log(`说说已创建：${file}`);
	console.log(`图片目录：  ${imageDir}`);
	console.log(
		`\n配图请在 frontmatter 加 images 字段，或正文中直接引用：![](/image/moments/${id}/001.webp)`,
	);
}

const [command, ...rest] = args;

if (command === "post") {
	createPost(rest.join(" "));
} else if (command === "moment") {
	createMoment(rest.join(" "));
} else {
	usage();
}
