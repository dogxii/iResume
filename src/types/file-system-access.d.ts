type FileSystemPermissionMode = "read" | "readwrite";
type WellKnownDirectory =
	| "desktop"
	| "documents"
	| "downloads"
	| "music"
	| "pictures"
	| "videos";

interface FileSystemPermissionDescriptor {
	mode?: FileSystemPermissionMode;
}

interface FileSystemHandle {
	kind: "file" | "directory";
	name: string;
	queryPermission?(
		descriptor?: FileSystemPermissionDescriptor,
	): Promise<PermissionState>;
	requestPermission?(
		descriptor?: FileSystemPermissionDescriptor,
	): Promise<PermissionState>;
}

interface FileSystemDirectoryHandle {
	kind: "directory";
	name: string;
	entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
	values(): AsyncIterableIterator<FileSystemHandle>;
	getFileHandle(
		name: string,
		options?: { create?: boolean },
	): Promise<FileSystemFileHandle>;
	removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
}

interface FileSystemFileHandle {
	kind: "file";
	name: string;
	getFile(): Promise<File>;
	createWritable(): Promise<FileSystemWritableFileStream>;
}

interface Window {
	showDirectoryPicker?: (options?: {
		mode?: FileSystemPermissionMode;
		startIn?: WellKnownDirectory | FileSystemHandle;
	}) => Promise<FileSystemDirectoryHandle>;
}
