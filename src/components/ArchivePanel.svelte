<script lang="ts">
import { onMount } from "svelte";

import I18nKey from "../i18n/i18nKey";
import { i18n } from "../i18n/translation";
import { getMomentUrlBySlug, getPostUrlBySlug } from "../utils/url-utils";

export let sortedPosts: Post[] = [];
export let sortedMoments: Moment[] = [];
export let lang: string | undefined = undefined;

interface Post {
	slug: string;
	data: {
		title: string;
		tags: string[];
		category?: string;
		published: Date;
	};
}

interface Moment {
	id: string;
	data: {
		published: Date;
		images?: string[];
		location?: string;
	};
	/** 说说正文摘要，作为时间轴上的标题 */
	excerpt?: string;
}

/** 时间轴节点：文章或说说 */
type Entry =
	| { kind: "post"; date: Date; post: Post }
	| { kind: "moment"; date: Date; moment: Moment };

interface Group {
	year: number;
	entries: Entry[];
	postCount: number;
	momentCount: number;
}

interface Filter {
	tags: string[];
	categories: string[];
	uncategorized: boolean;
}

function formatDate(date: Date) {
	const month = (date.getMonth() + 1).toString().padStart(2, "0");
	const day = date.getDate().toString().padStart(2, "0");
	return `${month}-${day}`;
}

function filterPosts(posts: Post[], filter: Filter): Post[] {
	let result = posts;

	if (filter.tags.length > 0) {
		result = result.filter(
			(post) =>
				Array.isArray(post.data.tags) &&
				post.data.tags.some((tag) => filter.tags.includes(tag)),
		);
	}

	if (filter.categories.length > 0) {
		result = result.filter(
			(post) =>
				post.data.category && filter.categories.includes(post.data.category),
		);
	}

	if (filter.uncategorized) {
		result = result.filter((post) => !post.data.category);
	}

	return result;
}

function buildGroups(filter: Filter): Group[] {
	// 说说没有标签和分类，一旦按标签/分类筛选就只显示文章，
	// 否则说说会混在结果里，看起来像筛选没生效
	const hasFilter =
		filter.tags.length > 0 ||
		filter.categories.length > 0 ||
		filter.uncategorized;

	const entries: Entry[] = [
		...filterPosts(sortedPosts, filter).map<Entry>((post) => ({
			kind: "post",
			date: post.data.published,
			post,
		})),
		...(hasFilter
			? []
			: sortedMoments.map<Entry>((moment) => ({
					kind: "moment",
					date: moment.data.published,
					moment,
				}))),
	];

	// 按时间倒序混排，同一天内文章排在说说之前
	entries.sort((a, b) => {
		const diff = b.date.getTime() - a.date.getTime();
		if (diff !== 0) return diff;
		if (a.kind === b.kind) return 0;
		return a.kind === "post" ? -1 : 1;
	});

	const grouped = entries.reduce(
		(acc, entry) => {
			const year = entry.date.getFullYear();
			if (!acc[year]) {
				acc[year] = [];
			}
			acc[year].push(entry);
			return acc;
		},
		{} as Record<number, Entry[]>,
	);

	return Object.keys(grouped)
		.map((yearStr) => {
			const year = Number.parseInt(yearStr, 10);
			const entries = grouped[year];

			return {
				year,
				entries,
				postCount: entries.filter((e) => e.kind === "post").length,
				momentCount: entries.filter((e) => e.kind === "moment").length,
			};
		})
		.sort((a, b) => b.year - a.year);
}

const emptyFilter: Filter = { tags: [], categories: [], uncategorized: false };

// 归档页是静态页面，首屏先用无筛选结果渲染，有 query 时再在客户端过滤
let groups: Group[] = buildGroups(emptyFilter);

onMount(() => {
	const params = new URLSearchParams(window.location.search);
	const filter: Filter = {
		tags: params.getAll("tag"),
		categories: params.getAll("category"),
		uncategorized: params.has("uncategorized"),
	};

	if (
		filter.tags.length > 0 ||
		filter.categories.length > 0 ||
		filter.uncategorized
	) {
		groups = buildGroups(filter);
	}
});
</script>

<div class="card-base px-8 py-6">
    {#each groups as group}
        <div>
            <div class="flex flex-row w-full items-center h-[3.75rem]">
                <div class="w-[15%] md:w-[10%] transition text-2xl font-bold text-right text-75">
                    {group.year}
                </div>
                <div class="w-[15%] md:w-[10%]">
                    <div
                            class="h-3 w-3 bg-none rounded-full outline-(--primary) mx-auto
                  -outline-offset-2 z-50 outline-3"
                    ></div>
                </div>
                <div class="w-[70%] md:w-[80%] transition text-left text-50 flex flex-wrap items-center gap-x-1.5">
                    {#if group.postCount > 0}
                        <span>{group.postCount} {i18n(group.postCount === 1 ? I18nKey.postCount : I18nKey.postsCount, lang)}</span>
                    {/if}
                    {#if group.postCount > 0 && group.momentCount > 0}
                        <span class="text-25">·</span>
                    {/if}
                    {#if group.momentCount > 0}
                        <span>{group.momentCount} {i18n(I18nKey.momentsCount, lang)}</span>
                    {/if}
                </div>
            </div>

            {#each group.entries as entry (entry.kind === "post" ? `post-${entry.post.slug}` : `moment-${entry.moment.id}`)}
                {#if entry.kind === "post"}
                    <a
                            href={getPostUrlBySlug(entry.post.slug, lang)}
                            aria-label={entry.post.data.title}
                            class="group btn-plain block! h-10 w-full rounded-lg hover:text-[initial]"
                    >
                        <div class="flex flex-row justify-start items-center h-full">
                            <div class="w-[15%] md:w-[10%] transition text-sm text-right text-50">
                                {formatDate(entry.date)}
                            </div>

                            <div class="w-[15%] md:w-[10%] relative dash-line h-full flex items-center">
                                <div
                                        class="transition-all mx-auto w-1 h-1 rounded group-hover:h-5
                       bg-[oklch(0.5_0.05_var(--hue))] group-hover:bg-(--primary)
                       outline-4 z-50
                       outline-(--card-bg)
                       group-hover:outline-(--btn-plain-bg-hover)
                       group-active:outline-(--btn-plain-bg-active)"
                                ></div>
                            </div>

                            <div
                                    class="w-[70%] md:max-w-[65%] md:w-[65%] text-left font-bold
                     group-hover:translate-x-1 transition-all group-hover:text-(--primary)
                     text-75 pr-8 whitespace-nowrap text-ellipsis overflow-hidden"
                            >
                                {entry.post.data.title}
                            </div>

                            <!-- 右侧标注内容类型，与说说保持一致 -->
                            <div class="hidden md:flex md:w-[15%] items-center gap-1 text-sm text-30 whitespace-nowrap">
                                {i18n(I18nKey.postLabel, lang)}
                            </div>
                        </div>
                    </a>
                {:else}
                    <a
                            href={getMomentUrlBySlug(entry.moment.id, lang)}
                            aria-label={`${i18n(I18nKey.moments, lang)} ${formatDate(entry.date)}`}
                            class="group btn-plain block! h-10 w-full rounded-lg hover:text-[initial]"
                    >
                        <div class="flex flex-row justify-start items-center h-full">
                            <div class="w-[15%] md:w-[10%] transition text-sm text-right text-50">
                                {formatDate(entry.date)}
                            </div>

                            <!-- 说说用空心小圆点，与文章节点区分 -->
                            <div class="w-[15%] md:w-[10%] relative dash-line h-full flex items-center">
                                <div
                                        class="transition-all mx-auto w-2 h-2 rounded-full
                       border-2 border-[oklch(0.5_0.05_var(--hue))]
                       group-hover:border-(--primary) group-hover:bg-(--primary)
                       outline-4 z-50
                       outline-(--card-bg)
                       group-hover:outline-(--btn-plain-bg-hover)
                       group-active:outline-(--btn-plain-bg-active)"
                                ></div>
                            </div>

                            <div
                                    class="w-[70%] md:max-w-[65%] md:w-[65%] text-left
                     group-hover:translate-x-1 transition-all group-hover:text-(--primary)
                     text-50 pr-8 whitespace-nowrap text-ellipsis overflow-hidden"
                            >
                                {entry.moment.excerpt || i18n(I18nKey.moments, lang)}
                            </div>

                            <!-- 右侧标注内容类型 -->
                            <div class="hidden md:flex md:w-[15%] items-center gap-1 text-sm text-30 whitespace-nowrap">
                                {i18n(I18nKey.moments, lang)}
                            </div>
                        </div>
                    </a>
                {/if}
            {/each}
        </div>
    {/each}
</div>
