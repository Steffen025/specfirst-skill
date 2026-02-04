# SpecFirst 3.0

**Systematic specification-driven development skill for PAI.**

SpecFirst generates canonical artifacts (proposal.md, spec.md, plan.md, tasks.md) to ensure features are properly specified before implementation. It produces ISC-format tasks that load directly into the PAI Algorithm.

## Why SpecFirst?

> "If you can't specify it, you can't test it. If you can't test it, you can't trust it."

SpecFirst enforces a disciplined approach to feature development:

1. **Specify first** - No code without a spec
2. **Testable requirements** - ISC criteria with exactly 8 words
3. **Canonical artifacts** - Standard structure across all features
4. **Session isolation** - Git commits as phase markers, cold-start capable

## Key Features

| Feature | Description |
|---------|-------------|
| **ISC-Native Tasks** | Generates exactly 8-word criteria that load into Algorithm ISC tracker |
| **Linear Integration** | Optional milestone validation and status sync |
| **Cross-Platform** | Works on OpenCode AND Claude Code |
| **Git-Based State** | Commits mark phase completion, enables resumption |
| **Validation Gates** | Prerequisite, Artifact, ISC Format, and Phase Completion gates |

## Statistics

- **~11.5k LOC** TypeScript
- **68 source files** (excluding state)
- **5 validation gates**
- **6 phases** (Propose → Specify → Plan → Implement → Validate → Release)
- **4 integrations** (Linear status, milestones, offline mode, Algorithm)

## Architecture

```
SpecFirst 3.0
├── algorithm/           # Algorithm integration (effort detection, ISC loading)
├── artifacts/           # Artifact generators (proposal, spec, plan, tasks)
├── gates/               # Validation gates (prerequisite, artifact, ISC format)
├── integrations/        # Linear API, offline fallback
├── lib/                 # Platform detection, config, git utilities
├── phases/              # Phase executors and orchestrator
└── tests/               # Unit, integration, platform compatibility tests
```

## Phases

```
PROPOSE   → Create proposal.md with problem statement
    ↓
SPECIFY   → Generate spec.md with FR/NFR requirements
    ↓
PLAN      → Architecture overview in plan.md
    ↓
IMPLEMENT → ISC-format tasks.md for Algorithm
    ↓
VALIDATE  → Verify all criteria pass
    ↓
RELEASE   → Git tag, changelog, archive
```

## ISC Format Example

SpecFirst generates tasks that the PAI Algorithm can directly consume:

```markdown
## Tasks

### Section 1: Core Implementation

- [ ] ISC-001: Platform detection returns correct root directory path
- [ ] ISC-002: Git commit creates phase marker with message
- [ ] ISC-003: Artifact gate blocks when prerequisite file missing
```

**Each criterion is exactly 8 words** and describes a testable state condition.

## Integration with PAI Algorithm

SpecFirst operates as a **capability within the Algorithm**, not a parallel workflow:

1. Algorithm detects DETERMINED effort level
2. Algorithm activates SpecFirst capability
3. SpecFirst generates artifacts across phases
4. tasks.md loads into Algorithm ISC tracker
5. Algorithm verifies criteria and continues

## Platform Support

| Platform | Status | Detection |
|----------|--------|-----------|
| **OpenCode** | ✅ Full support | `OPENCODE_DIR` env var |
| **Claude Code** | ✅ Full support | `CLAUDE_DIR` or `~/.claude` |

Zero hardcoded paths - all paths derived from platform root.

## Installation

### As PAI Skill

Copy to your PAI skills directory:

```bash
# OpenCode
cp -r specfirst-skill ~/.opencode/skills/SpecFirst

# Claude Code  
cp -r specfirst-skill ~/.claude/skills/SpecFirst
```

### Standalone (for development)

```bash
git clone https://github.com/Steffen025/specfirst-skill.git
cd specfirst-skill
bun install
bun test
```

## Contributing

This skill was developed as part of the [PAI-Collab](https://github.com/mellanon/pai-collab) ecosystem.

**Related Issues:**
- [#72 - SpecFirst: Milestone-based alternative](https://github.com/mellanon/pai-collab/issues/72)
- [specflow-bundle#8 - Integration proposal](https://github.com/jcfischer/specflow-bundle/issues/8)

We're offering to contribute SpecFirst concepts to the SpecFlow project. See the issues above for the collaboration proposal.

## License

MIT

---

**Maintainer:** @Steffen025 + Jeremy (OpenCode/Claude Opus 4.5)
