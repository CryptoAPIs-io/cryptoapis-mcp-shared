import { randomUUID } from "node:crypto";
import * as z from "zod";
import type { CreditsPerBlockchain } from "../credits/index.js";

/**
 * Metadata for a single dangerous action that requires user confirmation before execution.
 */
export type DangerousActionConfig = {
    /** Short warning explaining why this action needs confirmation. */
    warning: string;
    /** What will happen if the action is executed. */
    impact: string;
};

/**
 * Maps action names to their danger metadata.
 * For multi-action tools, keys are action enum values (e.g. "sync", "delete-wallet").
 * For single-action tools, use a descriptive key (e.g. "create").
 */
export type DangerousActionMap = Record<string, DangerousActionConfig>;

// ─── Token store interface ───

/** Token TTL in milliseconds. */
export const TOKEN_TTL_MS = 60_000;

const TOKEN_TTL_SECONDS = TOKEN_TTL_MS / 1000;

/**
 * Interface for storing and validating one-time confirmation tokens.
 * Default implementation is in-memory. The HTTP server can swap in a Redis-backed store
 * via `setConfirmationTokenStore()`.
 */
export interface ConfirmationTokenStore {
    /** Store a token. It should auto-expire after TOKEN_TTL_MS. */
    store(token: string): void | Promise<void>;
    /** Validate and consume a token (one-time use). Returns true if valid. */
    validate(token: string): boolean | Promise<boolean>;
}

// ─── In-memory token store (default) ───

class InMemoryTokenStore implements ConfirmationTokenStore {
    private timers = new Map<string, NodeJS.Timeout>();

    store(token: string): void {
        const timer = setTimeout(() => { this.timers.delete(token); }, TOKEN_TTL_MS);
        timer.unref();
        this.timers.set(token, timer);
    }

    validate(token: string): boolean {
        const timer = this.timers.get(token);
        if (!timer) return false;
        clearTimeout(timer);
        this.timers.delete(token);
        return true;
    }
}

let tokenStore: ConfirmationTokenStore = new InMemoryTokenStore();

/**
 * Replace the default in-memory token store with a custom implementation (e.g. Redis).
 * Call this at server startup before any tools are invoked.
 */
export function setConfirmationTokenStore(store: ConfirmationTokenStore): void {
    tokenStore = store;
}

// ─── Schema ───

/**
 * Zod schema fragment for the confirmationToken field.
 * Merge into tool schemas that have dangerous actions.
 */
export const ConfirmationSchema = z.object({
    confirmationToken: z
        .string()
        .optional()
        .describe(
            "Confirmation token from a previous preview response. " +
            "IMPORTANT: You MUST present the warning and impact to the user and receive their explicit approval " +
            "before passing this token. NEVER auto-confirm — always ask the user first. " +
            `The token expires after ${TOKEN_TTL_SECONDS} seconds.`
        ),
});

// ─── Functions ───

/**
 * Check whether the current action requires confirmation and hasn't been confirmed.
 *
 * @param action - The current action name.
 * @param dangerousActions - The tool's dangerous action map.
 * @param confirmationToken - The token from a previous confirmation preview.
 * @returns The DangerousActionConfig if confirmation is required, or null if safe to proceed.
 */
export async function requiresConfirmation(
    action: string,
    dangerousActions: DangerousActionMap,
    confirmationToken?: string,
): Promise<DangerousActionConfig | null> {
    const config = dangerousActions[action];
    if (!config) return null;
    if (confirmationToken && await tokenStore.validate(confirmationToken)) return null;
    return config;
}

/**
 * Build a confirmation preview response with a one-time token.
 * The AI agent must show the warning to the user and get explicit approval
 * before calling again with the returned confirmationToken.
 *
 * @param action - The action name.
 * @param config - The dangerous action config.
 * @param credits - Optional credit cost for this action.
 * @returns MCP tool result with confirmation preview and token.
 */
export async function buildConfirmationPreview(
    action: string,
    config: DangerousActionConfig,
    credits?: number | CreditsPerBlockchain,
): Promise<{ content: { type: "text"; text: string }[] }> {
    const token = randomUUID().slice(0, 8);
    await tokenStore.store(token);

    const preview: Record<string, unknown> = {
        confirmationRequired: true,
        action,
        warning: config.warning,
        impact: config.impact,
        confirmationToken: token,
        instruction:
            "STOP: Do NOT call this tool again automatically. " +
            "You MUST present the warning and impact above to the user and ask for their explicit approval. " +
            "Only after the user confirms, call this tool again with the same parameters and set confirmationToken to the token above. " +
            `The token expires in ${TOKEN_TTL_SECONDS} seconds.`,
    };
    if (credits != null) {
        preview.estimatedCredits = credits;
    }
    return {
        content: [{ type: "text" as const, text: JSON.stringify(preview) }],
    };
}

/**
 * Format a warning line for tool descriptions listing which actions require confirmation.
 *
 * @param dangerousActions - The tool's dangerous action map.
 * @returns Description text to append to the tool description.
 */
export function formatDangerousActionsWarning(dangerousActions: DangerousActionMap): string {
    const actions = Object.keys(dangerousActions);
    const actionList = actions.map((a) => `'${a}'`).join(", ");
    return `\n\nNote: ${actionList} actions require confirmation. They return a preview with a one-time token instead of executing immediately.`;
}
