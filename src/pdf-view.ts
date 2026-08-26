import { ItemView, WorkspaceLeaf } from "obsidian";

export const PDF_VIEW_TYPE = "latex-studio-pdf";

export class LatexPdfView extends ItemView {
  private frame: HTMLIFrameElement | null = null;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string {
    return PDF_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "LaTeX PDF";
  }

  getIcon(): string {
    return "file-text";
  }

  async onOpen(): Promise<void> {
    this.contentEl.empty();
    this.contentEl.addClass("latex-studio-pdf-view");
    this.frame = this.contentEl.createEl("iframe", {
      attr: { title: "Compiled LaTeX PDF" }
    });
  }

  show(resourceUrl: string): void {
    if (!this.frame) return;
    this.frame.src = `${resourceUrl}?ts=${Date.now()}#toolbar=1&navpanes=0`;
  }
}
