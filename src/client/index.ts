import { CryptoApisError } from "../errors/index.js";
import type { SharedConfig } from "../config/index.js";
import { CRYPTOAPIS_VERSION, MCP_USER_AGENT } from "../config/index.js";
import { apiKeyStore } from "../request-context/index.js";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** Response headers from OpenAPI. */
export const API_RESPONSE_HEADERS = {
    creditsConsumed: "x-credits-consumed",
    creditsAvailable: "x-credits-available",
    responseTime: "x-response-time",
    throughputUsage: "x-throughput-usage",
} as const;

export type ApiResponseMetadata = {
    creditsConsumed?: number;
    /** Kept as string when value exceeds Number.MAX_SAFE_INTEGER to avoid precision loss. */
    creditsAvailable?: number | string;
    responseTime?: number | string;
    throughputUsage?: number | string;
};

export type RequestResult<T> = { data: T } & ApiResponseMetadata;

/**
 * CryptoAPIs error response structure:
 * {
 *   "apiVersion": "2021-03-20",
 *   "requestId": "...",
 *   "context": "...",
 *   "error": {
 *     "code": "invalid_blockchain" | "invalid_network" | "blockchain_data_invalid_address" | ...,
 *     "message": "Human readable error message",
 *     "details": "Optional additional details"
 *   }
 * }
 */
interface CryptoApisErrorResponse {
    apiVersion?: string;
    requestId?: string;
    context?: string;
    error?: {
        code?: string;
        message?: string;
        details?: unknown;
    };
}

export class CryptoApisHttpClient {
    constructor(private readonly cfg: SharedConfig) {}

    async request<T>(method: HttpMethod, path: string, opts?: { query?: Record<string, unknown>; body?: unknown }): Promise<RequestResult<T>> {
        const apiKey = this.cfg.apiKey || apiKeyStore.getStore();
        if (!apiKey) {
            throw new CryptoApisError(
                "No API key available. Provide via --api-key argument, CRYPTOAPIS_API_KEY environment variable, or x-api-key request header.",
                { status: 0, code: "missing_api_key" }
            );
        }

        const url = new URL(this.cfg.baseUrl + path);

        if (opts?.query) {
            for (const [k, v] of Object.entries(opts.query)) {
                if (v === undefined || v === null) continue;
                url.searchParams.set(k, String(v));
            }
        }

        const ac = new AbortController();
        const t = setTimeout(() => ac.abort(), this.cfg.timeoutMs);

        try {
            const res = await fetch(url, {
                method,
                signal: ac.signal,
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": apiKey,
                    "x-api-version": CRYPTOAPIS_VERSION,
                    "User-Agent": MCP_USER_AGENT,
                    "x-source": "mcp",
                },
                body: opts?.body ? JSON.stringify(opts.body) : undefined,
            });

            const text = await res.text();
            const data = text ? safeJsonParse(text) : null;

            if (!res.ok) {
                const errorResponse = data as CryptoApisErrorResponse | null;
                const apiError = errorResponse?.error;

                // Build descriptive error message
                const errorCode = apiError?.code || "unknown_error";
                const errorMessage = apiError?.message || `Request failed with status ${res.status}`;
                const errorDetails = apiError?.details ? ` Details: ${JSON.stringify(apiError.details)}` : "";
                const requestId = errorResponse?.requestId ? ` (requestId: ${errorResponse.requestId})` : "";

                throw new CryptoApisError(
                    `[${errorCode}] ${errorMessage}${errorDetails}${requestId}`,
                    {
                        status: res.status,
                        code: errorCode,
                        details: {
                            path,
                            method,
                            apiError,
                            requestId: errorResponse?.requestId,
                        },
                    }
                );
            }

            const metadata = getResponseMetadata(res.headers);
            return { data: (data as T) ?? ({} as T), ...metadata };
        } finally {
            clearTimeout(t);
        }
    }
}

function getResponseMetadata(headers: Headers): ApiResponseMetadata {
    const get = (name: string): string | null => headers.get(name);
    return {
        creditsConsumed: parseOptionalInt(get(API_RESPONSE_HEADERS.creditsConsumed)),
        creditsAvailable: parseOptionalCreditsAvailable(get(API_RESPONSE_HEADERS.creditsAvailable)),
        responseTime: parseOptionalNumberOrString(get(API_RESPONSE_HEADERS.responseTime)),
        throughputUsage: parseOptionalNumberOrString(get(API_RESPONSE_HEADERS.throughputUsage)),
    };
}

function parseOptionalInt(value: string | null): number | undefined {
    if (value == null || value === "") return undefined;
    const n = Number.parseInt(value, 10);
    return Number.isNaN(n) ? undefined : n;
}

/** Parse credits-available; keep as string if beyond safe integer to avoid precision loss. */
function parseOptionalCreditsAvailable(value: string | null): number | string | undefined {
    if (value == null || value === "") return undefined;
    const n = Number.parseInt(value, 10);
    if (Number.isNaN(n)) return undefined;
    return n > Number.MAX_SAFE_INTEGER ? value : n;
}

function parseOptionalNumberOrString(value: string | null): number | string | undefined {
    if (value == null || value === "") return undefined;
    const n = Number(value);
    return Number.isNaN(n) ? value : n;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeJsonParse(s: string): any {
    try {
        return JSON.parse(s);
    } catch {
        return { raw: s };
    }
}
