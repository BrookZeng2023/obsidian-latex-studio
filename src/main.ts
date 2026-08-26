import path from "node:path";
import { FileSystemAdapter, Notice, Plugin, TFile } from "obsidian";
import { compileLatex } from "./compiler";
import { LATEX_VIEW_TYPE, LatexEditorView } from "./latex-view";
import { PDF_VIEW_TYPE, LatexPdfView } from "./pdf-view";
import { DEFAULT_SETTINGS, LatexStudioSettingTab } from "./settings";
import type { CompileResult, LatexStudioSettings } from "./types";

export default class LatexStudioPlugin extends Plugin {
  settings: LatexStudioSettings = DEFAULT_SETTINGS;
  private compiling = new Set<string>();

  async onload(): Promise<void> {
    await this.loadSettings();
    this.registerView(LATEX_VIEW_TYPE, (leaf) => new LatexEditorView(leaf, this));
    this.registerView(PDF_VIEW_TYPE, (leaf) => new LatexPdfView(leaf));
    this.registerExtensions(["tex", "sty", "cls"], LATEX_VIEW_TYPE);
    this.addSettingTab(new LatexStudioSettingTab(this.app, this));
    this.addRibbonIcon("sigma", "Compile active LaTeX document", () => void this.compileActive());
    this.addCommand({
      id: "compile-active-latex-document",
      name: "Compile active LaTeX document",
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(LatexEditorView);
        if (!view) return false;
        if (!checking) void this.compileView(view);
        return true;
      }
    });
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  async compileView(view: LatexEditorView, quiet = false): Promise<void> {
    await view.save();
    const file = view.file;
    if (!file) return;
    await this.compileFile(file, view, quiet);
  }

  private async compileActive(): Promise<void> {
    const view = this.app.workspace.getActiveViewOfType(LatexEditorView);
    if (!view) {
      new Notice("Open a .tex document first.");
      return;
    }
    await this.compileView(view);
  }

  private async compileFile(file: TFile, view: LatexEditorView, quiet: boolean): Promise<void> {
    if (this.compiling.has(file.path)) return;
    const adapter = this.app.vault.adapter;
    if (!(adapter instanceof FileSystemAdapter)) {
      new Notice("LaTeX Studio requires a desktop filesystem vault.");
      return;
    }

    this.compiling.add(file.path);
    if (!quiet) new Notice(`Compiling ${file.name}…`);
    try {
      const result = await compileLatex(adapter.getFullPath(file.path), this.settings);
      await this.reportResult(result, view, adapter);
    } finally {
      this.compiling.delete(file.path);
    }
  }

  private async reportResult(
    result: CompileResult,
    view: LatexEditorView,
    adapter: FileSystemAdapter
  ): Promise<void> {
    if (!result.ok) {
      const firstError = result.diagnostics.find((item) => item.severity === "error");
      if (firstError?.line) view.focusLine(firstError.line);
      new Notice(firstError?.message ?? "LaTeX compilation failed.", 8000);
      console.error("LaTeX Studio compilation failed", result.log);
      return;
    }

    new Notice(`Compiled with ${result.engine} in ${(result.durationMs / 1000).toFixed(1)}s`);
    if (!this.settings.openPdfAfterCompile) return;
    const relativePdfPath = path.relative(adapter.getBasePath(), result.pdfPath).split(path.sep).join("/");
    await this.app.vault.adapter.exists(relativePdfPath);
    const resourceUrl = this.app.vault.adapter.getResourcePath(relativePdfPath);
    const leaf = this.app.workspace.getLeaf("split", "vertical");
    await leaf.setViewState({ type: PDF_VIEW_TYPE, active: true });
    const pdfView = leaf.view;
    if (pdfView instanceof LatexPdfView) pdfView.show(resourceUrl);
  }
}
