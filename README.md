# lawscroll

Look up Chinese law without leaving your MCP client. lawscroll is a small forwarding client for the hosted lawbotter MCP service, which searches a self-built corpus of Chinese regulations (national laws, judicial interpretations, administrative regulations and departmental rules) and reported cases: the tool list is served from your own machine using the captured definitions, and each call is sent upstream, with the service's answer returned exactly as it arrived.

All five of the service's captured tools are exposed. Two of them are plain corpus reads — a regulation search and a full-text detail read. The other three run the service's AI engines over the same corpus: a query engine that answers with statute citations, a one-to-one legal consult, and a follow-up tool that continues either kind of session. The AI answers are generated from the corpus search results, carry an anonymous usage quota in their replies, and — as the service itself states — are for reference only, not formal legal advice. Nothing is routed to a human and nothing is submitted anywhere; a consult takes only the question text you pass it.

## The tools

Tool descriptions and schemas are served verbatim from the upstream capture, in Chinese.

- **`lawbotter_regulations_search`** — Search the regulation database and get back a list with each regulation's name, category, issuing body, effective date and validity status. Requires `q` (the search keyword); optional `category` filter, `mode` (`all` / `title` / `content`, default `all`), `limit` (default 20, max 100) and `offset` for paging.
- **`lawbotter_regulations_detail`** — Read one regulation in full, article text included, by the `id` a search result returned. Requires `id`.
- **`lawbotter_law_query`** — Ask the AI query engine a legal question or keyword set; it searches the corpus and answers with the statute provisions it relied on. Requires `keyword`. Returns a `sessionId`, the answer `content` and a `usageStatus` describing the remaining anonymous quota.
- **`lawbotter_legal_consult`** — Put a concrete legal question to the AI legal consultant; several models race and the answer comes back with its basis analysis. Requires `question`. Returns a `sessionId`, the `answer` and a `usageStatus`.
- **`lawbotter_followup`** — Continue a query or consult session with a follow-up question. Requires `sessionId` (from a `lawbotter_law_query` or `lawbotter_legal_consult` reply) and `question`.

## Install and run

As an MCP server via npm:

```bash
npx -y @reneturcios/lawscroll mcp
```

MCP client configuration:

```json
{
  "mcpServers": {
    "lawscroll": {
      "command": "npx",
      "args": ["-y", "@reneturcios/lawscroll", "mcp"]
    }
  }
}
```

As a container:

```bash
docker run -i ghcr.io/cloudcorprecords/lawscroll
docker run --rm ghcr.io/cloudcorprecords/lawscroll lawbotter_regulations_detail '{"id":"example-id"}'
```

## CLI

A single binary covers both the command line and the MCP server. Every tool is a subcommand whose one argument is a JSON string of that tool's inputs:

```bash
lawscroll lawbotter_regulations_search '{"q":"example keyword"}'
lawscroll lawbotter_regulations_search '{"q":"example keyword","mode":"title","limit":5}'
lawscroll lawbotter_regulations_detail '{"id":"example-id"}'
lawscroll lawbotter_law_query '{"keyword":"example question"}'
lawscroll lawbotter_legal_consult '{"question":"example question"}'
lawscroll lawbotter_followup '{"sessionId":"example-session","question":"example follow-up"}'
lawscroll --version
```

Exit codes: `0` for a successful forwarded call, `1` when the result that comes back is an error, and `2` for usage mistakes like an unknown subcommand or a JSON argument that does not parse.

## Configuration

- `LAWBOTTER_MCP_URL` — Replaces the upstream endpoint. Defaults to the pinned hosted endpoint, `https://lawbotter.com/mcp`. (This override variable is a reconstruction introduced by this rebuild.)

The lawbotter registry record lists no headers for its remote, so lawscroll never attaches an authentication header — every call goes upstream keyless.

When the upstream cannot answer — it returns a JSON-RPC error, answers with a non-2xx status, sends a body that cannot be read, or the request itself fails — the caller receives an error result whose text begins with `lawscroll error:`.

## How forwarding works

The first call of a process opens a session against the upstream: an `initialize` request (protocol version `2025-03-26`), a `notifications/initialized` notification, and then the `tools/call`. If the service issues an `Mcp-Session-Id` header during initialize, lawscroll repeats it on subsequent requests and keeps reusing that one session until the process ends. Replies are understood in both plain JSON and server-sent-events framing. Successful results are passed through untouched, `isError` flag and any extra fields included.

## Development

```bash
npm install
npm run build   # tsc -> dist/ (dist/cli.js is the bin)
npm test        # tsx --test test/*.test.ts — stubbed upstream, no network
npm run dev     # run the CLI from source
```

The suite compares the served tool list against the captured surface tool for tool, walks the session handshake and its reuse, proves no `Authorization` header is sent under any environment, and confirms that arguments travel upstream unchanged and results return unchanged.

## License

MIT — see `LICENSE`. Copyright (c) 2026 Rene Turcios.
