import { AsyncLocalStorage } from "node:async_hooks";

export const apiKeyStore = new AsyncLocalStorage<string>();

export function runWithApiKey<T>(apiKey: string, fn: () => T): T {
    return apiKeyStore.run(apiKey, fn);
}
