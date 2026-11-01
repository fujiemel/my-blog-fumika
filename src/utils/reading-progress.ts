/**
 * 阅读进度条：绑定一次滚动监听，Swup 切页后只需重新计算。
 * 进度条元素由 ReadingProgress.astro 提供，只在文章页渲染。
 */
let bound = false;
let frame = 0;

function update(): void {
	const bar = document.getElementById("reading-progress-bar");
	if (!bar) return;

	const doc = document.documentElement;
	const max = doc.scrollHeight - window.innerHeight;
	const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
	bar.style.transform = `scaleX(${progress})`;
}

function schedule(): void {
	if (frame) return;
	frame = requestAnimationFrame(() => {
		frame = 0;
		update();
	});
}

export function initReadingProgress(): void {
	if (!bound) {
		bound = true;
		window.addEventListener("scroll", schedule, { passive: true });
		window.addEventListener("resize", schedule);
	}
	// 切页后等待 Swup 完成滚动复位再计算
	setTimeout(update, 60);
	update();
}
