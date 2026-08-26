# LaTeX Studio for Obsidian

[中文说明](README.zh-CN.md)

LaTeX Studio turns an Obsidian desktop vault into a focused LaTeX workspace. It opens complete `.tex`, `.sty`, and `.cls` files, compiles through a local TeX engine, reports source-line errors, and displays the generated PDF beside the editor.

## MVP features

- Complete LaTeX source editing with CodeMirror 6 syntax highlighting
- `latexmk` and Tectonic backends with safe argument-based process execution
- Compile command, ribbon action, and debounced compile-on-save
- Embedded side-by-side PDF preview
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

## Security model

Compilation runs local executables without a shell. LaTeX itself can still read files permitted by the selected engine and template. Only compile projects you trust, and do not enable shell escape unless you understand the consequences.

## License

MIT
