# AGENTS.md — Engineering Decision Doctrine (binding)

This repository follows the engineering decision doctrine in `docs/engineering/first-principles.md`. **Read it before making any non-trivial engineering choice** (technology, provider, schema, architecture, workflow).

Hard rules for every agent working in this repo:

1. **Record before implementing.** Every decision above the trivial gets a record in `docs/decisions/` (copy `docs/decisions/TEMPLATE.md`) *before* the corresponding change lands. Number records sequentially (`NNNN-kebab-title.md`). Truly trivial choices get a one-line note under their parent decision's record instead.
2. **Follow the 5-step procedure** (`docs/engineering/first-principles.md` §4): classify reversibility → restate from first principles → enumerate options → seek evidence → record.
3. **Evidence over intuition.** Don't optimize, build, or claim without measurement or a cited source (§3.8). Don't build presumptive features (§3.2, YAGNI).
4. **AI output is input, not decision** (§6). If options or code substantially came from AI tools, the record must say so; the named human owner remains accountable.
5. **Never delete a decision record** — mark it `Status: superseded` with a `- Superseded by:` pointer to the replacement.
6. **Validate before committing.** After adding or editing records, run `sh scripts/adr-check.sh` from the repo root; it must pass.
