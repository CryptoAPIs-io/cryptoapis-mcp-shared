/**
 * Disclaimer shown with credit metadata in tool descriptions.
 * Actual credits spent are returned in the API response headers for each request.
 */
export const CREDITS_METADATA_DISCLAIMER =
    "Credits are indicative only and may change at any time. The actual credits spent for each API request are returned in the response headers.";

/**
 * Cost per blockchain (slug -> credits). Used when an endpoint has different credit cost per blockchain.
 */
export type CreditsPerBlockchain = Record<string, number>;

/**
 * Optional cost-in-credits metadata for MCP tools.
 * - number: single-action tool, one cost for all.
 * - Record<string, number>: action -> same cost for all blockchains.
 * - Record<string, number | CreditsPerBlockchain>: action -> cost (number) or per-blockchain map.
 */
export type ToolCredits =
    | number
    | Record<string, number>
    | Record<string, number | CreditsPerBlockchain>;

function formatCreditValueVerbose(value: number | CreditsPerBlockchain): string {
    if (typeof value === "number") {
        return String(value);
    }
    return Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([chain, cost]) => `${chain} ${cost}`)
        .join(", ");
}

/**
 * Format credits for appending to a tool description (e.g. in tools/list).
 * MCP only supports name, description, inputSchema; credits are surfaced in the description text.
 */
export function formatCreditsForDescription(credits: ToolCredits): string {
    const disclaimer = `\n\n${CREDITS_METADATA_DISCLAIMER}`;
    if (typeof credits === "number") {
        return `Credits per call: ${credits}${disclaimer}`;
    }
    const entries = Object.entries(credits).sort(([a], [b]) => a.localeCompare(b));
    const lines = entries.map(([action, cost]) => {
        const value =
            typeof cost === "number" ? String(cost) : formatCreditValueVerbose(cost);
        return `• ${action}: ${value}`;
    });
    return `Credits by action (source: OpenAPI):\n${lines.join("\n")}${disclaimer}`;
}

