import { execFile, type ChildProcess, type ExecFileOptions } from "node:child_process";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { compileLatex } from "../src/compiler";
import type { LatexStudioSettings } from "../src/types";

interface Invocation {
  executable: string;
  args: string[];
  cwd: string | undefined;
}

const captured = vi.hoisted(() => ({ invocations: [] as Invocation[] }));

vi.mock("node:child_process", () => ({ execFile: vi.fn() }));
vi.mock("node:fs/promises", () => ({ copyFile: vi.fn(), mkdir: vi.fn() }));

beforeEach(() => {
  captured.invocations.splice(0);
  vi.mocked(execFile).mockImplementation((executable, args, options, callback) => {
    const cwd = (options as ExecFileOptions).cwd;
    captured.invocations.push({
      executable,
      args: Array.isArray(args) ? [...args] : [],
      cwd: typeof cwd === "string" ? cwd : undefined
    });
    if (typeof callback === "function") callback(null, "", "");
    return undefined as unknown as ChildProcess;
  });
});

describe("compileLatex POSIX executable selection", () => {
  it("keeps a backslash-only latexmk name for POSIX PATH lookup", async () => {
    // #given
    const settings: LatexStudioSettings = {
      engine: "latexmk",
      latexmkPath: "tools\\latexmk",
      tectonicPath: "tectonic",
      compileOnSave: false,
      compileDebounceMs: 500,
      openPdfAfterCompile: false
    };

    // #when
    await compileLatex("/vault/projects/deep/paper.tex", settings, "/vault");

    // #then
    expect(captured.invocations).toEqual([{
      executable: "tools\\latexmk",
      args: ["-pdf", "-interaction=nonstopmode", "-file-line-error", "-synctex=1", "-outdir=/vault/projects/deep/.latex-studio/paper", "paper.tex"],
      cwd: "/vault/projects/deep"
    }]);
  });
});
