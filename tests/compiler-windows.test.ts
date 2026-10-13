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

vi.mock("node:path", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:path")>();
  return { ...actual, default: actual.win32 };
});

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

describe("compileLatex Windows executable selection", () => {
  it.each([
    {
      name: "anchors a forward-slash latexmk path at the vault root",
      engine: "latexmk" as const,
      executable: ".obsidian/latexmk-lualatex",
      expectedExecutable: "C:\\vault\\.obsidian\\latexmk-lualatex",
      expectedArgs: [
        "-pdf",
        "-interaction=nonstopmode",
        "-file-line-error",
        "-synctex=1",
        "-outdir=C:\\vault\\projects\\deep\\.latex-studio\\paper",
        "paper.tex"
      ]
    },
    {
      name: "anchors a backslash latexmk path at the vault root",
      engine: "latexmk" as const,
      executable: ".\\tools\\latexmk.exe",
      expectedExecutable: "C:\\vault\\tools\\latexmk.exe",
      expectedArgs: [
        "-pdf",
        "-interaction=nonstopmode",
        "-file-line-error",
        "-synctex=1",
        "-outdir=C:\\vault\\projects\\deep\\.latex-studio\\paper",
        "paper.tex"
      ]
    },
    {
      name: "anchors a dot-slash tectonic path at the vault root",
      engine: "tectonic" as const,
      executable: "./tools/tectonic.exe",
      expectedExecutable: "C:\\vault\\tools\\tectonic.exe",
      expectedArgs: [
        "--synctex",
        "--keep-logs",
        "--keep-intermediates",
        "--outdir",
        "C:\\vault\\projects\\deep\\.latex-studio\\paper",
        "paper.tex"
      ]
    },
    {
      name: "anchors a backslash tectonic path at the vault root",
      engine: "tectonic" as const,
      executable: ".obsidian\\tectonic.exe",
      expectedExecutable: "C:\\vault\\.obsidian\\tectonic.exe",
      expectedArgs: [
        "--synctex",
        "--keep-logs",
        "--keep-intermediates",
        "--outdir",
        "C:\\vault\\projects\\deep\\.latex-studio\\paper",
        "paper.tex"
      ]
    }
  ])("$name", async ({ engine, executable, expectedExecutable, expectedArgs }) => {
    // #given
    const settings = compilerSettings(engine, executable);

    // #when
    await compileLatex("C:\\vault\\projects\\deep\\paper.tex", settings, "C:\\vault");

    // #then
    expect(captured.invocations).toEqual([{
      executable: expectedExecutable,
      args: expectedArgs,
      cwd: "C:\\vault\\projects\\deep"
    }]);
  });

  it("keeps a bare latexmk name for Windows PATH lookup", async () => {
    // #given
    const settings = compilerSettings("latexmk", "latexmk");

    // #when
    await compileLatex("C:\\vault\\projects\\deep\\paper.tex", settings, "C:\\vault");

    // #then
    expect(captured.invocations).toEqual([{
      executable: "latexmk",
      args: ["-pdf", "-interaction=nonstopmode", "-file-line-error", "-synctex=1", "-outdir=C:\\vault\\projects\\deep\\.latex-studio\\paper", "paper.tex"],
      cwd: "C:\\vault\\projects\\deep"
    }]);
  });

  it("keeps the empty tectonic default name for Windows PATH lookup", async () => {
    // #given
    const settings = compilerSettings("tectonic", "");

    // #when
    await compileLatex("C:\\vault\\projects\\deep\\paper.tex", settings, "C:\\vault");

    // #then
    expect(captured.invocations).toEqual([{
      executable: "tectonic",
      args: ["--synctex", "--keep-logs", "--keep-intermediates", "--outdir", "C:\\vault\\projects\\deep\\.latex-studio\\paper", "paper.tex"],
      cwd: "C:\\vault\\projects\\deep"
    }]);
  });

  it.each([
    "D:\\portable\\tectonic.exe",
    "\\\\server\\share\\tectonic.exe"
  ])("keeps the absolute Windows executable %s unchanged", async (executable) => {
    // #given
    const settings = compilerSettings("tectonic", executable);

    // #when
    await compileLatex("C:\\vault\\projects\\deep\\paper.tex", settings, "C:\\vault");

    // #then
    expect(captured.invocations).toEqual([{
      executable,
      args: ["--synctex", "--keep-logs", "--keep-intermediates", "--outdir", "C:\\vault\\projects\\deep\\.latex-studio\\paper", "paper.tex"],
      cwd: "C:\\vault\\projects\\deep"
    }]);
  });
});

function compilerSettings(engine: "latexmk" | "tectonic", executable: string): LatexStudioSettings {
  return {
    engine,
    latexmkPath: engine === "latexmk" ? executable : "latexmk",
    tectonicPath: engine === "tectonic" ? executable : "tectonic",
    compileOnSave: false,
    compileDebounceMs: 500,
    openPdfAfterCompile: false
  };
}
