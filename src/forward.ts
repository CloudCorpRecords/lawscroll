/**
 * lawscroll core: a forwarding client for the hosted
 * lawbotter MCP server (a Chinese legal corpus of
 * regulations and cases).
 *
 * No legal corpus lives on this machine. tools/list is
 * answered from the literal definitions below, which
 * reproduce a live capture of the upstream server word
 * for word (name, title, description and inputSchema
 * exactly as captured, including the `$schema` marker
 * and `additionalProperties: false` each captured
 * inputSchema carries, and the Chinese description and
 * schema text verbatim). A tools/call travels upstream
 * over a streamable-HTTP JSON-RPC session: an
 * initialize POST, a notifications/initialized POST,
 * then the tools/call POST, carrying the
 * Mcp-Session-Id response header on later requests
 * when the upstream issues one. The session opens
 * lazily on the first forwarded call and is reused for
 * the client's lifetime.
 *
 * The full captured surface is built: all 5 tools, no
 * omissions. The two AI-engine tools
 * (`lawbotter_law_query`, `lawbotter_legal_consult`)
 * answer from the corpus with statute citations and
 * report an anonymous usage quota; they route nothing
 * to any human and submit nothing.
 *
 * The endpoint is pinned to https://lawbotter.com/mcp
 * and may be replaced with the LAWBOTTER_MCP_URL
 * environment variable (that override is a labelled
 * reconstruction). The registry record declares NO
 * headers on the remote: no auth header is ever sent,
 * under any environment.
 *
 * A successful upstream result is returned exactly as
 * received, isError flag and extra fields included.
 * Failures — an upstream JSON-RPC error, a non-2xx
 * status, a body that cannot be parsed, or a fetch
 * that throws or times out — become an isError result
 * whose text begins with `lawscroll error:` (that
 * rendering is a labelled reconstruction). Replies may
 * be plain JSON or SSE (`data:` lines); the JSON-RPC
 * message whose id matches the request wins.
 */
import type {
  FetchFn,
  FetchResponseLike,
  ForwardDeps,
  ToolArgs,
  ToolDef,
  ToolResult,
} from "./types.js";

export const VERSION = "0.1.0";

export const DEFAULT_ENDPOINT_URL = "https://lawbotter.com/mcp";

export const DEFAULT_TIMEOUT_MS = 30000;

export const PROTOCOL_VERSION = "2025-03-26";

/* ------------------------------------------------------------------ */
/* Tool definitions (tools/list literals, verbatim from the live       */
/* capture in harness/fixtures/lawbotter-tools-original.json;          */
/* generated programmatically by parsing and re-serialising the        */
/* fixture JSON, never retyped)                                        */
/* ------------------------------------------------------------------ */

// TOOL_DEFS_GENERATED_START
export const TOOL_DEFS: ToolDef[] = [
    {
      "name": "lawbotter_regulations_search",
      "title": "法老在线·法规检索",
      "description": "在法老在线自建法律法规数据库（国家法律/司法解释/行政法规/部门规章）中检索法规。返回法规列表，包含 law_name（法规名称）、law_category（法规类别）、issuing_body（发布机关）、effective_date（生效日期）、status（效力状态，如 现行有效/已废止）等字段。参数：q（检索关键词，必填，如“民法典”“劳动争议”）；category（可选，法规类别过滤）；mode（可选，检索模式 all=全文/title=标题/content=正文，默认 all）；limit（可选，返回条数，默认 20，最大 100）；offset（可选，偏移量，默认 0，用于分页）。注意：检索结果用于确认法规是否存在及基本属性；如需具体条文内容请使用 lawbotter_law_query。",
      "inputSchema": {
        "type": "object",
        "properties": {
          "q": {
            "type": "string",
            "description": "检索关键词，如“民法典”“劳动争议”“工伤”"
          },
          "category": {
            "type": "string",
            "description": "法规类别过滤（可选），如“法律”“司法解释”“行政法规”“部门规章”"
          },
          "mode": {
            "type": "string",
            "enum": [
              "all",
              "title",
              "content"
            ],
            "description": "检索模式：all=全文，title=标题，content=正文（默认 all）"
          },
          "limit": {
            "type": "integer",
            "minimum": 1,
            "maximum": 100,
            "description": "返回条数，默认 20，最大 100"
          },
          "offset": {
            "type": "integer",
            "minimum": 0,
            "description": "分页偏移量，默认 0"
          }
        },
        "required": [
          "q"
        ],
        "additionalProperties": false,
        "$schema": "http://json-schema.org/draft-07/schema#"
      }
    },
    {
      "name": "lawbotter_regulations_detail",
      "title": "法老在线·法规详情",
      "description": "根据法规 ID 获取法老在线数据库中单部法规的详细信息（含条文内容）。ID 可通过 lawbotter_regulations_search 检索结果的 id 字段获得。参数：id（必填，法规 ID，字符串）。注意：本工具返回的是数据库中的法规原文/详情，具有可追溯性；若需 AI 解读请使用 lawbotter_law_query。",
      "inputSchema": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "description": "法规 ID（来自法规检索结果的 id 字段）"
          }
        },
        "required": [
          "id"
        ],
        "additionalProperties": false,
        "$schema": "http://json-schema.org/draft-07/schema#"
      }
    },
    {
      "name": "lawbotter_law_query",
      "title": "法老在线·AI 法规查询",
      "description": "向法老在线 AI 引擎发起法规查询：基于自建法律法规数据库（国家法律/司法解释/行政法规/部门规章）检索并生成带法条依据的回答。参数：keyword（必填，查询关键词/问题，如“劳动合同 试用期 辞退”）。返回：sessionId（会话 ID，可用于 lawbotter_followup 追问）、content（AI 回答正文）、usageStatus（匿名额度信息）。注意：回答基于数据库检索结果生成，若内容为空或不确定，应如实告知用户；匿名调用有限额（usageStatus.remaining 可查看剩余次数）。",
      "inputSchema": {
        "type": "object",
        "properties": {
          "keyword": {
            "type": "string",
            "description": "查询关键词或法律问题，如“劳动合同 试用期 辞退”"
          }
        },
        "required": [
          "keyword"
        ],
        "additionalProperties": false,
        "$schema": "http://json-schema.org/draft-07/schema#"
      }
    },
    {
      "name": "lawbotter_legal_consult",
      "title": "法老在线·法律咨询",
      "description": "向法老在线 AI 法律顾问发起一对一咨询，由多模型 AI 竞速引擎生成法律建议与依据分析。参数：question（必填，法律问题，如“试用期被辞退有经济补偿吗？”）。返回：sessionId（会话 ID，可用于 lawbotter_followup 追问）、answer（AI 咨询回答正文）、usageStatus（匿名额度信息）。注意：AI 咨询结果仅作参考，不构成正式法律意见；涉及具体案件建议咨询执业律师。",
      "inputSchema": {
        "type": "object",
        "properties": {
          "question": {
            "type": "string",
            "description": "法律咨询问题，如“试用期被辞退有经济补偿吗？”"
          }
        },
        "required": [
          "question"
        ],
        "additionalProperties": false,
        "$schema": "http://json-schema.org/draft-07/schema#"
      }
    },
    {
      "name": "lawbotter_followup",
      "title": "法老在线·会话追问",
      "description": "基于 lawbotter_law_query 或 lawbotter_legal_consult 返回的 sessionId 进行追问，延续之前的 AI 法规查询/法律咨询会话。参数：sessionId（必填，来自 query/consult 返回的 sessionId）；question（必填，追问内容）。",
      "inputSchema": {
        "type": "object",
        "properties": {
          "sessionId": {
            "type": "string",
            "description": "会话 ID（来自 lawbotter_law_query / lawbotter_legal_consult 返回的 sessionId）"
          },
          "question": {
            "type": "string",
            "description": "追问的问题内容"
          }
        },
        "required": [
          "sessionId",
          "question"
        ],
        "additionalProperties": false,
        "$schema": "http://json-schema.org/draft-07/schema#"
      }
    }
  ];
// TOOL_DEFS_GENERATED_END

export const TOOL_NAMES = TOOL_DEFS.map((t) => t.name);

/** Whether `name` belongs to the captured surface. */
export function isKnownTool(name: string): boolean {
  return TOOL_NAMES.includes(name);
}

/* ------------------------------------------------------------------ */
/* Forwarding client                                                   */
/* ------------------------------------------------------------------ */

function errorResult(detail: string): ToolResult {
  return {
    content: [{ type: "text", text: `lawscroll error: ${detail}` }],
    isError: true,
  };
}

function rpcErrorMessage(error: unknown): string {
  if (error !== null && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message !== "") return message;
    return JSON.stringify(error);
  }
  return String(error);
}

/**
 * Read a JSON-RPC response body, tolerating SSE framing.
 * Returns the message whose id matches `expectedId` when
 * present, otherwise the last parseable message, otherwise
 * null when nothing in the body parses.
 */
export function parseRpcBody(
  text: string,
  expectedId?: number,
): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  const candidates: Record<string, unknown>[] = [];
  const tryPush = (payload: string): void => {
    try {
      const parsed: unknown = JSON.parse(payload);
      if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
        candidates.push(parsed as Record<string, unknown>);
      }
    } catch {
      // Not a JSON payload; skip this candidate.
    }
  };
  if (trimmed.includes("data:")) {
    for (const line of trimmed.split("\n")) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const payload = t.slice("data:".length).trim();
      if (payload !== "" && payload !== "[DONE]") tryPush(payload);
    }
  } else {
    tryPush(trimmed);
  }
  if (candidates.length === 0) return null;
  if (expectedId !== undefined) {
    const match = candidates.find((c) => c.id === expectedId);
    if (match !== undefined) return match;
  }
  return candidates[candidates.length - 1];
}

async function defaultFetch(
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
): Promise<FetchResponseLike> {
  return fetch(url, init) as unknown as FetchResponseLike;
}

/**
 * A forwarding client holding a single upstream session,
 * opened lazily on first use and reused from then on
 * (for the process lifetime in the MCP server, or for a
 * single invocation in the CLI).
 */
export class LawscrollClient {
  private readonly deps: ForwardDeps;
  private sessionId: string | null = null;
  private ready = false;
  private sessionPromise: Promise<void> | null = null;
  private idCounter = 0;

  constructor(deps: ForwardDeps = {}) {
    this.deps = deps;
  }

  private fetchFn(): FetchFn {
    return this.deps.fetchFn ?? defaultFetch;
  }

  private endpointUrl(): string {
    if (this.deps.url && this.deps.url.trim() !== "") return this.deps.url.trim();
    const raw = (this.deps.env ?? process.env).LAWBOTTER_MCP_URL;
    if (raw && raw.trim() !== "") return raw.trim();
    return DEFAULT_ENDPOINT_URL;
  }

  private timeoutMs(): number {
    if (typeof this.deps.timeoutMs === "number" && this.deps.timeoutMs > 0) {
      return this.deps.timeoutMs;
    }
    return DEFAULT_TIMEOUT_MS;
  }

  private nextId(): number {
    this.idCounter += 1;
    return this.idCounter;
  }

  private async post(
    body: unknown,
    withSession: boolean,
  ): Promise<FetchResponseLike> {
    // The registry record declares NO headers on the remote:
    // no Authorization (or any other auth) header is ever sent.
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    };
    if (withSession && this.sessionId !== null) {
      headers["Mcp-Session-Id"] = this.sessionId;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs());
    try {
      return await this.fetchFn()(this.endpointUrl(), {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private async ensureSession(): Promise<void> {
    if (this.ready) return;
    if (this.sessionPromise === null) {
      this.sessionPromise = (async () => {
        const initId = this.nextId();
        const initRes = await this.post(
          {
            jsonrpc: "2.0",
            id: initId,
            method: "initialize",
            params: {
              protocolVersion: PROTOCOL_VERSION,
              capabilities: {},
              clientInfo: { name: "lawscroll", version: VERSION },
            },
          },
          false,
        );
        const sessionId = initRes.headers.get("mcp-session-id");
        if (sessionId) this.sessionId = sessionId;
        const initText = await initRes.text();
        const initParsed = parseRpcBody(initText, initId);
        if (initParsed !== null && initParsed.error) {
          throw new Error(rpcErrorMessage(initParsed.error));
        }
        if (initRes.status < 200 || initRes.status >= 300) {
          throw new Error(`HTTP ${initRes.status}`);
        }
        if (initParsed === null && initText.trim() !== "") {
          throw new Error("malformed response");
        }
        const initializedRes = await this.post(
          { jsonrpc: "2.0", method: "notifications/initialized" },
          true,
        );
        try {
          await initializedRes.text();
        } catch {
          // Nothing needed from the notification response body.
        }
        this.ready = true;
      })();
    }
    try {
      await this.sessionPromise;
    } catch (err) {
      this.sessionPromise = null;
      this.sessionId = null;
      throw err;
    }
  }

  /** Forward one tool call; upstream failures come back as isError results. */
  async callTool(name: string, args: ToolArgs): Promise<ToolResult> {
    try {
      await this.ensureSession();
    } catch (err) {
      return errorResult(err instanceof Error ? err.message : String(err));
    }

    const callId = this.nextId();
    let callRes: FetchResponseLike;
    try {
      callRes = await this.post(
        {
          jsonrpc: "2.0",
          id: callId,
          method: "tools/call",
          params: { name, arguments: args ?? {} },
        },
        true,
      );
    } catch (err) {
      return errorResult(
        `request failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const parsed = parseRpcBody(await callRes.text(), callId);
    if (parsed !== null && parsed.error) {
      return errorResult(rpcErrorMessage(parsed.error));
    }
    if (callRes.status < 200 || callRes.status >= 300) {
      return errorResult(`HTTP ${callRes.status}`);
    }
    if (parsed === null) return errorResult("malformed response");
    const result = parsed.result as ToolResult | undefined;
    if (result === undefined || result === null || typeof result !== "object") {
      return errorResult("malformed response");
    }
    // Hand the upstream result back exactly as received.
    return result;
  }
}

/** Build a forwarding client; tests inject a fake fetch and env through deps. */
export function createClient(deps: ForwardDeps = {}): LawscrollClient {
  return new LawscrollClient(deps);
}

/** One-shot helper: a fresh client for a single call (the CLI path). */
export async function callTool(
  name: string,
  args: ToolArgs,
  deps: ForwardDeps = {},
): Promise<ToolResult> {
  return new LawscrollClient(deps).callTool(name, args);
}
