// 将 public/image 下的内容图压缩、上传到 R2，并以 SHA-256 指纹做增量同步。
// 仅处理 posts/ 与 moments/ 两个前缀；config/、beian/ 等站点固定图片保留在本地。
// 用法：node --env-file=.env scripts/sync-images.mjs [--dry-run] [--force]
// 无凭据或网络不可达时只警告，不中断构建。
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
	ListObjectsV2Command,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import sharp from "sharp";

const DRY = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");

const IMAGE_ROOT = "public/image";
const MANIFEST_PATH = ".r2-manifest.json";
const MANIFEST_VERSION = 1;
// 只同步内容图
const SYNC_PREFIXES = ["posts", "moments"];
const SOURCE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
// 重新编码会丢失动画帧，gif 原样上传
const CONVERT_EXT = new Set([".jpg", ".jpeg", ".png"]);

const {
	R2_ACCOUNT_ID,
	R2_ACCESS_KEY_ID,
	R2_SECRET_ACCESS_KEY,
	R2_BUCKET,
	R2_PUBLIC_URL,
} = process.env;

const hasR2 = Boolean(
	R2_ACCOUNT_ID &&
		R2_ACCESS_KEY_ID &&
		R2_SECRET_ACCESS_KEY &&
		R2_BUCKET &&
		R2_PUBLIC_URL,
);

if (!hasR2) {
	console.warn("[r2] 未配置 R2 环境变量，跳过图片同步（图片将打包进 dist）");
	process.exit(0);
}

function toInt(raw, name, min, max = Number.MAX_SAFE_INTEGER) {
	if (!/^\d+$/.test(raw ?? "")) throw new Error(`${name} 必须是整数`);
	const n = Number(raw);
	if (!Number.isInteger(n) || n < min || n > max) {
		throw new Error(`${name} 必须在 ${min} 到 ${max} 之间`);
	}
	return n;
}

// 转换参数参与指纹计算：改动任一参数都会让旧指纹失效并重传
const PARAMS = Object.freeze({
	maxWidth: toInt(process.env.R2_MAX_WIDTH ?? "1600", "R2_MAX_WIDTH", 1),
	quality: toInt(process.env.R2_QUALITY ?? "82", "R2_QUALITY", 1, 100),
	format: "webp",
	transformVersion: 1,
});
const PARAMS_KEY = JSON.stringify(PARAMS);

const s3 = new S3Client({
	region: "auto",
	endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
	credentials: {
		accessKeyId: R2_ACCESS_KEY_ID,
		secretAccessKey: R2_SECRET_ACCESS_KEY,
	},
	// 国内 CI 可能连不上 Cloudflare，必须设超时，否则构建会挂死
	requestHandler: { connectionTimeout: 10_000, requestTimeout: 30_000 },
	maxAttempts: 2,
});

async function* walk(dir) {
	let entries;
	try {
		entries = await fs.readdir(dir, { withFileTypes: true });
	} catch {
		return;
	}
	for (const e of entries) {
		const p = path.join(dir, e.name);
		if (e.isDirectory()) yield* walk(p);
		else if (e.isFile()) yield p;
	}
}

async function loadManifest() {
	try {
		const raw = JSON.parse(await fs.readFile(MANIFEST_PATH, "utf8"));
		if (raw?.version === MANIFEST_VERSION && typeof raw.files === "object")
			return raw;
	} catch (error) {
		if (error?.code !== "ENOENT")
			console.warn(`[r2] manifest 损坏，将重新建立：${error.message}`);
	}
	return { version: MANIFEST_VERSION, files: {} };
}

async function saveManifest(manifest) {
	const tmp = `${MANIFEST_PATH}.tmp`;
	await fs.writeFile(tmp, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
	await fs.rename(tmp, MANIFEST_PATH);
}

async function listRemoteKeys() {
	const keys = new Set();
	let token;
	do {
		const res = await s3.send(
			new ListObjectsV2Command({
				Bucket: R2_BUCKET,
				ContinuationToken: token,
				MaxKeys: 1000,
			}),
		);
		for (const o of res.Contents ?? []) if (o.Key) keys.add(o.Key);
		token = res.IsTruncated ? res.NextContinuationToken : undefined;
	} while (token);
	return keys;
}

/** 判断文件是否属于要同步的内容图 */
function relativeKey(rel) {
	const top = rel.split("/")[0];
	return SYNC_PREFIXES.includes(top);
}

/** 输出 key：jpg/png 转 webp，webp/gif 保持原扩展名 */
function outputFor(rel, ext) {
	const convert = CONVERT_EXT.has(ext);
	return {
		key: convert ? rel.replace(/\.[^.]+$/, ".webp") : rel,
		convert,
		contentType: ext === ".gif" ? "image/gif" : "image/webp",
	};
}

async function sync() {
	const manifest = await loadManifest();
	const remoteKeys = DRY ? new Set() : await listRemoteKeys();

	// 收集待处理文件
	const candidates = new Map();
	for await (const file of walk(IMAGE_ROOT)) {
		const ext = path.extname(file).toLowerCase();
		if (!SOURCE_EXT.has(ext)) continue;

		const rel = path.relative(IMAGE_ROOT, file).replaceAll(path.sep, "/");
		if (!relativeKey(rel)) continue;

		const { key, convert, contentType } = outputFor(rel, ext);
		// 同 key 已存在（如同时有 .jpg 与 .webp）时，优先处理可转换的原图
		const existing = candidates.get(key);
		if (existing && !existing.convert) continue;

		const buf = await fs.readFile(file);
		const sourceHash = crypto.createHash("sha256").update(buf).digest("hex");
		const fingerprint = crypto
			.createHash("sha256")
			.update(sourceHash)
			.update("\0")
			.update(PARAMS_KEY)
			.digest("hex");

		candidates.set(key, {
			file,
			rel,
			key,
			convert,
			contentType,
			sourceHash,
			fingerprint,
			size: buf.length,
		});
	}

	// 与 manifest 指纹和远端对象比对，决定哪些需要上传
	const pending = [];
	let unchanged = 0;
	for (const item of candidates.values()) {
		const entry = manifest.files[item.rel];
		const fingerprintMatches =
			!FORCE && entry?.fingerprint === item.fingerprint;
		const existsRemote = DRY || remoteKeys.has(item.key);

		// 指纹一致且远端确实存在 → 跳过，避免重复上传
		if (fingerprintMatches && existsRemote) {
			manifest.files[item.rel] = {
				...entry,
				key: item.key,
				fingerprint: item.fingerprint,
			};
			unchanged++;
			continue;
		}
		pending.push(item);
	}

	let uploaded = 0;
	let beforeBytes = 0;
	let afterBytes = 0;
	const CONCURRENCY = 4;
	let cursor = 0;

	async function worker() {
		while (cursor < pending.length) {
			const item = pending[cursor++];
			let output;
			if (item.convert) {
				const image = sharp(item.file).rotate();
				const meta = await image.metadata();
				if (meta.width && meta.width > PARAMS.maxWidth) {
					image.resize({ width: PARAMS.maxWidth, withoutEnlargement: true });
				}
				output = await image.webp({ quality: PARAMS.quality }).toBuffer();
			} else {
				output = await fs.readFile(item.file);
			}

			beforeBytes += item.size;
			afterBytes += output.length;

			if (!DRY) {
				await s3.send(
					new PutObjectCommand({
						Bucket: R2_BUCKET,
						Key: item.key,
						Body: output,
						ContentType: item.contentType,
						CacheControl: "public, max-age=31536000, immutable",
					}),
				);

				// 压缩版写回本地，删除原图：本地只保留 webp
				if (item.convert) {
					const localWebp = item.file.replace(/\.[^.]+$/, ".webp");
					await fs.writeFile(localWebp, output);
					await fs.rm(item.file, { force: true });
					manifest.files[item.rel] = {
						key: item.key,
						sourceHash: item.sourceHash,
						fingerprint: item.fingerprint,
						size: output.length,
					};
					return;
				}

				manifest.files[item.rel] = {
					key: item.key,
					sourceHash: item.sourceHash,
					fingerprint: item.fingerprint,
					size: output.length,
				};
			}

			uploaded++;
			const saved = item.size - output.length;
			console.log(
				`${DRY ? "[dry]" : "[up]"} ${item.rel} ${(item.size / 1024).toFixed(0)}KB -> ${(output.length / 1024).toFixed(0)}KB (${saved >= 0 ? "-" : "+"}${Math.abs(saved / 1024).toFixed(0)}KB)`,
			);
		}
	}

	await Promise.all(
		Array.from({ length: Math.min(CONCURRENCY, pending.length) }, () =>
			worker(),
		),
	);

	if (!DRY) await saveManifest(manifest);

	const summary = DRY ? "待上传" : "上传";
	console.log(
		`\n[r2] ${summary} ${uploaded} 个，指纹一致跳过 ${unchanged} 个，` +
			`${(beforeBytes / 1024 / 1024).toFixed(2)}MB -> ${(afterBytes / 1024 / 1024).toFixed(2)}MB`,
	);
}

try {
	await sync();
} catch (error) {
	const code = error?.code ?? error?.name ?? "";
	const networkFailure =
		[
			"ETIMEDOUT",
			"ECONNREFUSED",
			"ENOTFOUND",
			"EAI_AGAIN",
			"TimeoutError",
			"AbortError",
		].includes(code) ||
		/timeout|ECONNREFUSED|ENOTFOUND|network/i.test(
			String(error?.message ?? ""),
		);

	if (networkFailure) {
		// 网络不可达不应阻断部署：图片仍在本地，下次联网时再同步
		console.warn(
			`[r2] 无法连接 R2（${code || error?.message}），跳过同步，继续构建`,
		);
		process.exit(0);
	}
	throw error;
}
