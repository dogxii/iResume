export const readIdbRequestResult = <T>(request: IDBRequest<T>) =>
	new Promise<T>((resolve, reject) => {
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error ?? new Error("IndexedDB 请求失败"));
	});

export const waitForIdbTransaction = (transaction: IDBTransaction) =>
	new Promise<void>((resolve, reject) => {
		transaction.oncomplete = () => resolve();
		transaction.onerror = () =>
			reject(transaction.error ?? new Error("IndexedDB 写入失败"));
		transaction.onabort = () =>
			reject(transaction.error ?? new Error("IndexedDB 写入已取消"));
	});
