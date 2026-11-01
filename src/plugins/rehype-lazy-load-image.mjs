import { visit } from "unist-util-visit";

/**
 * 给正文图片加上懒加载与占位标记。
 *
 * `data-img-state="pending"` 让 CSS 在图片加载完成前绘制骨架，
 * 客户端脚本（src/utils/image-placeholder.ts）负责在 load / error 时切换到
 * loaded / error 状态，加载失败会替换成本地占位图。
 */
export function rehypeLazyLoadImage() {
	return (tree) => {
		visit(tree, "element", (node) => {
			if (node.tagName === "img") {
				node.properties = node.properties || {};
				node.properties.loading = "lazy";
				node.properties.decoding = "async";
				node.properties["data-img-placeholder"] = "";
				node.properties["data-img-state"] = "pending";
			}
		});
	};
}
