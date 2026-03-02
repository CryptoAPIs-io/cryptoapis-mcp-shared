export type Protocol = string;
export type Network = string;

export type CryptoApisToolResult<T> = {
    ok: true;
    data: T;
} | {
    ok: false;
    error: { message: string; status?: number; details?: unknown };
};

/**
 * Common request metadata for all CryptoAPIs endpoints.
 * These parameters are echoed back in the response envelope.
 */
export type RequestMetadata = {
    context?: string;
};

/**
 * Standard CryptoAPIs response envelope.
 */
export type ApiResponseEnvelope<T> = {
    apiVersion: string;
    requestId: string;
    context?: string;
    data: T;
};

/**
 * Standard CryptoAPIs error response.
 */
export type ApiErrorResponse = {
    apiVersion: string;
    requestId: string;
    context?: string;
    error: {
        code: string;
        message: string;
        details?: Array<{
            attribute: string;
            message: string;
        }>;
    };
};
