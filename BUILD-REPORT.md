# BUILD REPORT — lawscroll

Clean-room rebuild of `com.lawbotter/lawbotter` v1.0.0
(remote-only MCP server at `https://lawbotter.com/mcp`),
built 2026-10-28 as a forwarding client. Package: `@reneturcios/lawscroll`
0.1.0, registry name `io.github.CloudCorpRecords/lawscroll`.

## Surface built

Full surface: **5 of 5 captured tools built**, no omissions.

| Tool | Required fields as served |
|------|---------------------------|
| `lawbotter_regulations_search` | `q` |
| `lawbotter_regulations_detail` | `id` |
| `lawbotter_law_query` | `keyword` |
| `lawbotter_legal_consult` | `question` |
| `lawbotter_followup` | `sessionId`, `question` |

Each served tool carries exactly the keys `name`, `title`,
`description`, `inputSchema`, with the `inputSchema.$schema` marker
(`http://json-schema.org/draft-07/schema#`) and
`additionalProperties: false` exactly as captured. All descriptions
and schema text are in Chinese and are served verbatim.
`lawbotter_regulations_search` additionally carries its optional
`category`, `mode` (enum `all`/`title`/`content`), `limit`
(integer 1–100) and `offset` (integer, minimum 0) properties.
The tool literals were generated programmatically from
`harness/fixtures/lawbotter-tools-original.json` by the script at
`/tmp/laneb5-lawscroll-scratch/gen.py` (parse + re-serialise with
UTF-8 output so the Chinese text stays exact, splice into
`src/forward.ts`) — never retyped — and the generator's own
post-generation check, the registration-integrity test suite, and
the parity harness each confirmed the served literals deep-equal
the fixture's 5 tool objects, in order. Tools are registered via
the MCP SDK low-level Server API (`ListToolsRequestSchema` /
`CallToolRequestSchema` handlers), not McpServer+zod.

The two AI-engine tools are built as captured: `lawbotter_law_query`
and `lawbotter_legal_consult` are corpus Q&A engines (the consult's
own description states its answers are AI-generated, "for reference
only, not formal legal advice"); they route nothing to any human,
take no personal details beyond the question text, and submit
nothing. Their anonymous usage quota (`usageStatus`) is metering
against an anonymous allowance; no purchase, signup or key-minting
tool exists anywhere in the surface.

## Files created (19-file factory set)

- `package.json`, `server.json`, `Dockerfile`, `tsconfig.json`,
  `.gitignore`, `package-lock.json`, `README.md`, `LICENSE`,
  `CHANGELOG.md`
- `src/index.ts`, `src/cli.ts`, `src/mcp.ts`, `src/types.ts`,
  `src/forward.ts` (core forwarding client)
- `test/forward.test.ts`
- `.github/workflows/ci.yml`, `.github/workflows/publish.yml`,
  `.github/workflows/publish-container.yml`,
  `.github/workflows/registry-publish.yml`
- plus this `BUILD-REPORT.md` and the `parity-out/` directory.

## Fixture conflicts

**None.** The spec and the fixture agree on the tools' names,
titles, descriptions, required fields, property shapes, and the
per-tool `$schema` / `additionalProperties: false` keys. The
spec's server.json description measures 84 characters, as quoted.

## Labelled reconstructions (from the spec's Wire section)

- Upstream endpoint pinned: `https://lawbotter.com/mcp`.
- Env override `LAWBOTTER_MCP_URL` — labelled reconstruction.
- The registry record declares NO headers on the remote: no auth
  header is ever sent, under any environment. Tests assert that no
  `Authorization` header (and no `X-API-Key` header) is sent with an
  empty environment, with a `LAWBOTTER_API_KEY`-style variable
  present, and with `AUTHORIZATION` / `API_KEY` / `LAWBOTTER_TOKEN`
  variables present.
- Error rendering `lawscroll error:` text for upstream failures —
  labelled reconstruction.
- Upstream results pass through verbatim, including `isError` and
  extra fields. tools/call is forwarded as streamable-HTTP JSON-RPC:
  initialize (protocolVersion `2025-03-26`) →
  notifications/initialized → tools/call, honouring `Mcp-Session-Id`
  when issued; plain-JSON and SSE replies are both parsed. The
  forwarding core takes an injectable fetch; tests stub the
  upstream — no live network calls in tests, and no live call is
  claimed.

## Deviations

None.

## Lockfile

- Route: generated clean from birth in the build dir with no
  `node_modules` and no pre-existing lockfile:
  `npm install --package-lock-only --ignore-scripts --offline`
  (Route 3), then populated with `npm ci --ignore-scripts --offline`.
- Parses as JSON; `name` == `@reneturcios/lawscroll`.
- Package entries: **128**.
- sha256: `32cfca6b2bb42aa3c34be753372e1a5d959e5797c19028c3e43a916acdd7c0d4`
  (re-verified unchanged after the subsequent offline `npm ci`).

## server.json

- Description exactly: "Search Chinese regulations and cases, read
  full texts and ask cited legal questions." — **84 characters**,
  verbatim from the spec.
- npm package entry carries `"version": "0.1.0"`; the OCI entry
  (`ghcr.io/cloudcorprecords/lawscroll:0.1.0`) carries **no**
  `version` field. Both entries carry packageArguments
  `[{type: positional, value: mcp}]` and transport stdio. Dockerfile
  (node:20-alpine, both stages) carries the label
  `io.modelcontextprotocol.server.name="io.github.CloudCorpRecords/lawscroll"`.
  Container workflow `IMAGE` is `ghcr.io/cloudcorprecords/lawscroll`
  and its smoke test asserts the server name `lawscroll`.

## Verification (all run 2026-10-28)

1. `npx tsc --noEmit` → exit 0.
2. `npm run build` → exit 0; real `dist/` produced (cli, forward,
   index, mcp, types — .js, .d.ts, .js.map each).
3. `node dist/cli.js --version` → `0.1.0`.
4. `npm test` → **67 tests, 67 pass, 0 fail** (registration-integrity
   suite deep-equals the served tools/list against the fixture's 5
   tools, in order, including an in-memory-transport MCP tools/list
   check; plus session handling/reuse, env override, the
   no-Authorization-header assertions under every environment,
   verbatim argument forwarding for all 5 tools and result
   pass-through including upstream isError, SSE parsing, error
   rendering, MCP-layer validation, and CLI behaviour).
5. Parity: `python3 /home/hatch/workspace/mcp-rebuild-100/harness/parity.py --original /home/hatch/workspace/mcp-rebuild-100/harness/fixtures/lawbotter-tools-original.json --rebuild "stdio:node /home/hatch/workspace/mcp-rebuild-100/builds/lawscroll/dist/cli.js mcp" --out /home/hatch/workspace/mcp-rebuild-100/builds/lawscroll/parity-out` → **verdict PASS, parity 100.0**
   (5/5 identical, 0 missing, 0 extra, no schema diffs). Output in
   `parity-out/`.
