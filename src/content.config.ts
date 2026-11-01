import { defineCollection } from "astro:content";
import { file, glob } from "astro/loaders";
import { z } from "astro/zod";

/**
 * 把 YAML 空值（null）转为 undefined 并套用默认值。
 * 默认值必须在预处理内部生效：外层的 .default() 只拦截 undefined，
 * 而 preprocess 会先收到 null 并转成 undefined，外层默认值并不会被触发。
 */
const emptyToDefault = <T extends z.ZodTypeAny>(
	schema: T,
	fallback: z.output<T>,
) =>
	z.preprocess((v) => (v === null || v === undefined ? fallback : v), schema);

const postsCollection = defineCollection({
	loader: glob({
		base: "./src/content/posts",
		pattern: "**/*.{md,mdx}",
	}),
	schema: () =>
		z.object({
			title: z.string(),
			published: z.date(),
			updated: z.date().optional(),
			// YAML 中留空的字段会解析成 null，而 default() 只对 undefined 生效，
			// 故用 emptyToDefault 统一兜底，既兼容空值又不污染下游类型
			draft: emptyToDefault(z.boolean(), false),
			pinned: emptyToDefault(z.boolean(), false),
			description: emptyToDefault(z.string(), ""),
			image: emptyToDefault(z.string(), ""),
			tags: emptyToDefault(z.array(z.string()), []),
			category: emptyToDefault(z.string(), ""),
			lang: emptyToDefault(z.string(), ""),
			ogImage: emptyToDefault(z.string(), ""),

			/* For internal use */
			prevTitle: z.string().default(""),
			prevSlug: z.string().default(""),
			nextTitle: z.string().default(""),
			nextSlug: z.string().default(""),
		}),
});

const momentsCollection = defineCollection({
	loader: glob({
		base: "./src/content/moments",
		pattern: "**/*.{md,mdx}",
	}),
	schema: z.object({
		published: z.date(),
		images: z.array(z.string()).optional().default([]),
		location: z.string().optional(),
	}),
});

const specCollection = defineCollection({
	loader: glob({
		base: "./src/content/spec",
		pattern: "**/*.{md,mdx}",
	}),
	schema: z.object({}),
});

const friendsCollection = defineCollection({
	loader: file("./src/content/data/friends.json"),
	schema: z.object({
		id: z.string(),
		siteTitle: z.string(),
		siteDesc: z.string(),
		siteUrl: z.url(),
		siteIcon: z.url(),
	}),
});

export const collections = {
	posts: postsCollection,
	moments: momentsCollection,
	spec: specCollection,
	friends: friendsCollection,
};
