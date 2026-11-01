<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import Icon from "@iconify/svelte";
import { url } from "@utils/url-utils.ts";
import { onMount } from "svelte";
import type { SearchResult } from "@/global";

let keywordDesktop = "";
let keywordMobile = "";
let result: SearchResult[] = [];
let isSearching = false;
let pagefindLoaded = false;
let initialized = false;
export let lang: string | undefined;

let desktopInput: HTMLInputElement;
let mobileInput: HTMLInputElement;
let activeIndex = -1;

const isEditableTarget = (target: EventTarget | null): boolean => {
	if (!(target instanceof HTMLElement)) return false;
	return (
		target.tagName === "INPUT" ||
		target.tagName === "TEXTAREA" ||
		target.isContentEditable
	);
};

const panelItems = (): HTMLAnchorElement[] =>
	Array.from(
		document.querySelectorAll<HTMLAnchorElement>("#search-panel a[href]"),
	);

const openSearch = (): void => {
	document
		.getElementById("search-panel")
		?.classList.remove("float-panel-closed");
	const target = window.innerWidth >= 1024 ? desktopInput : mobileInput;
	target?.focus();
};

const closeSearch = (): void => {
	document.getElementById("search-panel")?.classList.add("float-panel-closed");
	activeIndex = -1;
};

const moveActive = (delta: number): void => {
	const items = panelItems();
	if (items.length === 0) return;

	activeIndex = (activeIndex + delta + items.length) % items.length;
	items.forEach((item, index) => {
		item.classList.toggle("search-active", index === activeIndex);
	});
	items[activeIndex].scrollIntoView({ block: "nearest" });
};

const handleGlobalKeydown = (event: KeyboardEvent): void => {
	// Ctrl/Cmd + K 唤起搜索
	if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
		event.preventDefault();
		openSearch();
		return;
	}

	if (event.key === "Escape") {
		closeSearch();
		return;
	}

	const focused = document.activeElement;
	const inSearch =
		focused instanceof HTMLElement &&
		Boolean(focused.closest("#search-panel, #search-bar, #search-bar-inside"));
	if (!inSearch) return;

	const items = panelItems();
	if (items.length === 0) return;

	if (event.key === "ArrowDown") {
		event.preventDefault();
		moveActive(1);
	} else if (event.key === "ArrowUp") {
		event.preventDefault();
		moveActive(-1);
	} else if (event.key === "Enter" && activeIndex >= 0) {
		event.preventDefault();
		items[activeIndex].click();
	}
};

$: if (result) {
	activeIndex = -1;
}

const fakeResult: SearchResult[] = [
	{
		url: url("/"),
		meta: {
			title: "This Is a Fake Search Result",
		},
		excerpt:
			"Because the search cannot work in the <mark>dev</mark> environment.",
	},
	{
		url: url("/"),
		meta: {
			title: "If You Want to Test the Search",
		},
		excerpt: "Try running <mark>pnpm build && pnpm preview</mark> instead.",
	},
];

const togglePanel = () => {
	const panel = document.getElementById("search-panel");
	panel?.classList.toggle("float-panel-closed");
};

const setPanelVisibility = (show: boolean, isDesktop: boolean): void => {
	const panel = document.getElementById("search-panel");
	if (!panel || !isDesktop) return;

	if (show) {
		panel.classList.remove("float-panel-closed");
	} else {
		panel.classList.add("float-panel-closed");
	}
};

const search = async (keyword: string, isDesktop: boolean): Promise<void> => {
	if (!keyword) {
		setPanelVisibility(false, isDesktop);
		result = [];
		return;
	}

	if (!initialized) {
		return;
	}

	isSearching = true;

	try {
		let searchResults: SearchResult[] = [];

		if (import.meta.env.PROD && pagefindLoaded && window.pagefind) {
			const response = await window.pagefind.search(keyword);
			searchResults = await Promise.all(
				response.results.map((item) => item.data()),
			);
		} else if (import.meta.env.DEV) {
			searchResults = fakeResult;
		} else {
			searchResults = [];
			console.error("Pagefind is not available in production environment.");
		}

		result = searchResults;
		setPanelVisibility(result.length > 0, isDesktop);
	} catch (error) {
		console.error("Search error:", error);
		result = [];
		setPanelVisibility(false, isDesktop);
	} finally {
		isSearching = false;
	}
};

onMount(() => {
	window.addEventListener("keydown", handleGlobalKeydown);

	const initializeSearch = () => {
		initialized = true;
		pagefindLoaded =
			typeof window !== "undefined" &&
			!!window.pagefind &&
			typeof window.pagefind.search === "function";
		console.log("Pagefind status on init:", pagefindLoaded);
		if (keywordDesktop) search(keywordDesktop, true);
		if (keywordMobile) search(keywordMobile, false);
	};

	if (import.meta.env.DEV) {
		console.log(
			"Pagefind is not available in development mode. Using mock data.",
		);
		initializeSearch();
	} else {
		document.addEventListener("pagefindready", () => {
			console.log("Pagefind ready event received.");
			initializeSearch();
		});
		document.addEventListener("pagefindloaderror", () => {
			console.warn(
				"Pagefind load error event received. Search functionality will be limited.",
			);
			initializeSearch(); // Initialize with pagefindLoaded as false
		});

		// Fallback in case events are not caught or pagefind is already loaded by the time this script runs
		setTimeout(() => {
			if (!initialized) {
				console.log("Fallback: Initializing search after timeout.");
				initializeSearch();
			}
		}, 2000); // Adjust timeout as needed
	}

	return () => {
		window.removeEventListener("keydown", handleGlobalKeydown);
	};
});

$: if (initialized && keywordDesktop) {
	(async () => {
		await search(keywordDesktop, true);
	})();
}

$: if (initialized && keywordMobile) {
	(async () => {
		await search(keywordMobile, false);
	})();
}
</script>

<!-- search bar for desktop view -->
<div id="search-bar" class="hidden lg:flex transition-all items-center h-11 mr-2 rounded-lg
      bg-black/4 hover:bg-black/6 focus-within:bg-black/6
      dark:bg-white/5 dark:hover:bg-white/10 dark:focus-within:bg-white/10
">
    <Icon icon="material-symbols:search" class="absolute text-[1.25rem] pointer-events-none ml-3 transition my-auto text-black/30 dark:text-white/30"></Icon>
    <input bind:this={desktopInput} placeholder="{i18n(I18nKey.search, lang)}" bind:value={keywordDesktop} on:focus={() => { if (keywordDesktop) search(keywordDesktop, true); }}
           class="transition-all pl-10 text-sm bg-transparent outline-0
         h-full w-40 active:w-60 focus:w-60 text-black/50 dark:text-white/50"
    >
</div>

<!-- toggle btn for phone/tablet view -->
<button on:click={togglePanel} aria-label="Search Panel" id="search-switch"
        class="btn-plain scale-animation lg:hidden! rounded-lg w-11 h-11 active:scale-90">
    <Icon icon="material-symbols:search" class="text-[1.25rem]"></Icon>
</button>

<!-- search panel -->
<div id="search-panel" class="float-panel float-panel-closed search-panel absolute md:w-[30rem]
top-20 left-4 md:left-[unset] right-4 shadow-2xl rounded-2xl p-2">

    <!-- search bar inside panel for phone/tablet -->
    <div id="search-bar-inside" class="flex relative lg:hidden transition-all items-center h-11 rounded-xl
      bg-black/4 hover:bg-black/6 focus-within:bg-black/6
      dark:bg-white/5 dark:hover:bg-white/10 dark:focus-within:bg-white/10
  ">
        <Icon icon="material-symbols:search" class="absolute text-[1.25rem] pointer-events-none ml-3 transition my-auto text-black/30 dark:text-white/30"></Icon>
        <input bind:this={mobileInput} placeholder="Search" bind:value={keywordMobile}
               class="pl-10 absolute inset-0 text-sm bg-transparent outline-0
               focus:w-60 text-black/50 dark:text-white/50"
        >
    </div>

    <!-- search results -->
    {#each result as item}
        <a href={item.url}
           class="transition first-of-type:mt-2 lg:first-of-type:mt-0 group block
       rounded-xl text-lg px-3 py-2 hover:bg-(--btn-plain-bg-hover) active:bg-(--btn-plain-bg-active)">
            <div class="transition text-90 inline-flex font-bold group-hover:text-(--primary)">
                {item.meta.title}<Icon icon="fa6-solid:chevron-right" class="transition text-[0.75rem] translate-x-1 my-auto text-(--primary)"></Icon>
            </div>
            <div class="transition text-sm text-50">
                {@html item.excerpt}
            </div>
        </a>
    {/each}

    <!-- 键盘提示 -->
    <div class="hidden lg:flex items-center justify-end gap-1 px-3 pt-2 pb-1 text-xs text-50 select-none">
        <kbd class="rounded border border-black/10 dark:border-white/15 px-1.5 py-0.5">Ctrl</kbd>
        <span>+</span>
        <kbd class="rounded border border-black/10 dark:border-white/15 px-1.5 py-0.5">K</kbd>
        <span class="ml-2 rounded border border-black/10 dark:border-white/15 px-1.5 py-0.5">Esc</span>
    </div>
</div>

<style>
  input:focus {
    outline: 0;
  }
  .search-panel {
    max-height: calc(100vh - 100px);
    overflow-y: auto;
  }
  :global(#search-panel a.search-active) {
    background: var(--btn-plain-bg-hover);
    color: var(--primary);
  }
</style>
