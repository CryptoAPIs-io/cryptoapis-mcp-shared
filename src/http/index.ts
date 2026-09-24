/**
 * Shared Streamable HTTP bootstrap for all CryptoAPIs MCP servers.
 *
 * Every package used to carry its own copy of this, and every copy bound 0.0.0.0 and
 * served anyone who could reach the port with the operator's startup API key. This is the
 * one place that decides who may call the server:
 *
 * - Binds 127.0.0.1 by default. Loopback binds get DNS rebinding protection (Host header
 *   check), as the MCP spec requires for local Streamable HTTP servers.
 * - A non-loopback bind (e.g. `--host 0.0.0.0` for Docker) with a startup API key refuses to
 *   start unless an auth token is set; callers then need `Authorization: Bearer <token>`.
 * - Without a startup key (per-request key mode) every MCP request must carry `x-api-key`,
 *   so callers only ever spend their own credits.
 * - Stateful mode keeps one transport + server per session, so more than one client can
 *   connect (a single shared transport accepted exactly one session, ever).
 */

import { randomUUID, timingSafeEqual } from "node:crypto";
import type { Server } from "node:http";
import express from "express";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { hostHeaderValidation, localhostHostValidation } from "@modelcontextprotocol/sdk/server/middleware/hostHeaderValidation.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { runWithApiKey } from "../request-context/index.js";

export const DEFAULT_HTTP_HOST = "127.0.0.1";
export const AUTH_TOKEN_ENV = "MCP_AUTH_TOKEN";

export type HttpServerOptions = {
    /** Server name, used in startup logs (e.g. "cryptoapis-blockchain-fees"). */
    name: string;
    /** Builds a fresh McpServer. Called once per session (stateful) or per request (stateless). */
    createServer: () => McpServer;
    /** API key given at startup. When set, callers are served with it and must authenticate. */
    startupApiKey?: string;
    host?: string;
    port?: number;
    path?: string;
    stateless?: boolean;
    /** Bearer token callers must present. Required for a non-loopback bind with a startup key. */
    authToken?: string;
    /** Host header allowlist (DNS rebinding protection) for non-loopback binds. */
    allowedHosts?: string[];
    /** Where startup lines go. Defaults to stderr (stdout is left alone). */
    log?: (line: string) => void;
};

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

/** True when `host` only accepts connections from this machine. */
export function isLoopbackHost(host: string): boolean {
    return LOOPBACK_HOSTS.has(host) || /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host);
}

/** Constant-time check of an `Authorization: Bearer <token>` header. */
function bearerMatches(header: string | undefined, token: string): boolean {
    const match = /^Bearer\s+(.+)$/i.exec(header ?? "");
    if (!match) return false;
    const given = Buffer.from((match[1] ?? "").trim());
    const expected = Buffer.from(token);
    return given.length === expected.length && timingSafeEqual(given, expected);
}

function jsonRpcError(res: express.Response, status: number, message: string) {
    res.status(status).json({ jsonrpc: "2.0", error: { code: -32000, message }, id: null });
}

/**
 * Validate the options and return the error to refuse startup with, if any. Exported so the
 * rule is testable without opening a socket.
 */
export function httpStartupError(opts: Pick<HttpServerOptions, "host" | "startupApiKey" | "authToken">): string | undefined {
    const host = opts.host ?? DEFAULT_HTTP_HOST;
    if (opts.authToken !== undefined && opts.authToken.trim().length < 16) {
        return "the auth token must be at least 16 characters";
    }
    if (!isLoopbackHost(host) && opts.startupApiKey && !opts.authToken) {
        return (
            `refusing to listen on ${host} with a startup API key and no auth token: anyone who can reach ` +
            `this port would spend your CryptoAPIs credits. Set ${AUTH_TOKEN_ENV} (or --auth-token) and have ` +
            `clients send "Authorization: Bearer <token>", or drop --api-key so each client sends its own x-api-key.`
        );
    }
    return undefined;
}

/**
 * Start the Streamable HTTP transport. Resolves with the listening Node server.
 * Throws (before binding) when the options would expose the startup key unauthenticated.
 */
export async function startHttpServer(opts: HttpServerOptions): Promise<Server> {
    const host = opts.host ?? DEFAULT_HTTP_HOST;
    const port = opts.port ?? 3000;
    const path = opts.path ?? "/mcp";
    const stateless = opts.stateless ?? false;
    const log = opts.log ?? ((line: string) => process.stderr.write(`${line}\n`));

    const refusal = httpStartupError({ host, startupApiKey: opts.startupApiKey, authToken: opts.authToken });
    if (refusal) {
        throw new Error(`${opts.name}: ${refusal}`);
    }

    const app = express();
    app.use(express.json({ limit: "1mb" }));
    // Health stays reachable without auth for load balancers; it reveals nothing.
    app.get("/health", (_req, res) => res.status(200).json({ ok: true }));

    if (opts.allowedHosts && opts.allowedHosts.length > 0) {
        app.use(path, hostHeaderValidation(opts.allowedHosts));
    } else if (isLoopbackHost(host)) {
        app.use(path, localhostHostValidation());
    }

    if (opts.authToken) {
        const token = opts.authToken.trim();
        app.use(path, (req, res, next) => {
            if (bearerMatches(req.headers.authorization, token)) return next();
            res.setHeader("WWW-Authenticate", 'Bearer realm="mcp"');
            jsonRpcError(res, 401, "Unauthorized: missing or invalid bearer token");
        });
    }

    // Per-request key mode: never run a tool call without the caller's own key.
    if (!opts.startupApiKey) {
        app.use(path, (req, res, next) => {
            if (req.method === "DELETE" || typeof req.headers["x-api-key"] === "string") return next();
            jsonRpcError(res, 401, "Unauthorized: send your CryptoAPIs API key in the x-api-key header");
        });
    }

    const withCallerKey = (req: express.Request, fn: () => Promise<void>) => {
        const headerApiKey = req.headers["x-api-key"];
        return !opts.startupApiKey && typeof headerApiKey === "string" ? runWithApiKey(headerApiKey, fn) : fn();
    };

    if (stateless) {
        app.all(path, async (req, res) => {
            const server = opts.createServer();
            const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
            res.on("close", () => {
                void transport.close();
                void server.close();
            });
            await server.connect(transport);
            await withCallerKey(req, () => transport.handleRequest(req, res, req.body));
        });
    } else {
        const sessions = new Map<string, StreamableHTTPServerTransport>();
        app.all(path, async (req, res) => {
            const sessionId = req.headers["mcp-session-id"];
            let transport = typeof sessionId === "string" ? sessions.get(sessionId) : undefined;

            if (!transport) {
                if (sessionId !== undefined) {
                    return jsonRpcError(res, 404, "Session not found");
                }
                if (req.method !== "POST" || !isInitializeRequest(req.body)) {
                    return jsonRpcError(res, 400, "Bad Request: no valid session ID provided");
                }
                const server = opts.createServer();
                const created = new StreamableHTTPServerTransport({
                    sessionIdGenerator: () => randomUUID(),
                    onsessioninitialized: (id) => {
                        sessions.set(id, created);
                    },
                });
                created.onclose = () => {
                    if (created.sessionId) sessions.delete(created.sessionId);
                    void server.close();
                };
                await server.connect(created);
                transport = created;
            }

            const active = transport;
            await withCallerKey(req, () => active.handleRequest(req, res, req.body));
        });
    }

    return new Promise<Server>((resolve, reject) => {
        const listener = app.listen(port, host, () => {
            log(`${opts.name} MCP running (http) at http://${host}:${port}${path}`);
            log(
                opts.startupApiKey
                    ? "API key: provided at startup — x-api-key request headers are ignored"
                    : "API key: not provided — every request must include an x-api-key header",
            );
            log(
                opts.authToken
                    ? "Caller auth: Authorization: Bearer <token> required"
                    : "Caller auth: none (loopback only)",
            );
            if (!isLoopbackHost(host) && !opts.allowedHosts?.length) {
                log("Warning: no --allowed-hosts set, so the Host header is not checked (DNS rebinding).");
            }
            resolve(listener);
        });
        listener.on("error", reject);
    });
}

export type HttpCliOptions = {
    host: string;
    port: number;
    path: string;
    stateless: boolean;
    authToken?: string;
    allowedHosts?: string[];
};

/**
 * Parse the shared HTTP flags: --host, --port, --path, --stateless, --auth-token,
 * --allowed-hosts (comma-separated). The token also comes from MCP_AUTH_TOKEN, which is the
 * better place for it (command-line arguments are visible in the process list).
 */
export function parseHttpCliOptions(argv: string[] = process.argv, env: NodeJS.ProcessEnv = process.env): HttpCliOptions {
    const arg = (name: string) => {
        const idx = argv.indexOf(`--${name}`);
        return idx === -1 ? undefined : argv[idx + 1];
    };
    const allowedHosts = arg("allowed-hosts")
        ?.split(",")
        .map((h) => h.trim())
        .filter(Boolean);
    return {
        host: arg("host") ?? DEFAULT_HTTP_HOST,
        port: Number(arg("port") ?? "3000"),
        path: arg("path") ?? "/mcp",
        stateless: argv.includes("--stateless"),
        authToken: arg("auth-token") ?? (env[AUTH_TOKEN_ENV] || undefined),
        allowedHosts: allowedHosts && allowedHosts.length > 0 ? allowedHosts : undefined,
    };
}
