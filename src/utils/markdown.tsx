import type React from "react";
import { normalizeSafeUrl } from "./url";
import { parseMarkdownBlocks } from "./markdownBlocks";

/**
 * 解析行内 Markdown 语法，支持：
 *   **粗体**        → <strong>
 *   [文字](url)     → <a target="_blank">
 *
 * @param text  原始字符串
 * @returns     React 节点数组，可直接嵌入 JSX
 */
export function parseInline(text: string): React.ReactNode[] {
	const parts: React.ReactNode[] = [];
	const regex = /\*\*(.+?)\*\*|\[(.+?)\]\((.+?)\)/g;
	let lastIndex = 0;
	let match: RegExpExecArray | null = regex.exec(text);

	while (match !== null) {
		// 匹配前的纯文字片段
		if (match.index > lastIndex) {
			parts.push(text.slice(lastIndex, match.index));
		}

		if (match[1] !== undefined) {
			// **粗体**
			parts.push(<strong key={match.index}>{match[1]}</strong>);
		} else if (match[2] !== undefined && match[3] !== undefined) {
			// [文字](url)
			const href = normalizeSafeUrl(match[3]);
			parts.push(
				href ? (
					<a
						key={match.index}
						href={href}
						target="_blank"
						rel="noreferrer"
						className="text-blue-600 hover:underline"
					>
						{match[2]}
					</a>
				) : (
					match[2]
				),
			);
		}

		lastIndex = regex.lastIndex;
		match = regex.exec(text);
	}

	// 剩余尾部纯文字
	if (lastIndex < text.length) {
		parts.push(text.slice(lastIndex));
	}

	return parts;
}

export function renderMarkdownBlocks(
	text: string,
	{
		listClassName = "",
		paragraphClassName = "",
	}: {
		listClassName?: string;
		paragraphClassName?: string;
	} = {},
): React.ReactNode {
	const blocks = parseMarkdownBlocks(text);
	if (blocks.length === 0) return null;

	return blocks.map((block, index) => {
		if (block.type === "list") {
			return (
				<ul
					key={`list-${index}`}
					className={listClassName}
				>
					{block.items.map((item, itemIndex) => (
						<li key={`${itemIndex}-${item.slice(0, 20)}`}>
							{parseInline(item)}
						</li>
					))}
				</ul>
			);
		}

		return (
			<div
				key={`paragraph-${index}-${block.text.slice(0, 20)}`}
				className={paragraphClassName}
			>
				{parseInline(block.text)}
			</div>
		);
	});
}
