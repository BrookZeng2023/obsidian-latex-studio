# Research and architecture

## Comparable projects

| Project | Useful idea | Gap for this project |
| --- | --- | --- |
| [Obsidian SwiftLaTeX Renderer](https://github.com/gboyd068/obsidian-swiftlatex-render) | WASM compilation, package cache, embedded PDF/SVG | Compiles fenced code blocks rather than complete file-based projects; GPL-3.0 limits direct code reuse in this MIT project |
| [Obsidian LaTeX Compiler](https://github.com/alexander-bloemer/obsidian-latex-compiler) | Multi-pass compile workflow and bibliography support | Windows-oriented, Markdown extraction workflow, rigid project layout |
| [Ultimate LaTeX Converter](https://github.com/MariosGkMeng/Straightforward-Obsidian2Latex) | Converts Obsidian Markdown and can invoke `latexmk` | Conversion/export focus rather than a native `.tex` IDE |
| [Obsidian developer editor APIs](https://docs.obsidian.md/Plugins/Editor/Editor+extensions) | CodeMirror 6 integration patterns | Markdown editor extensions do not provide a complete foreign-file editor, so LaTeX Studio uses a custom `TextFileView` |

## Reuse versus new work

We reuse stable ecosystem components and protocols: CodeMirror 6 with the `stex` language package, local `latexmk`/Tectonic executables, the browser PDF renderer, and SyncTeX output. We do not copy GPL implementation code.

The plugin-specific work is the Obsidian foreign-file view, safe compiler orchestration, compilation lifecycle, diagnostics model, PDF pane coordination, and later SyncTeX navigation.

## MVP architecture

1. `LatexEditorView` owns complete `.tex`, `.sty`, and `.cls` files through Obsidian's `TextFileView` lifecycle.
2. `compiler.ts` invokes an executable directly with an argument array. It never passes source text through a shell.
3. `diagnostics.ts` converts compiler output into a stable internal model.
4. `LatexPdfView` shows the compiled vault PDF in a split pane and refreshes it after successful builds.
5. Plugin settings choose the engine and compilation behavior.

## Roadmap

1. MVP: editing, build-on-save, diagnostics, PDF pane.
2. Project model: root-file directives, multi-file dependency watching, bibliography/index recipes.
3. SyncTeX: forward search from source and inverse search from PDF.
4. IDE layer: outline, symbols, references, autocomplete, snippets, and build-log panel.
5. Distribution: cross-platform acceptance tests, signed releases, Obsidian community submission.
