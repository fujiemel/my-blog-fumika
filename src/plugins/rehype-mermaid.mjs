import { visit } from "unist-util-visit";

/**
 * 将 ```mermaid 代码块转换为 <pre class="mermaid">，由浏览器端渲染。
 * 这样构建期不再依赖 Playwright / Chromium。
 */
export function rehypeMermaidClient() {
	return (tree) => {
		visit(tree, "element", (node) => {
			if (node.tagName !== "pre") return;

			const code = node.children?.find(
				(child) => child.type === "element" && child.tagName === "code",
			);
			if (!code) return;

			const classes = code.properties?.className;
			if (!Array.isArray(classes) || !classes.includes("language-mermaid")) {
				return;
			}

			const text = code.children?.[0];
			if (text?.type !== "text") return;

			node.properties = { className: ["mermaid"] };
			node.children = [{ type: "text", value: text.value }];
		});
	};
}
