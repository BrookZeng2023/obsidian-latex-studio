export type EngineKind = "auto" | "latexmk" | "tectonic";

export interface LatexStudioSettings {
  engine: EngineKind;
  latexmkPath: string;
  tectonicPath: string;
  compileOnSave: boolean;
  compileDebounceMs: number;
  openPdfAfterCompile: boolean;
}

export interface Diagnostic {
  file: string;
  line: number | null;
  severity: "error" | "warning";
  message: string;
}

export interface CompileResult {
  ok: boolean;
  engine: Exclude<EngineKind, "auto">;
  pdfPath: string;
  log: string;
  diagnostics: Diagnostic[];
  durationMs: number;
}
