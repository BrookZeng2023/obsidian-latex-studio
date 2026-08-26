import { describe, expect, it } from "vitest";
import { parseDiagnostics } from "../src/diagnostics";

describe("parseDiagnostics", () => {
  it("extracts file-line errors", () => {
    const result = parseDiagnostics("./main.tex:12: Undefined control sequence.");
    expect(result).toEqual([{
      file: "./main.tex",
      line: 12,
      severity: "error",
      message: "Undefined control sequence."
    }]);
  });

  it("extracts and deduplicates warnings", () => {
    const log = "LaTeX Warning: Label(s) may have changed.\nLaTeX Warning: Label(s) may have changed.";
    expect(parseDiagnostics(log)).toHaveLength(1);
    expect(parseDiagnostics(log)[0].severity).toBe("warning");
  });
});
