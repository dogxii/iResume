export const DEFAULT_PREVIEW_ZOOM = 0.75;

export const PREVIEW_ZOOM_OPTIONS = [0.6, 0.75, 0.9, 1, 1.15, 1.3] as const;

export type PreviewZoom = (typeof PREVIEW_ZOOM_OPTIONS)[number];

export function isPreviewZoom(value: number): value is PreviewZoom {
	return PREVIEW_ZOOM_OPTIONS.some((option) => option === value);
}

export function normalizePreviewZoom(value: unknown): PreviewZoom {
	const numericValue =
		typeof value === "string" || typeof value === "number"
			? Number(value)
			: DEFAULT_PREVIEW_ZOOM;

	return isPreviewZoom(numericValue) ? numericValue : DEFAULT_PREVIEW_ZOOM;
}

export function getAdjacentPreviewZoom(
	value: PreviewZoom,
	direction: "smaller" | "larger",
): PreviewZoom {
	const index = PREVIEW_ZOOM_OPTIONS.indexOf(value);
	const nextIndex = direction === "smaller" ? index - 1 : index + 1;
	const clampedIndex = Math.min(
		Math.max(nextIndex, 0),
		PREVIEW_ZOOM_OPTIONS.length - 1,
	);

	return PREVIEW_ZOOM_OPTIONS[clampedIndex];
}
