# ctxstuff

Packs a code directory into one Markdown, XML, plain or JSON file that you can paste into an LLM prompt. It also counts tokens, compares models, splits or shrinks the pack to a token limit and estimates cost.

[![npm](https://img.shields.io/npm/v/@v0idd0/ctxstuff?color=00f6d0&labelColor=050914)](https://www.npmjs.com/package/@v0idd0/ctxstuff)
[![test](https://github.com/voidd0/ctxstuff/actions/workflows/test.yml/badge.svg)](https://github.com/voidd0/ctxstuff/actions/workflows/test.yml)
[![license](https://img.shields.io/badge/license-MIT-00f6d0?labelColor=050914)](LICENSE)

## Install

```bash
npm install -g @v0idd0/ctxstuff
```

Or run it once without installing: `npx @v0idd0/ctxstuff --help`. Needs Node.js 18 or newer. Depends on chalk and commander. The optional packages tiktoken (token counts) and chokidar (the watch command) are installed when available.

## Example

`demo/app` holds two small files, `README.md` and `src/math.js`. Count its tokens for one model. Output from a real run on 2026-11-26:

```console
$ ctxstuff count demo/app --model claude-sonnet-5-5
Token Count: app

  Files:    2
  Size:     93 B
  Model:    claude-sonnet-5-5
  Tokens:   28 (tiktoken cl100k_base)

  Context:  1,000,000 tokens (claude-sonnet-5-5)
  Usage:    0.0%
  Remaining: 999,972 tokens
  ✓ Fits within context window
```

Compare token counts and context fit for several models:

```console
$ ctxstuff compare demo/app --models gpt-5.4,claude-sonnet-5-5,grok-4.7,deepseek-flash
Model comparison: app

  Files:  2
  Size:   93 B

┌───────────────────┬────────┬───────────┬───────┬──────┐
│ Model             │ Tokens │ Context   │ Usage │ Fits │
├───────────────────┼────────┼───────────┼───────┼──────┤
│ claude-sonnet-5-5 │ 28     │ 1,000,000 │ 0.0%  │ ✓    │
│ deepseek-flash    │ 28     │ 1,000,000 │ 0.0%  │ ✓    │
│ grok-4.7          │ 28     │ 500,000   │ 0.0%  │ ✓    │
│ gpt-5.4           │ 28     │ n/a       │ n/a   │ ?    │
└───────────────────┴────────┴───────────┴───────┴──────┘

* = estimate (1 token per 4 characters). Without * the count is tiktoken cl100k_base, the same for every model.
n/a / ?: the provider pricing page does not state the context window.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Fits in 3 model(s):
  - claude-sonnet-5-5 (999,972 tokens remaining)
  - deepseek-flash (999,972 tokens remaining)
  - grok-4.7 (499,972 tokens remaining)
```

Pack the directory into Markdown on stdout:

```console
$ ctxstuff pack demo/app --quiet
# app

**Files:** 2 | **Tokens:** ~28 | **Size:** 93 B

## File Structure

```
├── README.md
└── src/
    └── math.js
```

## Files

### README.md

```markdown
# App

A tiny demo project.
```

### src/math.js

```javascript
function add(a, b) {
  return a + b;
}
module.exports = { add };
```
```

## Usage

```text
Usage: ctxstuff [options] [command]

Pack a code directory into one context file for LLM prompts, count tokens,
split, optimize and estimate cost.

Options:
  -v, --version                   output the version number
  -h, --help                      display help for command

Commands:
  pack [options] [directory]      Pack a directory into a single LLM context
                                  file
  count [options] [target]        Count tokens in a file or directory
  compare [options] [target]      Compare token counts and context fit across
                                  models
  optimize [options] [directory]  Optimize context to fit a token limit
  split [options] [directory]     Split context into chunks
  cost [options] [target]         Estimate API costs per model from the price
                                  table
  watch [options] [directory]     Watch a directory and repack on changes
  profile [options] [action]      Manage custom model profiles (list, add,
                                  remove, show)
  help [command]                  display help for command

Examples:
  $ ctxstuff pack ./my-project                    Pack a directory into markdown
  $ ctxstuff pack ./src -o context.md             Pack and save to file
  $ ctxstuff pack . --format xml -c               Pack as XML, copy to clipboard
  $ ctxstuff count ./src                          Count tokens across the tree
  $ ctxstuff count ./src --breakdown              Per-file token breakdown
  $ ctxstuff compare ./src                        Compare tokens across models
  $ ctxstuff optimize ./src --tokens 200000       Shrink to fit 200K tokens
  $ ctxstuff split ./large-repo -o ./chunks       Split into 1M-token chunks
  $ ctxstuff cost ./src --compare                 Compare API cost across models
  $ ctxstuff watch ./src -o context.md            Auto-repack on changes

Docs and issues: https://github.com/voidd0/ctxstuff
```

## Notes on counts and prices

**How tokens are counted.** If the optional `tiktoken` package is installed, ctxstuff counts with its `cl100k_base` encoding. That encoding is used for every model, so the count is the same for all of them and is only a proxy: no model in the table is guaranteed to use it. Without `tiktoken`, ctxstuff estimates one token per 4 characters and marks the number as an estimate. Output says which of the two was used. Neither method is the real tokenizer of a Claude, Gemini, Grok, DeepSeek or Qwen model.

**Prices.** The model table is the file `src/prices.json`. Each entry has the input and output price in USD per 1M tokens and a `checked` date. Entries dated 2026-11-26 were read on that day from the provider pages: [Anthropic](https://platform.claude.com/docs/en/about-claude/pricing), [OpenAI](https://developers.openai.com/api/docs/pricing), [Google](https://aistudio.google.com/docs/pricing), [xAI](https://docs.x.ai/docs/models), [DeepSeek](https://api-docs.deepseek.com/quick_start/pricing) and [Alibaba Cloud](https://www.alibabacloud.com/help/en/model-studio/model-pricing) (international prices). 20 entries for Mistral, Cohere, Amazon Nova and Meta Llama keep their old date of 2026-04-22: they were not refreshed and may be out of date, because the provider pages did not give a clear per-token price list: Mistral's two pages disagreed and stated no unit, Cohere lists only legacy models, the Amazon Nova tables could not be read and Meta lists no per-token prices. Models a provider no longer lists were removed. Where a provider has tiers (long prompts, peak hours, dated price changes) the table holds the base price and the tier is written in the entry's `note`. The table has 99 models. The context window is stored only where the price page states it, otherwise it shows as `n/a`.

## License

MIT, see [LICENSE](LICENSE).

---

Made by [vøiddo](https://voiddo.com/?src=gh). More command line tools: [voiddo.com/packages](https://voiddo.com/packages/?src=gh).
We also run data scrapers for job boards, shops and ad libraries: [voiddo.com/scrapers](https://voiddo.com/scrapers/?src=gh).
