// Tests for the shared Streamable HTTP bootstrap (startHttpServer): who may call the server.
// Run: pnpm --filter @cryptoapis-io/mcp-shared test   (needs a build: tests import dist/)

import { test } from "node:test";
import assert from "node:assert/strict";
import { request } from "node:http";
import { networkInterfaces } from "node:os";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiKeyStore, httpStartupError, isLoopbackHost, parseHttpCliOptions, startHttpServer } from "../dist/index.js";

const TOKEN = "t0ken-for-tests-0123456789";
const INIT = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1" } },
};

/** A tiny MCP server with one tool that reports which API key it would bill. */
function createServer() {
    const server = new McpServer({ name: "test-server", version: "0.0.0" });
    server.registerTool("whoami", { description: "echo the effective api key" }, async () => ({
        content: [{ type: "text", text: apiKeyStore.getStore() ?? "startup-key" }],
    }));
    return server;
}

function lanAddress() {
    for (const list of Object.values(networkInterfaces())) {
        for (const a of list ?? []) if (a.family === "IPv4" && !a.internal) return a.address;
    }
    return undefined;
}

async function start(opts) {
    const server = await startHttpServer({ name: "test", createServer, port: 0, log: () => {}, ...opts });
    const { port } = server.address();
    return { server, port, close: () => new Promise((r) => server.close(r)) };
}

/** POST over node:http (unlike fetch, it sends a caller-supplied Host header as given). */
function post(url, body, headers = {}) {
    const payload = JSON.stringify(body);
    return new Promise((resolve, reject) => {
        const req = request(
            url,
            {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    accept: "application/json, text/event-stream",
                    "content-length": Buffer.byteLength(payload),
                    ...headers,
                },
            },
            (res) => {
                let text = "";
                res.setEncoding("utf8");
                res.on("data", (c) => (text += c));
                res.on("end", () => {
                    const data = text.startsWith("event:") ? JSON.parse(text.split("\ndata: ")[1]) : text ? JSON.parse(text) : null;
                    resolve({ status: res.statusCode, sessionId: res.headers["mcp-session-id"] ?? null, data });
                });
            },
        );
        req.on("error", reject);
        req.end(payload);
    });
}

/** initialize + initialized + tools/call whoami; returns the tool's text. */
async function callWhoami(url, headers = {}) {
    const init = await post(url, INIT, headers);
    assert.equal(init.status, 200, JSON.stringify(init.data));
    const h = { ...headers, ...(init.sessionId ? { "mcp-session-id": init.sessionId } : {}), "mcp-protocol-version": "2025-06-18" };
    await post(url, { jsonrpc: "2.0", method: "notifications/initialized" }, h);
    const call = await post(url, { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "whoami", arguments: {} } }, h);
    return call.data.result.content[0].text;
}

test("binds 127.0.0.1 by default — unreachable from the LAN address", async (t) => {
    const lan = lanAddress();
    if (!lan) return t.skip("no non-loopback IPv4 interface");
    const s = await start({ startupApiKey: "OPERATOR" });
    try {
        assert.equal(s.server.address().address, "127.0.0.1");
        await assert.rejects(fetch(`http://${lan}:${s.port}/health`));
    } finally {
        await s.close();
    }
});

test("refuses a non-loopback bind with a startup key and no auth token", async () => {
    await assert.rejects(start({ host: "0.0.0.0", startupApiKey: "OPERATOR" }), /refusing to listen on 0\.0\.0\.0/);
    assert.match(httpStartupError({ host: "0.0.0.0", startupApiKey: "k" }), /MCP_AUTH_TOKEN/);
    assert.equal(httpStartupError({ host: "127.0.0.1", startupApiKey: "k" }), undefined);
    assert.equal(httpStartupError({ host: "0.0.0.0" }), undefined, "per-request key mode needs no token");
    assert.match(httpStartupError({ host: "0.0.0.0", startupApiKey: "k", authToken: "short" }), /at least 16/);
});

test("non-loopback bind with a token: no/wrong bearer is 401, right bearer is served", async () => {
    const s = await start({ host: "0.0.0.0", startupApiKey: "OPERATOR", authToken: TOKEN });
    const url = `http://127.0.0.1:${s.port}/mcp`;
    try {
        const none = await post(url, INIT);
        assert.equal(none.status, 401);
        const wrong = await post(url, INIT, { authorization: "Bearer not-the-token-at-all!" });
        assert.equal(wrong.status, 401);
        assert.equal(await callWhoami(url, { authorization: `Bearer ${TOKEN}` }), "startup-key");
    } finally {
        await s.close();
    }
});

test("health stays open without auth", async () => {
    const s = await start({ host: "0.0.0.0", startupApiKey: "OPERATOR", authToken: TOKEN });
    try {
        const res = await fetch(`http://127.0.0.1:${s.port}/health`);
        assert.equal(res.status, 200);
    } finally {
        await s.close();
    }
});

test("per-request key mode: no x-api-key is 401, the caller's own key is used", async () => {
    const s = await start({ host: "0.0.0.0" });
    const url = `http://127.0.0.1:${s.port}/mcp`;
    try {
        assert.equal((await post(url, INIT)).status, 401);
        assert.equal(await callWhoami(url, { "x-api-key": "CALLER-KEY" }), "CALLER-KEY");
    } finally {
        await s.close();
    }
});

test("startup-key mode ignores a caller's x-api-key", async () => {
    const s = await start({ startupApiKey: "OPERATOR" });
    try {
        assert.equal(await callWhoami(`http://127.0.0.1:${s.port}/mcp`, { "x-api-key": "CALLER-KEY" }), "startup-key");
    } finally {
        await s.close();
    }
});

test("loopback bind rejects a foreign Host header (DNS rebinding)", async () => {
    const s = await start({ startupApiKey: "OPERATOR" });
    try {
        const res = await post(`http://127.0.0.1:${s.port}/mcp`, INIT, { host: "evil.example" });
        assert.equal(res.status, 403);
    } finally {
        await s.close();
    }
});

test("--allowed-hosts restricts the Host header on a non-loopback bind", async () => {
    const s = await start({ host: "0.0.0.0", startupApiKey: "OPERATOR", authToken: TOKEN, allowedHosts: ["mcp.internal"] });
    const url = `http://127.0.0.1:${s.port}/mcp`;
    try {
        const auth = { authorization: `Bearer ${TOKEN}` };
        assert.equal((await post(url, INIT, auth)).status, 403);
        assert.equal((await post(url, INIT, { ...auth, host: "mcp.internal" })).status, 200);
    } finally {
        await s.close();
    }
});

test("stateful mode serves more than one client session", async () => {
    const s = await start({ startupApiKey: "OPERATOR" });
    const url = `http://127.0.0.1:${s.port}/mcp`;
    try {
        const a = await post(url, INIT);
        const b = await post(url, INIT);
        assert.equal(a.status, 200);
        assert.equal(b.status, 200, "second client must be able to initialize");
        assert.notEqual(a.sessionId, b.sessionId);
        assert.equal((await post(url, { jsonrpc: "2.0", id: 9, method: "tools/list" }, { "mcp-session-id": "nope" })).status, 404);
    } finally {
        await s.close();
    }
});

test("stateless mode serves independent requests", async () => {
    const s = await start({ startupApiKey: "OPERATOR", stateless: true });
    try {
        assert.equal(await callWhoami(`http://127.0.0.1:${s.port}/mcp`), "startup-key");
        assert.equal(await callWhoami(`http://127.0.0.1:${s.port}/mcp`), "startup-key");
    } finally {
        await s.close();
    }
});

test("parseHttpCliOptions: loopback default, token from env, allowed hosts list", () => {
    const d = parseHttpCliOptions(["node", "cli"], {});
    assert.equal(d.host, "127.0.0.1");
    assert.equal(d.authToken, undefined);
    const o = parseHttpCliOptions(
        ["node", "cli", "--host", "0.0.0.0", "--port", "4000", "--allowed-hosts", "a.local, b.local", "--stateless"],
        { MCP_AUTH_TOKEN: TOKEN },
    );
    assert.deepEqual(o, { host: "0.0.0.0", port: 4000, path: "/mcp", stateless: true, authToken: TOKEN, allowedHosts: ["a.local", "b.local"] });
    assert.equal(parseHttpCliOptions(["node", "cli", "--auth-token", "from-flag-000000000"], { MCP_AUTH_TOKEN: TOKEN }).authToken, "from-flag-000000000");
    assert.ok(isLoopbackHost("127.0.0.2") && isLoopbackHost("::1") && !isLoopbackHost("0.0.0.0"));
});
