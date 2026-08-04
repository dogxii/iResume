import {
	useEffect,
	useState,
	type RefObject,
} from "react";

export type AdaptiveMenuPlacement = "top" | "bottom";

interface UseAdaptiveMenuPlacementOptions {
	open: boolean;
	preferred?: AdaptiveMenuPlacement;
	estimatedHeight?: number;
	offset?: number;
}

export function useAdaptiveMenuPlacement<T extends HTMLElement>(
	triggerRef: RefObject<T | null>,
	{
		open,
		preferred = "bottom",
		estimatedHeight = 220,
		offset = 8,
	}: UseAdaptiveMenuPlacementOptions,
) {
	const [placement, setPlacement] =
		useState<AdaptiveMenuPlacement>(preferred);

	useEffect(() => {
		if (!open) return;

		const updatePlacement = () => {
			const rect = triggerRef.current?.getBoundingClientRect();
			if (!rect) return;

			const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
			const spaceAbove = rect.top;
			const spaceBelow = viewportHeight - rect.bottom;
			const requiredSpace = estimatedHeight + offset;
			const preferredSpace = preferred === "top" ? spaceAbove : spaceBelow;
			const fallbackSpace = preferred === "top" ? spaceBelow : spaceAbove;

			if (preferredSpace >= requiredSpace || preferredSpace >= fallbackSpace) {
				setPlacement(preferred);
				return;
			}

			setPlacement(preferred === "top" ? "bottom" : "top");
		};

		const frame = window.requestAnimationFrame(updatePlacement);
		window.addEventListener("resize", updatePlacement);
		window.addEventListener("scroll", updatePlacement, true);

		return () => {
			window.cancelAnimationFrame(frame);
			window.removeEventListener("resize", updatePlacement);
			window.removeEventListener("scroll", updatePlacement, true);
		};
	}, [estimatedHeight, offset, open, preferred, triggerRef]);

	return placement;
}
