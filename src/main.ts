import path from "node:path";
import { FileSystemAdapter, Notice, Plugin, TFile, type WorkspaceLeaf } from "obsidian";
import { compileLatex } from "./compiler";
import { LATEX_VIEW_TYPE, LatexEditorView } from "./latex-view";
import { DEFAULT_SETTINGS, LatexStudioSettingTab } from "./settings";
import type { CompileResult, LatexStudioSettings } from "./types";

export default class LatexStudioPlugin extends Plugin {
  settings: LatexStudioSettings = DEFAULT_SETTINGS;
  private compiling = new Set<string>();
  private lastCompiledSource = new Map<string, string>();
  private pendingCompile = new Map<string, { view: LatexEditorView; source: string }>();
  private latestPdfPath: string | null = null;
  private pdfLeaf: WorkspaceLeaf | null = null;
  private openingPdfLeaf: Promise<WorkspaceLeaf> | null = null;
  private statusEl: HTMLElement | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.registerView(LATEX_VIEW_TYPE, (leaf) => new LatexEditorView(leaf, this));
    this.registerExtensions(["tex", "sty", "cls"], LATEX_VIEW_TYPE);
    this.addSettingTab(new LatexStudioSettingTab(this.app, this));
    this.statusEl = this.addStatusBarItem();
    this.setStatus("LaTeX ready");
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
    this.addCommand({
      id: "toggle-pdf-preview",
      name: "Toggle PDF preview",
      callback: () => void this.togglePdfPreview()
    });
  }

  async loadSettings(): Promise<void> {
    const storedData: unknown = await this.loadData();
    this.settings = sanitizeSettings(storedData);
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  async compileView(view: LatexEditorView, quiet = false): Promise<void> {
    await view.save();
    const file = view.file;
    if (!file) return;
    await this.compileFile(file, view, quiet, view.getViewData());
  }

  async togglePdfPreview(sourceView?: LatexEditorView): Promise<void> {
    if (this.pdfLeaf) {
      this.pdfLeaf.detach();
      this.pdfLeaf = null;
      return;
    }

    if (this.latestPdfPath) {
      await this.openPdf(this.latestPdfPath);
      return;
    }

    const latexView = sourceView ?? this.app.workspace.getActiveViewOfType(LatexEditorView);
    if (latexView) await this.compileView(latexView);
  }

  private async compileActive(): Promise<void> {
    const view = this.app.workspace.getActiveViewOfType(LatexEditorView);
    if (!view) {
      new Notice("Open a .tex document first.");
      return;
    }
    await this.compileView(view);
  }

  private async compileFile(
    file: TFile,
    view: LatexEditorView,
    quiet: boolean,
    source: string
  ): Promise<void> {
    if (quiet && this.lastCompiledSource.get(file.path) === source) {
      this.setStatus("LaTeX up to date");
      return;
    }
    if (this.compiling.has(file.path)) {
      if (quiet) {
        this.pendingCompile.set(file.path, { view, source });
        this.setStatus("Changes queued");
      } else {
        new Notice(`${file.name} is already compiling; latest changes are queued.`);
        this.pendingCompile.set(file.path, { view, source });
      }
      return;
    }
    const adapter = this.app.vault.adapter;
    if (!(adapter instanceof FileSystemAdapter)) {
      new Notice("LaTeX Studio requires a desktop filesystem vault.");
      return;
    }

    this.compiling.add(file.path);
    this.setStatus(`Compiling ${file.name}…`);
    if (!quiet) new Notice(`Compiling ${file.name}…`);
    try {
      const result = await compileLatex(adapter.getFullPath(file.path), this.settings, adapter.getBasePath());
      await this.reportResult(result, view, adapter, quiet);
      if (result.ok) this.lastCompiledSource.set(file.path, source);
    } finally {
      this.compiling.delete(file.path);
      const pending = this.pendingCompile.get(file.path);
      this.pendingCompile.delete(file.path);
      if (pending && pending.source !== this.lastCompiledSource.get(file.path)) {
        void this.compileFile(file, pending.view, true, pending.source);
      }
    }
  }

  private async reportResult(
    result: CompileResult,
    view: LatexEditorView,
    adapter: FileSystemAdapter,
    quiet: boolean
  ): Promise<void> {
    if (!result.ok) {
      const firstError = result.diagnostics.find((item) => item.severity === "error");
      if (firstError?.line) view.focusLine(firstError.line);
      new Notice(firstError?.message ?? "LaTeX compilation failed.", 8000);
      this.setStatus("LaTeX compile failed");
      console.error("LaTeX Studio compilation failed", result.log);
      return;
    }

    if (!quiet) new Notice(`Compiled with ${result.engine} in ${(result.durationMs / 1000).toFixed(1)}s`);
    const relativePdfPath = path.relative(adapter.getBasePath(), result.pdfPath).split(path.sep).join("/");
    this.latestPdfPath = relativePdfPath;
    this.setStatus(`Compiled in ${(result.durationMs / 1000).toFixed(1)}s`);
    if (!this.settings.openPdfAfterCompile && !this.pdfLeaf) return;
    await this.openPdf(relativePdfPath);
  }

  private async openPdf(relativePdfPath: string): Promise<void> {
    const pdfFile = await this.waitForPdf(relativePdfPath);
    if (!pdfFile) {
      new Notice("PDF was compiled, but Obsidian has not indexed it yet. Try Toggle PDF preview again.");
      return;
    }
    if (this.pdfLeaf?.getViewState().state?.file === relativePdfPath) {
      this.app.workspace.revealLeaf(this.pdfLeaf);
      return;
    }
    if (!this.openingPdfLeaf) {
      this.openingPdfLeaf = (async () => {
        const leaf = this.pdfLeaf ?? this.app.workspace.getLeaf("split", "vertical");
        await leaf.openFile(pdfFile, { active: true });
        return leaf;
      })().finally(() => {
        this.openingPdfLeaf = null;
      });
    }

    this.pdfLeaf = await this.openingPdfLeaf;
  }

  private async waitForPdf(relativePdfPath: string): Promise<TFile | null> {
    for (let attempt = 0; attempt < 15; attempt += 1) {
      const file = this.app.vault.getFileByPath(relativePdfPath);
      if (file) return file;
      await new Promise((resolve) => window.setTimeout(resolve, 100));
    }
    return null;
  }

  private setStatus(text: string): void {
    this.statusEl?.setText(text);
  }
}

function sanitizeSettings(value: unknown): LatexStudioSettings {
  if (!isRecord(value)) return { ...DEFAULT_SETTINGS };

  const settings = { ...DEFAULT_SETTINGS };
  if (value.engine === "auto" || value.engine === "latexmk" || value.engine === "tectonic") {
    settings.engine = value.engine;
  }
  if (typeof value.latexmkPath === "string" && value.latexmkPath.trim()) {
    settings.latexmkPath = value.latexmkPath.trim();
  }
  if (typeof value.tectonicPath === "string" && value.tectonicPath.trim()) {
    settings.tectonicPath = value.tectonicPath.trim();
  }
  if (typeof value.compileOnSave === "boolean") {
    settings.compileOnSave = value.compileOnSave;
  }
  if (typeof value.compileDebounceMs === "number" && Number.isFinite(value.compileDebounceMs)) {
    settings.compileDebounceMs = Math.max(100, Math.min(10_000, value.compileDebounceMs));
  }
  if (typeof value.openPdfAfterCompile === "boolean") {
    settings.openPdfAfterCompile = value.openPdfAfterCompile;
  }
  return settings;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
