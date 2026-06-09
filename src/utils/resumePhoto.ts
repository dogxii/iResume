import { normalizeSafeUrl } from "./url";

export const RESUME_PHOTO_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const RESUME_PHOTO_MAX_EDGE_PX = 480;

export const embeddedResumePhotoPattern =
	/^data:image\/(?:png|jpe?g|webp);base64,/i;

export const resumePhotoFileTypePattern = /^image\/(?:jpeg|png|webp)$/;

export const isEmbeddedResumePhotoUrl = (value: string) =>
	embeddedResumePhotoPattern.test(value.trim());

export const normalizeResumePhotoSrc = (value: string): string | undefined => {
	const trimmed = value.trim();
	if (!trimmed) return undefined;
	if (isEmbeddedResumePhotoUrl(trimmed)) return trimmed;
	return normalizeSafeUrl(trimmed);
};
