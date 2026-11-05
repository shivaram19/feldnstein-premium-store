# 0017. Open-source the repository — MIT license

- Status: accepted

## Context

The repository has been public on GitHub with no LICENSE file, which legally means "all rights reserved": visible source that nobody may legally use, fork, or learn from. The user instructed "open source" it. A license choice is a one-way door for downstream users (relicensing requires every contributor's assent) and a business decision for a platform that may be productized for other gaanugu/mill businesses.

## Decision Drivers

- Legal clarity over the current ambiguous state (public but unusable)
- Fit with a possible future commercialization (white-labeling the platform for other mills)
- Compatibility with the stack's own licenses (Quarkus/Apache-2.0, React/MIT — all permissive, no copyleft obligation)

## Considered Options

1. MIT — maximal adoption and zero friction for forks/clients; no explicit patent grant
2. Apache-2.0 — adds an express patent grant; better if the owner later runs a commercial version and wants protection against patent claims from contributors; longer text, slightly more friction
3. GPL-3.0/AGPL — copyleft would force derivatives open; conflicts with white-label commercialization; also incompatible with the "client forks and closes" scenario the owner has discussed
4. Do nothing (no license) — retains all-rights-reserved ambiguity; worst outcome for an already-public repo

## Decision

MIT (option 1), applied at the repo root with matching metadata in pom.xml, both package.json files, and uitests/Cargo.toml. Reasoning: the dominant near-term use is demos, client showcases, and portfolio adoption, where MIT removes every barrier; the patent-grant gap in option 2 is hypothetical at current scale. This is a one-way door for downstream users. Options framed with AI research assistance; the owner (Shivaram Morigala) is the accountable decision-maker and retains copyright.

## Consequences

- Anyone may use/copy/modify/sell the platform with attribution preserved
- Reopen trigger: a concrete plan to run a hosted commercial version with third-party contributors → consider Apache-2.0 or a CLA before accepting outside PRs
- Hygiene performed with this change: secret-pattern scan of tracked files (clean; demo credentials are intentional and documented), README with quickstart/verify/deploy/license sections
