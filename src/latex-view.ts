import { StreamLanguage } from "@codemirror/language";
import { stex } from "@codemirror/legacy-modes/mode/stex";
import { EditorState } from "@codemirror/state";
import { EditorView, basicSetup } from "codemirror";
import { TextFileView, WorkspaceLeaf } from "obsidian";
import type LatexStudioPlugin from "./main";

export const LATEX_VIEW_TYPE = "latex-studio-editor";

export class LatexEditorView extends TextFileView {
  private editor: EditorView | null = null;
  private loadedText = "";
  private saveTimer: number | null = null;

  constructor(leaf: WorkspaceLeaf, private readonly plugin: LatexStudioPlugin) {
    super(leaf);
  }

  getViewType(): string {
    return LATEX_VIEW_TYPE;
  }

  getDisplayText(): string {
    return this.file?.basename ?? "LaTeX";
  }

  async onOpen(): Promise<void> {
    this.contentEl.empty();
    this.contentEl.addClass("latex-studio-editor-view");
    this.editor = new EditorView({
      parent: this.contentEl,
      state: EditorState.create({
        doc: this.loadedText,
        extensions: [
          basicSetup,
          StreamLanguage.define(stex),
          EditorView.lineWrapping,
          EditorView.updateListener.of((update) => {
            if (!update.docChanged) return;
            this.scheduleSave();
          })
        ]
      })
    });
    this.addAction("play", "Compile LaTeX", () => void this.plugin.compileView(this));
    this.addAction("panel-right-open", "Toggle PDF preview", () => void this.plugin.togglePdfPreview(this));
  }

  async onClose(): Promise<void> {
    if (this.saveTimer !== null) window.clearTimeout(this.saveTimer);
    await this.save();
    this.editor?.destroy();
    this.editor = null;
  }

  getViewData(): string {
    return this.editor?.state.doc.toString() ?? this.loadedText;
  }

  setViewData(data: string, clear: boolean): void {
    this.loadedText = data;
    if (!this.editor) return;
    const current = this.editor.state.doc.toString();
    if (clear || current !== data) {
      this.editor.dispatch({ changes: { from: 0, to: current.length, insert: data } });
    }
  }

  clear(): void {
    this.loadedText = "";
    if (this.editor) {
      this.editor.dispatch({ changes: { from: 0, to: this.editor.state.doc.length, insert: "" } });
    }
  }

  focusLine(line: number): void {
    if (!this.editor || line < 1 || line > this.editor.state.doc.lines) return;
    const target = this.editor.state.doc.line(line);
    this.editor.dispatch({ selection: { anchor: target.from }, scrollIntoView: true });
    this.editor.focus();
  }

  private scheduleSave(): void {
    if (this.saveTimer !== null) window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => {
      void this.save().then(() => {
        if (this.plugin.settings.compileOnSave) void this.plugin.compileView(this, true);
      });
    }, this.plugin.settings.compileDebounceMs);
  }
}
