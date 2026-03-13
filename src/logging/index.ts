/**
 * Shared MCP logger for all CryptoAPIs MCP servers.
 *
 * Wraps the MCP SDK's `sendLoggingMessage` in a fire-and-forget pattern
 * so tool handlers can log without blocking responses.
 *
 * Usage in server.ts:
 *   const logger = new McpLogger((params) => server.sendLoggingMessage(params), "cryptoapis-<product>");
 *   // pass `logger` to tool handlers
 */

/** Logging levels supported by the MCP protocol. */
export type McpLogLevel = "debug" | "info" | "notice" | "warning" | "error" | "critical" | "alert" | "emergency";

/** Callback matching McpServer.sendLoggingMessage signature. */
export type LogSender = (params: { level: McpLogLevel; logger?: string; data: unknown }) => Promise<void>;

export class McpLogger {
    constructor(
        private readonly send: LogSender,
        private readonly serverName: string,
    ) {}

    /** Log at debug level (e.g. incoming requests, input params). Fire-and-forget. */
    logDebug(data: unknown): void {
        this.emit("debug", data);
    }

    /** Log at info level. Fire-and-forget. */
    logInfo(data: unknown): void {
        this.emit("info", data);
    }

    /** Log a warning (e.g. low credits, rate limit). Fire-and-forget. */
    logWarning(message: string, data?: unknown): void {
        this.emit("warning", { message, ...(data != null ? { details: data } : {}) });
    }

    /** Log an error. Fire-and-forget. */
    logError(message: string, data?: unknown): void {
        this.emit("error", { message, ...(data != null ? { details: data } : {}) });
    }

    private emit(level: McpLogLevel, data: unknown): void {
        this.send({ level, logger: this.serverName, data }).catch(() => {
            // Fire-and-forget: swallow send failures silently.
            // Logging must never break tool execution.
        });
    }
}
