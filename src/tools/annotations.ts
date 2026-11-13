import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";

export type { ToolAnnotations };

/**
 * MCP tool annotations shared by every CryptoAPIs tool. Each tool definition picks the preset that
 * matches its MOST impactful action: a tool whose actions include a delete is destructive even
 * though its other actions only read. Clients use these hints to decide when to ask the user
 * before a call, so a write is never marked read-only.
 */

/** Reads data through the CryptoAPIs API and changes nothing (credits may still be charged). */
export const READ_ONLY_TOOL: Readonly<ToolAnnotations> = Object.freeze({
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
});

/** Answers from data bundled in the package: no API call and no change. */
export const LOCAL_READ_ONLY_TOOL: Readonly<ToolAnnotations> = Object.freeze({
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
});

/** Creates or changes state on the user's CryptoAPIs account (sync, subscribe, derive-and-sync); removes nothing. */
export const WRITE_TOOL: Readonly<ToolAnnotations> = Object.freeze({
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
});

/** Can delete account state or make an irreversible change, such as broadcasting a transaction. */
export const DESTRUCTIVE_TOOL: Readonly<ToolAnnotations> = Object.freeze({
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
});
