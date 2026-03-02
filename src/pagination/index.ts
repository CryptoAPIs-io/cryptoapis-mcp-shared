/**
 * Offset-based pagination parameters.
 * Used by some CryptoAPIs endpoints.
 */
export type OffsetPaginationParams = {
    limit?: number;
    offset?: number;
};

/**
 * Cursor-based pagination parameters.
 * Used by Address History and other endpoints.
 * sortingOrder applies to list endpoints that support it (e.g. EVM transactions).
 */
export type CursorPaginationParams = {
    limit?: number;
    startingAfter?: string;
    sortingOrder?: "ascending" | "descending";
};

/**
 * Offset-based paginated response data.
 */
export type OffsetPaginatedData<T> = {
    limit: number;
    offset: number;
    total: number;
    items: T[];
};

/**
 * Cursor-based paginated response data.
 */
export type CursorPaginatedData<T> = {
    limit: number;
    startingAfter?: string;
    hasMore: boolean;
    nextStartingAfter?: string;
    items: T[];
};

/**
 * @deprecated Use OffsetPaginationParams instead.
 */
export type PaginationInput = OffsetPaginationParams;

/**
 * @deprecated Use OffsetPaginatedData instead.
 */
export type PaginatedResult<T> = {
    items: T[];
    nextOffset?: number;
};

export function computeNextOffset(offset: number, limit: number, itemsReturned: number): number | undefined {
    if (itemsReturned < limit) return undefined;
    return offset + limit;
}
