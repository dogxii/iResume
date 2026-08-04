import {
	normalizeResumeWorkspace,
	type ResumeWorkspace,
} from "../domain/resumeWorkspace";
import {
	readIdbRequestResult,
	waitForIdbTransaction,
} from "./indexedDb";

const DATABASE_NAME = "iresume";
const DATABASE_VERSION = 2;
const STORE_NAME = "workspace";
const WORKSPACE_KEY = "current";

export interface ResumeWorkspaceRepository {
	load(): Promise<ResumeWorkspace | null>;
	save(workspace: ResumeWorkspace): Promise<void>;
	clear(): Promise<void>;
}

export function createResumeWorkspaceRepository(
	databaseFactory: IDBFactory = window.indexedDB,
): ResumeWorkspaceRepository {
	let databasePromise: Promise<IDBDatabase> | null = null;

	const openDatabase = () => {
		if (databasePromise) return databasePromise;

		databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
			const request = databaseFactory.open(DATABASE_NAME, DATABASE_VERSION);
			request.onupgradeneeded = () => {
				const database = request.result;
				if (!database.objectStoreNames.contains(STORE_NAME)) {
					database.createObjectStore(STORE_NAME);
				}
			};
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => {
				databasePromise = null;
				reject(request.error ?? new Error("无法打开 IndexedDB"));
			};
			request.onblocked = () => {
				databasePromise = null;
				reject(new Error("IndexedDB 升级被其他页面阻塞"));
			};
		});

		return databasePromise;
	};

	return {
		async load() {
			const database = await openDatabase();
			const transaction = database.transaction(STORE_NAME, "readonly");
			const value = await readIdbRequestResult(
				transaction.objectStore(STORE_NAME).get(WORKSPACE_KEY),
			);
			return value === undefined ? null : normalizeResumeWorkspace(value);
		},

		async save(workspace) {
			const database = await openDatabase();
			const transaction = database.transaction(STORE_NAME, "readwrite");
			transaction.objectStore(STORE_NAME).put(workspace, WORKSPACE_KEY);
			await waitForIdbTransaction(transaction);
		},

		async clear() {
			const database = await openDatabase();
			const transaction = database.transaction(STORE_NAME, "readwrite");
			transaction.objectStore(STORE_NAME).delete(WORKSPACE_KEY);
			await waitForIdbTransaction(transaction);
		},
	};
}
