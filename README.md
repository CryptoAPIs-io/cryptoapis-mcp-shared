# @cryptoapis-io/mcp-shared

Shared HTTP client, error types, blockchain constants, and schemas used by all [Crypto APIs](https://cryptoapis.io/) MCP servers.

> **API Version:** Compatible with Crypto APIs version **2024-12-12**

## What's Inside

- **HTTP client** — `CryptoApisHttpClient` for making authenticated REST API calls
- **Error types** — `CryptoApisError` with code, status, and details
- **Blockchain constants** — `BLOCKCHAIN_NETWORKS`, `EVM_BLOCKCHAINS`, `UTXO_BLOCKCHAINS`, chain IDs, network mappings
- **Zod schemas** — Blockchain/network schemas, cursor/offset pagination, request metadata
- **Credits** — `formatCreditsForDescription()` and credit types for tool cost metadata
- **Confirmation** — Token-based confirmation flow for dangerous actions (sync, delete, activate)
- **Config** — `loadSharedConfig()` with support for per-request API keys via `runWithApiKey()`
- **System info tool** — Built-in `system_info` tool providing blockchain, credits, and API documentation

## Installation

```bash
npm install @cryptoapis-io/mcp-shared
```

## Usage

This package is primarily used as a dependency by other `@cryptoapis-io/mcp-*` packages. You typically don't use it directly unless building a custom MCP server for Crypto APIs.

```typescript
import {
    CryptoApisHttpClient,
    loadSharedConfig,
    EVM_BLOCKCHAINS,
    UTXO_BLOCKCHAINS,
    EvmBlockchainSchema,
    CursorPaginationSchema,
    formatCreditsForDescription,
} from "@cryptoapis-io/mcp-shared";

const config = loadSharedConfig();
const client = new CryptoApisHttpClient(config);

const result = await client.request("GET", "/blockchain-data/ethereum/mainnet/addresses/{address}/balance");
```

## License

MIT
