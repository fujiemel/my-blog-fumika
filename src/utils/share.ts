/**
 * 分享按钮：事件委托，绑定一次即可覆盖 Swup 替换后的内容。
 * 优先使用系统分享（移动端），不支持时回退到复制链接。
 */
let bound = false;

async function copyText(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		// http 环境或权限受限时回退
		const textarea = document.createElement("textarea");
		textarea.value = text;
		textarea.setAttribute("readonly", "");
		textarea.style.position = "fixed";
		textarea.style.opacity = "0";
		document.body.appendChild(textarea);
		textarea.select();
		const ok = (
			document as unknown as { execCommand: (command: string) => boolean }
		).execCommand("copy");
		document.body.removeChild(textarea);
		return ok;
	}
}

function showFeedback(root: HTMLElement): void {
	const feedback = root.querySelector<HTMLElement>("[data-share-feedback]");
	if (!feedback) return;
	feedback.classList.remove("hidden");
	window.setTimeout(() => feedback.classList.add("hidden"), 1500);
}

async function handleAction(root: HTMLElement, action: string): Promise<void> {
	const url = root.dataset.shareUrl || window.location.href;
	const title = root.dataset.shareTitle || document.title;

	if (action === "copy") {
		if (await copyText(url)) showFeedback(root);
		return;
	}

	if (action === "native") {
		if (typeof navigator.share === "function") {
			try {
				await navigator.share({ title, url });
			} catch {
				// 用户取消分享，无需处理
			}
			return;
		}
		if (await copyText(url)) showFeedback(root);
	}
}

export function syncShareButtons(): void {
	const supported = typeof navigator.share === "function";
	for (const button of document.querySelectorAll<HTMLElement>(
		"[data-share-native]",
	)) {
		button.style.display = supported ? "" : "none";
	}
}

export function initShareButtons(): void {
	if (!bound) {
		bound = true;
		document.addEventListener("click", (event) => {
			const target = event.target;
			if (!(target instanceof Element)) return;

			const button = target.closest<HTMLElement>("[data-share-action]");
			const root = target.closest<HTMLElement>("[data-share-root]");
			if (!button || !root) return;

			event.preventDefault();
			void handleAction(root, button.dataset.shareAction ?? "");
		});
	}
	syncShareButtons();
}
