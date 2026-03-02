import * as z from "zod";

/**
 * Request metadata schema - supported by all endpoints.
 * Context is echoed back in the response.
 */
export const RequestMetadataSchema = z.object({
    context: z.string().optional().describe("Optional context for the request - echoed back in response"),
});

/**
 * Cursor-based pagination schema.
 * Used by Address History and other endpoints.
 * sortingOrder applies to list endpoints that support it (e.g. EVM transactions).
 */
export const CursorPaginationSchema = z.object({
    limit: z
        .number()
        .int()
        .positive()
        .max(50)
        .optional()
        .describe("Number of items to return (max 50)"),
    startingAfter: z
        .string()
        .optional()
        .describe("Pagination cursor - use nextStartingAfter from previous response"),
    sortingOrder: z
        .enum(["ascending", "descending"])
        .optional()
        .describe("Sort order: ascending (oldest first) or descending (newest first)"),
});

/**
 * Offset-based pagination schema.
 * Used by some endpoints.
 */
export const OffsetPaginationSchema = z.object({
    limit: z
        .number()
        .int()
        .positive()
        .max(50)
        .optional()
        .describe("Number of items to return (max 50)"),
    offset: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe("Pagination offset"),
});
