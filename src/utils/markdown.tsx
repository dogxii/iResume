import type React from "react";

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
			parts.push(
				<a
					key={match.index}
					href={match[3]}
					target="_blank"
					rel="noreferrer"
					className="text-blue-600 hover:underline"
				>
					{match[2]}
				</a>,
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

/**
 * 将多行文本渲染为支持行内 Markdown 的 <li> 列表
 * - 自动过滤空行
 * - 自动剥离行首可选的 "- " 前缀
 */
export function renderMarkdownList(text: string): React.ReactNode {
	if (!text.trim()) return null;

	return text
		.split("\n")
		.filter((line) => line.trim())
		.map((line, index) => {
			const content = line.replace(/^-\s*/, "");
			return (
				<li key={`${index}-${line.slice(0, 20)}`}>{parseInline(content)}</li>
			);
		});
}
