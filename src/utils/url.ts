const protocolPattern = /^[a-zA-Z][a-zA-Z\d+.-]*:/;
const safeProtocols = new Set(["http:", "https:", "mailto:", "tel:"]);

export function normalizeSafeUrl(value: string): string | undefined {
	const trimmed = value.trim();
	if (!trimmed) return undefined;

	const candidate = protocolPattern.test(trimmed)
		? trimmed
		: `https://${trimmed}`;

	try {
		const url = new URL(candidate);
		return safeProtocols.has(url.protocol) ? url.href : undefined;
	} catch {
		return undefined;
	}
}

export function formatUrlForDisplay(value: string, href?: string): string {
	const trimmed = value.trim() || href?.trim() || "";
	if (!trimmed) return "";
	const candidate = protocolPattern.test(trimmed) ? trimmed : `https://${trimmed}`;

	try {
		const url = new URL(candidate);
		if (!safeProtocols.has(url.protocol)) return trimmed;
		const pathname = url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "");
		return `${url.host}${pathname}${url.search}${url.hash}`;
	} catch {
		return trimmed.replace(/^https?:\/\//i, "").replace(/\/$/, "");
	}
}
