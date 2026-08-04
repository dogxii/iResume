import {
	useCallback,
	useEffect,
	useMemo,
	useReducer,
	useRef,
	useState,
	type Dispatch,
	type SetStateAction,
} from "react";
import {
	createResumeWorkspace,
	type ResumeWorkspace,
} from "../domain/resumeWorkspace";
import {
	createResumeWorkspaceRepository,
	type ResumeWorkspaceRepository,
} from "../data/resumeWorkspaceRepository";
import type {
	ResumeDocument,
	ResumeLibrary,
} from "../data/resumeLibrary";
import type { DocumentHistory } from "../data/resumeHistory";

const MAX_UNDO_STEPS = 100;
const CHANGE_GROUP_WINDOW_MS = 800;

interface ChangeGroup {
	key: string;
	at: number;
}

interface RuntimeState {
	workspace: ResumeWorkspace;
	past: ResumeLibrary[];
	future: ResumeLibrary[];
	lastChange: ChangeGroup | null;
	hydrated: boolean;
	editedBeforeHydration: boolean;
}

type WorkspaceAction =
	| { type: "hydrate"; workspace: ResumeWorkspace | null }
	| { type: "replace-workspace"; workspace: ResumeWorkspace }
	| {
			type: "set-library";
			updater: SetStateAction<ResumeLibrary>;
			groupKey?: string;
			at: number;
	  }
	| {
			type: "set-history";
			documentId: string;
			updater: SetStateAction<DocumentHistory>;
	  }
	| { type: "undo" }
	| { type: "redo" };

const resolveStateAction = <T>(current: T, action: SetStateAction<T>): T =>
	typeof action === "function"
		? (action as (value: T) => T)(current)
		: action;

const pushUndoStep = (past: ResumeLibrary[], library: ResumeLibrary) =>
	[...past, library].slice(-MAX_UNDO_STEPS);

export function resumeWorkspaceReducer(
	state: RuntimeState,
	action: WorkspaceAction,
): RuntimeState {
	switch (action.type) {
		case "hydrate":
			return {
				...state,
				workspace:
					state.editedBeforeHydration || !action.workspace
						? state.workspace
						: action.workspace,
				hydrated: true,
			};
		case "replace-workspace":
			return {
				...state,
				workspace: action.workspace,
				past: [],
				future: [],
				lastChange: null,
				editedBeforeHydration: state.editedBeforeHydration || !state.hydrated,
			};
		case "set-library": {
			const currentLibrary = state.workspace.library;
			const nextLibrary = resolveStateAction(currentLibrary, action.updater);
			if (nextLibrary === currentLibrary) return state;

			const canCoalesce = Boolean(
				action.groupKey &&
					state.lastChange?.key === action.groupKey &&
					action.at - state.lastChange.at <= CHANGE_GROUP_WINDOW_MS,
			);

			return {
				...state,
				workspace: { ...state.workspace, library: nextLibrary },
				past: canCoalesce
					? state.past
					: pushUndoStep(state.past, currentLibrary),
				future: [],
				lastChange: action.groupKey
					? { key: action.groupKey, at: action.at }
					: null,
				editedBeforeHydration: state.editedBeforeHydration || !state.hydrated,
			};
		}
		case "set-history": {
			const currentHistory = state.workspace.histories[action.documentId] ?? {
				snapshots: [],
			};
			const nextHistory = resolveStateAction(currentHistory, action.updater);
			if (nextHistory === currentHistory) return state;

			return {
				...state,
				workspace: {
					...state.workspace,
					histories: {
						...state.workspace.histories,
						[action.documentId]: nextHistory,
					},
				},
				editedBeforeHydration: state.editedBeforeHydration || !state.hydrated,
			};
		}
		case "undo": {
			const previous = state.past.at(-1);
			if (!previous) return state;
			return {
				...state,
				workspace: { ...state.workspace, library: previous },
				past: state.past.slice(0, -1),
				future: [state.workspace.library, ...state.future].slice(0, MAX_UNDO_STEPS),
				lastChange: null,
			};
		}
		case "redo": {
			const [next, ...future] = state.future;
			if (!next) return state;
			return {
				...state,
				workspace: { ...state.workspace, library: next },
				past: pushUndoStep(state.past, state.workspace.library),
				future,
				lastChange: null,
			};
		}
	}
}

export const createResumeWorkspaceRuntimeState = (): RuntimeState => ({
	workspace: createResumeWorkspace(),
	past: [],
	future: [],
	lastChange: null,
	hydrated: false,
	editedBeforeHydration: false,
});

export function useResumeWorkspace(
	repository?: ResumeWorkspaceRepository,
) {
	const resolvedRepository = useMemo(
		() => repository ?? createResumeWorkspaceRepository(),
		[repository],
	);
	const [state, dispatch] = useReducer(
		resumeWorkspaceReducer,
		undefined,
		createResumeWorkspaceRuntimeState,
	);
	const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
	const [storageError, setStorageError] = useState<string | null>(null);

	useEffect(() => {
		let canceled = false;
		resolvedRepository
			.load()
			.then((workspace) => {
				if (!canceled) dispatch({ type: "hydrate", workspace });
			})
			.catch((error: unknown) => {
				if (canceled) return;
				setStorageError(
					error instanceof Error ? error.message : "无法读取本地简历数据",
				);
				dispatch({ type: "hydrate", workspace: null });
			});

		return () => {
			canceled = true;
		};
	}, [resolvedRepository]);

	useEffect(() => {
		if (!state.hydrated) return;
		saveQueueRef.current = saveQueueRef.current
			.then(() => resolvedRepository.save(state.workspace))
			.then(() => setStorageError(null))
			.catch((error: unknown) => {
				setStorageError(
					error instanceof Error ? error.message : "无法保存本地简历数据",
				);
			});
	}, [resolvedRepository, state.hydrated, state.workspace]);

	const setLibrary = useCallback<Dispatch<SetStateAction<ResumeLibrary>>>(
		(updater) => dispatch({ type: "set-library", updater, at: Date.now() }),
		[],
	);

	const replaceWorkspace = useCallback((workspace: ResumeWorkspace) => {
		dispatch({ type: "replace-workspace", workspace });
	}, []);

	const updateDocument = useCallback(
		(
			documentId: string,
			updater: (document: ResumeDocument) => ResumeDocument,
			groupKey = "document",
		) => {
			dispatch({
				type: "set-library",
				groupKey: `${documentId}:${groupKey}`,
				at: Date.now(),
				updater: (library) => ({
					...library,
					documents: library.documents.map((document) =>
						document.id === documentId
							? {
									...updater(document),
									updatedAt: new Date().toISOString(),
								}
							: document,
					),
				}),
			});
		},
		[],
	);

	const updateActiveDocument = useCallback(
		(
			updater: (document: ResumeDocument) => ResumeDocument,
			groupKey = "active-document",
		) => {
			updateDocument(state.workspace.library.activeId, updater, groupKey);
		},
		[state.workspace.library.activeId, updateDocument],
	);

	const setDocumentHistory = useCallback(
		(documentId: string, updater: SetStateAction<DocumentHistory>) => {
			dispatch({ type: "set-history", documentId, updater });
		},
		[],
	);
	const undo = useCallback(() => dispatch({ type: "undo" }), []);
	const redo = useCallback(() => dispatch({ type: "redo" }), []);

	return {
		workspace: state.workspace,
		replaceWorkspace,
		library: state.workspace.library,
		setLibrary,
		updateDocument,
		updateActiveDocument,
		setDocumentHistory,
		undo,
		redo,
		canUndo: state.past.length > 0,
		canRedo: state.future.length > 0,
		isHydrated: state.hydrated,
		storageError,
	};
}
