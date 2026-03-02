export class CryptoApisError extends Error {
    public readonly status?: number;
    public readonly code?: string;
    public readonly details?: unknown;

    constructor(message: string, opts?: { status?: number; code?: string; details?: unknown }) {
        super(message);
        this.name = "CryptoApisError";
        this.status = opts?.status;
        this.code = opts?.code;
        this.details = opts?.details;
    }
}

export function normalizeCryptoApisError(e: unknown): CryptoApisError {
    if (e instanceof CryptoApisError) return e;
    if (e instanceof Error) return new CryptoApisError(e.message);
    return new CryptoApisError("Unknown error", { details: e });
}
