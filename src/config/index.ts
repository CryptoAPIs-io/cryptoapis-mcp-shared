/**
 * Crypto APIs base URL - static constant
 */
export const CRYPTOAPIS_BASE_URL = "https://rest.cryptoapis.io";

/**
 * Crypto APIs version - static constant
 * Sent as x-api-version header with every request
 */
export const CRYPTOAPIS_VERSION = "2024-12-12";

export type SharedConfig = {
    baseUrl: string;
    apiKey: string;
    timeoutMs: number;
};

export type ConfigOverrides = {
    apiKey?: string;
    allowMissingApiKey?: boolean;
};

export function loadSharedConfig(
    overrides?: ConfigOverrides,
    env: NodeJS.ProcessEnv = process.env
): SharedConfig {
    const apiKey = overrides?.apiKey?.trim() || env.CRYPTOAPIS_API_KEY?.trim();
    if (!apiKey && !overrides?.allowMissingApiKey) {
        throw new Error("Missing CRYPTOAPIS_API_KEY. Provide via --api-key argument or CRYPTOAPIS_API_KEY environment variable.");
    }

    return {
        baseUrl: CRYPTOAPIS_BASE_URL,
        apiKey: apiKey || "",
        timeoutMs: Number(env.CRYPTOAPIS_TIMEOUT_MS || "20000"),
    };
}
