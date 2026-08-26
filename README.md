# LaTeX Studio for Obsidian

[中文说明](README.zh-CN.md)

LaTeX Studio turns an Obsidian desktop vault into a focused LaTeX workspace. It opens complete `.tex`, `.sty`, and `.cls` files, compiles through a local TeX engine, reports source-line errors, and displays the generated PDF beside the editor.

## MVP features

- Complete LaTeX source editing with CodeMirror 6 syntax highlighting
- `latexmk` and Tectonic backends with safe argument-based process execution
- Compile command, ribbon action, and debounced compile-on-save
- Overleaf-style side-by-side workspace with a live, reusable PDF preview
- Optional PDF pane controlled by the editor button or `Toggle PDF preview` command
- File/line diagnostic parsing and jump to the first compilation error
- SyncTeX generation for future forward/inverse search support

## Requirements

- Obsidian 1.8 or newer on desktop
- One compiler available on `PATH`:
  - `latexmk` from TeX Live, MacTeX, or MiKTeX; or
  - [Tectonic](https://tectonic-typesetting.github.io/)

## Development

```bash
npm install
npm run check
```

Copy `main.js`, `manifest.json`, and `styles.css` into:

```text
<vault>/.obsidian/plugins/latex-studio/
```

Then enable **LaTeX Studio** under Obsidian community plugins and open a `.tex` file in the vault.

Use the panel button in the LaTeX editor toolbar, or run **Toggle PDF preview** from the command palette, to open or close the right-hand PDF pane. When compile-on-save is enabled, editing pauses briefly before recompiling and refreshing that same pane.

Live preview waits until typing stops, skips unchanged sources, and coalesces edits made during a running build into one follow-up compile. The native PDF pane stays open so its page and zoom state are not reset unnecessarily. Manual **Compile** always requests a fresh full build.

## Security model

Compilation runs local executables without a shell. LaTeX itself can still read files permitted by the selected engine and template. Only compile projects you trust, and do not enable shell escape unless you understand the consequences.

### External file and process access disclosure

This desktop-only plugin starts the locally installed `latexmk` or Tectonic executable, which is outside the Obsidian vault. Compilation runs with the source document's vault folder as its working directory. The readable PDF stays beside the source, while logs, auxiliary files, and SyncTeX data are kept under a hidden `.latex-studio` build folder. The plugin has no telemetry, account requirement, advertisements, or remote service of its own. Tectonic may download LaTeX packages from its configured bundle service when they are not already cached.

## License

MIT
