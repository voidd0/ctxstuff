# ctxstuff

> **Pack codebases into LLM-ready context. Cost-estimate before you send.**
> A gift to the terminal from [**vøiddo**](https://voiddo.com).

[![npm](https://img.shields.io/npm/v/@v0idd0/ctxstuff?color=%2322c55e&label=%40v0idd0%2Fctxstuff)](https://www.npmjs.com/package/@v0idd0/ctxstuff)
[![downloads](https://img.shields.io/npm/dm/@v0idd0/ctxstuff?color=%2322c55e)](https://www.npmjs.com/package/@v0idd0/ctxstuff)
[![license](https://img.shields.io/npm/l/@v0idd0/ctxstuff?color=%2322c55e)](./LICENSE)
[![node](https://img.shields.io/node/v/@v0idd0/ctxstuff?color=%2322c55e)](./package.json)

**[Homepage](https://voiddo.com/tools/ctxstuff/)** · **[GitHub](https://github.com/voidd0/ctxstuff)** · **[npm](https://www.npmjs.com/package/@v0idd0/ctxstuff)** · **[All tools](https://voiddo.com/tools/)** · **[Contact](mailto:support@voiddo.com)**

---

## Why ctxstuff

You have a directory of source code and a frontier LLM with a 200K–10M-token context window. You need to turn one into prompt material for the other, in a format that the model actually reads well, while knowing **how much this prompt is going to cost** before you pay for it.

Every other tool does half of that, paywalls the other half, and hallucinates pricing numbers that haven't been correct since the day they shipped.

**ctxstuff does the whole job in one binary, 60+ current models, and no artificial limits.** No daily op cap. No 20-file ceiling. No license key. No telemetry. No network calls. You run it locally, it reads your files, it emits markdown/XML/JSON, you paste or pipe, done.

Built because we got tired of manually cat-ing 40 source files into a prompt every time we wanted to ask Claude "does this look right?"

## Install

```bash
# npm
npm install -g @v0idd0/ctxstuff

# or pnpm / yarn / bun
pnpm add -g @v0idd0/ctxstuff
yarn global add @v0idd0/ctxstuff
bun add -g @v0idd0/ctxstuff

# one-shot via npx (no install)
npx @v0idd0/ctxstuff pack ./src --model claude
```

Requires Node.js **≥ 14**.

## What it does

| Command | What it does |
|---|---|
| `pack` | Pack a directory into one markdown/XML/plain/JSON context file |
| `count` | Count tokens in a file or directory, per-file breakdown available |
| `compare` | Compare token counts and cost across every supported model |
| `optimize` | Shrink context to fit a target token budget (strip comments, minify, prioritise) |
| `split` | Split a large codebase into chunks that each fit in one prompt |
| `cost` | USD cost estimate across 60+ models, sorted cheapest-first |
| `watch` | Watch a directory and auto-repack on every change (clipboard-aware) |
| `profile` | Save custom model profiles (context + pricing) for your own tokenizer |

## Usage

```bash
# pack a project to a markdown file
ctxstuff pack ./my-project -o context.md

# pack as XML and copy straight to clipboard
ctxstuff pack ./src --format xml -c

# count tokens across the tree for a specific model
ctxstuff count ./src --model claude-opus-4-7

# per-file breakdown, heaviest first
ctxstuff count ./src --breakdown

# cross-model cost comparison
ctxstuff cost ./src --compare --output 2000

# optimize to fit 500K-token budget
ctxstuff optimize ./src --tokens 500000 --minify -o optimized.md

# split a huge repo into chunks, each ≤ 1M tokens
ctxstuff split ./mega-repo --max-tokens 1000000 -o ./chunks

# watch and auto-repack on file save
ctxstuff watch ./src -o context.md

# see suggested split boundaries without writing anything
ctxstuff split ./src --suggest

# pick files by extension + ignore node_modules-style junk
ctxstuff pack . --ext ts,tsx,md --ignore dist,coverage
```

## Model coverage (60+, pricing snapshot 2026-04-22)

| Provider | Flagship tier | Cheaper tiers |
|---|---|---|
| **OpenAI** | `gpt-5.4` ($2.50/$15), `o3` ($2/$8, reasoning) | `gpt-5.4-mini`, `gpt-5.4-nano`, `gpt-5`, `gpt-4.1`, `gpt-4.1-mini`/`nano`, `gpt-4o`, `gpt-4o-mini`, `o3-mini`, `o4-mini` |
| **Anthropic** | `claude-opus-4-7` ($5/$25, **1M ctx**, released 2026-04-16) | `claude-opus-4-6`, `claude-sonnet-4-6`, `claude-haiku-4-5`, `claude-3.5-sonnet`, `claude-3.5-haiku` |
| **Google** | `gemini-3.1-pro` ($2/$12, **2M ctx**) | `gemini-3-pro`, `gemini-3-flash`, `gemini-3.1-flash-lite`, `gemini-2.5-pro`, `gemini-2.5-flash` |
| **Meta** | `llama-4-scout` (**10M ctx!**) | `llama-4-maverick`, `llama-3.3-70b` |
| **Mistral** | `mistral-large-3` ($2/$6), `magistral-medium` (reasoning) | `mistral-medium-3`, `mistral-small-4`, `magistral-small-1.2`, `codestral` |
| **xAI** | `grok-4` ($3/$15) | `grok-4.1-fast` (2M ctx, $0.20/$0.50) |
| **DeepSeek** | `deepseek-v3.2` ($0.28/$0.42), `deepseek-r2` (reasoning) | — |
| **Alibaba** | `qwen3-max` ($0.78/$3.90, 262K ctx) | `qwen3.5-plus` (1M ctx) |
| **Cohere** | `command-a` ($2.50/$10) | `command-r-plus`, `command-r`, `command-r7b` (**$0.0375**/MTok — cheapest premium) |

**Short aliases** (pass to `--model`): `gpt`, `claude`, `opus`, `sonnet`, `haiku`, `gemini`, `gemini-pro`, `llama`, `scout`, `maverick`, `mistral`, `magistral`, `grok`, `deepseek`, `qwen`, `command`, `reasoning`. Every old pre-3.0 key (`claude-4-opus`, `mistral-large-2`, etc.) resolves to its 2026-04 equivalent.

Pricing drifts monthly — run `ctxstuff cost . --compare` to see the numbers the installed version knows. Bump the package when you want fresh data.

## Output formats

- **`markdown`** (default) — headers per file, fenced code blocks with language hints. Best for Claude, Gemini, GPT-5.
- **`xml`** — Anthropic's preferred framing (`<file path="..."> ... </file>`). Best for long Claude runs with tool use.
- **`plain`** — just the raw text, minimal dividers. Best for pipelines that re-process.
- **`json`** — structured output for programmatic consumers: `{ files: [{ path, lang, content, tokens }], tokens, model }`.

## Library use

```js
const { pack, count, cost } = require('@v0idd0/ctxstuff');

const result = await pack('./src', {
  model: 'claude-opus-4-7',
  format: 'xml',
  ignore: ['node_modules', 'dist'],
});
console.log(result.tokens, result.content.length);
```

## Why free forever

We are [**vøiddo**](https://voiddo.com) — a studio building small, sharp tools and a few serious products ([scrb](https://scrb.voiddo.com), [rankd](https://rankd.voiddo.com), [gridlock](https://gl.voiddo.com), and more). The serious products pay for themselves. The tools are gifts.

We write ctxstuff because _we_ need to pack our own codebases into LLM context all day, and leaving it free means we don't have to build a billing flow for a CLI utility.

## From the same studio

- **[@v0idd0/tokcount](https://www.npmjs.com/package/@v0idd0/tokcount)** — count LLM tokens + cost across 60+ models
- **[@v0idd0/jsonyo](https://www.npmjs.com/package/@v0idd0/jsonyo)** — JSON swiss army knife, 18 commands
- **[@v0idd0/promptdiff](https://www.npmjs.com/package/@v0idd0/promptdiff)** — diff LLM prompts with semantic awareness
- **[@v0idd0/envguard](https://www.npmjs.com/package/@v0idd0/envguard)** — stop shipping `.env` drift to staging
- **[View all tools →](https://voiddo.com/tools/)**

## Contributing

Model gone? Price stale? New provider? New output format? Open an issue at [github.com/voidd0/ctxstuff/issues](https://github.com/voidd0/ctxstuff/issues) or drop a line to [support@voiddo.com](mailto:support@voiddo.com).

## License

MIT — see [LICENSE](./LICENSE).

---

**Built by [vøiddo](https://voiddo.com).** We write tools so you do not have to. Enjoy.

[voiddo.com](https://voiddo.com) · [github.com/voidd0](https://github.com/voidd0) · [npmjs.com/org/v0idd0](https://www.npmjs.com/org/v0idd0) · [support@voiddo.com](mailto:support@voiddo.com)
