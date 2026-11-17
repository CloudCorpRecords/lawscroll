# Changelog

## 0.1.0 (2026-10-28)

- First release: a forwarding client for the hosted lawbotter MCP server (a Chinese legal corpus of regulations and cases). All five captured tools are answered locally for tools/list, and every tools/call is forwarded upstream over a streamable-HTTP JSON-RPC session (initialize, notifications/initialized, tools/call, honouring the Mcp-Session-Id header when the upstream issues one).
- Tools: `lawbotter_regulations_search`, `lawbotter_regulations_detail`, `lawbotter_law_query`, `lawbotter_legal_consult`, `lawbotter_followup` — the full captured surface, no omissions. Tool descriptions and input schemas are served verbatim from the capture, in Chinese, including each schema's `$schema` marker and `additionalProperties: false`.
- Upstream results pass through verbatim, including the isError flag; upstream failures surface as `lawscroll error:` text results.
- One bin serves the CLI (one subcommand per tool, plus `--version`) and the stdio MCP server (`mcp` subcommand). The upstream endpoint can be overridden via `LAWBOTTER_MCP_URL`. The registry record declares no headers on the remote, so no auth header is ever sent.
