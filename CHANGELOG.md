# @cryptoapis-io/mcp-shared

## 0.4.0

### Minor Changes

- 3167621: Security: the HTTP transport no longer serves unauthenticated callers with the operator's API key.

  Before, `--transport http --api-key <key>` listened on `0.0.0.0` and never authenticated the caller, so anyone who could reach the port could call every tool on the operator's key: spend their credits, and create, deactivate or delete their blockchain-event webhooks and HD-wallet syncs.

  - HTTP mode now listens on `127.0.0.1` by default, with DNS rebinding protection (Host header check).
  - Listening on a non-loopback address (`--host 0.0.0.0`) with a startup API key requires an auth token (`MCP_AUTH_TOKEN` or `--auth-token`); callers send `Authorization: Bearer <token>`. Without one the server refuses to start.
  - New `--allowed-hosts` restricts the Host header on non-loopback binds.
  - Per-request key mode (no startup key) now rejects requests without an `x-api-key` header with 401.
  - Stateful HTTP mode keeps one session per client; previously only the first client could ever connect.

  Breaking: clients connecting from another machine or container must now start the server with `--host 0.0.0.0` and an auth token. Reported by Syed Anas Mohiuddin.

## 0.3.2

### Patch Changes

- 068b206: Add xrp, solana, and tezos to `broadcast_signed_transaction`'s supported blockchains (BL-0196) — the spec's `/broadcast-transactions/{blockchain}/{network}` enum has 18 chains, only 15 were wired.

  Also fixed the per-blockchain credit costs in this tool, which were stale for every chain (e.g. ethereum was hardcoded at 120 credits; the live API charges 50, matching the spec's `x-blockchain-specific-cost` field — verified against real API calls for several chains).

  Corrected `mcp-shared`'s `system_info` broadcast product-availability data: it listed `kaspa` as broadcastable, which is wrong — kaspa is absent from the spec's broadcast blockchain enum entirely.

- c30c9b1: Fix `simulate_evm`: remove the misleading `blockchain` parameter and narrow `network`.

  The underlying OpenAPI endpoint's path is literally `/simulate-transactions/evm/ethereum/{network}` — Ethereum-only, not a `{blockchain}` template. The tool schema previously exposed a 9-chain `blockchain` enum (ethereum, ethereum-classic, binance-smart-chain, tron, polygon, avalanche, arbitrum, base, optimism) that was validated, logged, and then silently discarded — a call with `blockchain: "polygon"` was actually simulating on Ethereum the whole time, with no error or warning (BL-0197).

  `network` is narrowed from a 7-value enum to the two the endpoint actually supports: `mainnet`, `sepolia`.

  `mcp-shared`'s `system_info` simulate product-availability data corrected to match (Ethereum-only).

## 0.3.1

### Patch Changes

- cdb2c1f: Add Solana, Kaspa, XRP, generic UTXO, and Tron prepare-transactions.

  `prepare_transactions_solana` — `native-coins`, `spl-tokens`.
  `prepare_transactions_kaspa` — `native-coins` (multi-recipient, mainnet-only).
  `prepare_transactions_xrp` — `native-coins`.
  `prepare_transactions_utxo` — `native-coins` across bitcoin, bitcoin-cash, litecoin, dogecoin, dash, zcash (multi-recipient, requires `feePriority` or `exactFee`).
  `prepare_transactions_tron` — `native-coins`, `trc20-tokens`, `non-fungible-tokens`, via Tron's dedicated prepare-transactions endpoints (distinct from the generic EVM ones).

  Kaspa and UTXO both take a `recipients: [{address, amount}]` array (multiple outputs in one transaction), matching the underlying API rather than the single `toAddress`/`amount` pair used elsewhere. Tron uses `sender`/`recipient`/`contract` field names per its own API convention, distinct from every other domain's `fromAddress`/`toAddress`/`contractAddress`.

  `mcp-shared` gains `utxo` and expanded `other` entries in `system_info`'s `prepare-transactions` product-availability data.

- cdb2c1f: Add `blockchain_fees_solana` — fee recommendations and compute-unit estimation for Solana.

  - `get-fee-recommendations` — current priority fee recommendations from the mempool
  - `estimate-native-coin-transfer-compute-units` — compute units for a native SOL transfer
  - `estimate-token-transfer-compute-units` — compute units for an SPL token transfer
  - `estimate-program-invocation-compute-units` — compute units for an arbitrary program instruction call

  Solana uses compute units, not gas — a distinct response shape from the EVM/UTXO gas-limit estimators, so this is a dedicated tool rather than folded into an existing one.

  Note: Tron's dedicated mempool fee path (`/blockchain-fees/evm/tron/{network}/mempool`) was already reachable via the existing `blockchain_fees_evm` tool's `get-fee-recommendations` action — the generic EVM URL template happens to match the dedicated Tron path exactly, so no changes were needed there (verified live).

  `mcp-shared` gains a `solana` entry in `system_info`'s `blockchain-fees` product-availability data.

- cdb2c1f: Add Tezos support to `mcp-blockchain-fees` and `mcp-prepare-transactions`.

  New `blockchain_fees_tezos` tool (`mcp-blockchain-fees`):

  - `get-fee-recommendations` — current minimal fee/cost rates from the mempool
  - `estimate-transfer` — fee estimate for a native XTZ transfer
  - `estimate-fa12-transfer` — fee estimate for an FA1.2 token transfer
  - `estimate-fa2-transfer` — fee estimate for an FA2 token transfer

  New `prepare_transactions_tezos` tool (`mcp-prepare-transactions`):

  - `native-coins` — unsigned native XTZ transfer
  - `fa1-2-tokens` — unsigned FA1.2 token transfer
  - `fa2-tokens` — unsigned FA2 token transfer

  `mcp-shared` gains a `tezos` entry in `system_info`'s blockchain list, product-availability data, and denominations.

## 0.3.0

### Minor Changes

- Add MCP logging, resources, and prompts across all packages. Add debug-level tool call logging, replace console.error with McpLogger, remove .refine() from schemas for MCP client compatibility, and fix supply-chain vulnerabilities.

## 0.2.3

### Patch Changes

- Fix supply-chain vulnerabilities: update @modelcontextprotocol/sdk to ^1.27.1, express to ^4.22.1, add security warning to signer tool descriptions

## 0.2.2

### Patch Changes

- Add MCP Registry metadata (mcpName, server.json)

## 0.2.1

### Patch Changes

- Rename Hosted MCP Server to Remote MCP Server in documentation

## 0.2.0

### Minor Changes

- Add User-Agent and x-source headers to identify MCP traffic
