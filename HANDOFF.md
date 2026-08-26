# LaTeX Studio handoff

## Objective

Build an open-source desktop Obsidian plugin for complete LaTeX projects with an experience closer to Overleaf or TeXstudio.

## Verified state

- Comparable projects were reviewed before implementation; see `docs/RESEARCH_AND_ARCHITECTURE.md`.
- The MVP source implements complete-file editing, local compilation, diagnostics, and PDF preview.
- `npm run check` passes: strict TypeScript check, 2 unit tests, and production esbuild bundle.
- Tectonic compiled `examples/basic/main.tex` successfully on 2026-08-26.
- Verified artifacts: a PDF 1.5 file (15 KB) and a gzip SyncTeX map (1.0 KB).
- An isolated test vault is installed at `/Users/brook/Brook/Local/obsidian-latex-studio-test-vault`; its sample compiled to a valid 16 KB PDF and 1.4 KB SyncTeX map.
- English and Simplified Chinese README files are present.

## Assumptions

- The first supported environment is Obsidian desktop with a filesystem-backed vault.
- Version 0.1 targets a local trusted compiler and trusted LaTeX projects.
- `latexmk` is preferred for broad compatibility; Tectonic is the automatic fallback.

## Next actions

1. Perform an Obsidian UI acceptance test in the installed test vault.
2. Implement root-file directives and multi-file dependency watching.
3. Implement a dedicated build-log/diagnostics pane and SyncTeX navigation.
4. Add Windows/Linux CI and package the first release.

## Corrections and reflections

| Date | Classification | Evidence | Correction | Reusable lesson |
| --- | --- | --- | --- | --- |
| 2026-08-26 | Missing local information | Brook rules symlinks point to unavailable Sync targets | Followed the injected rules and used `Brook/Repos` without inventing replacement policy | Validate symlink targets before relying on repository-wide instructions |
