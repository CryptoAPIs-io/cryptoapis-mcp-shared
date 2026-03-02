import * as z from "zod";
import { RequestMetadataSchema } from "../../schemas/index.js";
import type { CryptoApisHttpClient } from "../../client/index.js";
import { blockchainsData } from "./data/blockchains.js";
import { errorsData } from "./data/errors.js";
import { creditsData } from "./data/credits.js";
import { callbacksData } from "./data/callbacks.js";
import { limitsData } from "./data/limits.js";

const ACTION_DATA: Record<string, object> = {
    blockchains: blockchainsData,
    errors: errorsData,
    credits: creditsData,
    callbacks: callbacksData,
    limits: limitsData,
};

const SystemInfoAction = z.enum(["blockchains", "errors", "credits", "callbacks", "limits"]);

export const SystemInfoSchema = z
    .object({
        action: SystemInfoAction.describe("Reference topic to retrieve"),
    })
    .merge(RequestMetadataSchema);

export type SystemInfoInput = z.infer<typeof SystemInfoSchema>;

export const systemInfoTool = {
    name: "system_info" as const,
    credits: undefined as undefined,
    description: `CryptoAPIs reference documentation — no API call, no credits consumed.

Actions:
• blockchains — Supported blockchains, networks, products per chain, denominations, fiat currencies
• errors — Complete error code table (HTTP status, error code, message)
• credits — Credit charging structure, cost multipliers per blockchain, monitoring & operations taxes (xPub, synced addresses, blockchain events), pay-as-you-go
• callbacks — Webhook mechanics: URL requirements, retry strategy (5 retries, exponential backoff), HMAC security, idempotency
• limits — Throughput soft/hard limits per plan, 2.1x penalty multiplier, rate limiting behavior`,
    inputSchema: SystemInfoSchema,
    handler:
        (_client: CryptoApisHttpClient) =>
        async (input: SystemInfoInput) => {
            return {
                content: [{ type: "text" as const, text: JSON.stringify(ACTION_DATA[input.action]) }],
            };
        },
};
