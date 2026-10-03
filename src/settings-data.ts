import type { LatexStudioSettings } from "./types";

export const DEFAULT_SETTINGS: LatexStudioSettings = {
  engine: "auto",
  latexmkPath: "latexmk",
  tectonicPath: "tectonic",
  buildFilesLocation: "source-folder",
  compileOnSave: true,
  compileDebounceMs: 2500,
  openPdfAfterCompile: true
};

export function sanitizeSettings(value: unknown): LatexStudioSettings {
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
  if (value.buildFilesLocation === "source-folder" || value.buildFilesLocation === "vault-root") {
    settings.buildFilesLocation = value.buildFilesLocation;
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
