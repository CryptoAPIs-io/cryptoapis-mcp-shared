/**
 * Shared types and helpers for MCP resource registration across all packages.
 *
 * Each package defines its own supported-chains data using these types,
 * then registers it as a static MCP resource.
 */

/**
 * Describes which blockchains support a given action.
 * Key = action name (e.g. "get-balance"), value = list of blockchain names.
 */
export type ActionBlockchainMap = Record<string, readonly string[]>;

/**
 * Supported chains descriptor for a single blockchain family within a package.
 */
export type BlockchainFamilyDescriptor = {
    /** e.g. ["ethereum", "binance-smart-chain", ...] */
    blockchains: readonly string[];
    /** Blockchain → available networks */
    networks: Record<string, readonly string[]>;
    /** Action → blockchains that support it */
    actions: ActionBlockchainMap;
};

/**
 * Full supported-chains resource data for a package.
 * Key = family name (e.g. "evm", "utxo", "xrp", "solana", "kaspa").
 */
export type SupportedChainsResource = Record<string, BlockchainFamilyDescriptor>;

/**
 * Build the JSON text content for a supported-chains MCP resource.
 */
export function buildSupportedChainsContent(data: SupportedChainsResource): string {
    return JSON.stringify(data, null, 2);
}

/**
 * Format supported chains data as human-readable text for embedding in prompt output.
 */
export function formatSupportedChains(data: SupportedChainsResource): string {
    const lines: string[] = ["Supported blockchains and networks:"];
    for (const [family, descriptor] of Object.entries(data)) {
        lines.push(`\n${family.toUpperCase()}:`);
        for (const blockchain of descriptor.blockchains) {
            const networks = descriptor.networks[blockchain]?.join(", ") ?? "none";
            lines.push(`  • ${blockchain}: ${networks}`);
        }
    }
    return lines.join("\n");
}

