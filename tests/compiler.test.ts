import { chmod, mkdtemp, mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { compileLatex } from "../src/compiler";
import type { LatexStudioSettings } from "../src/types";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { force: true, recursive: true })));
});

describe.sequential("compileLatex compiler executable paths", () => {
  it("runs the vault-root latexmk wrapper instead of a nested document-folder decoy", async () => {
    // #given
    const scenario = await createScenario(".obsidian/latexmk-sentinel", "vault-latexmk", "document-latexmk");

    // #when
    const observed = await compileAndObserve(scenario, {
      engine: "latexmk",
      latexmkPath: ".obsidian/latexmk-sentinel"
    });

    // #then
    expect(observed).toEqual(expectedObservation(scenario, "latexmk", "vault-latexmk"));
  });

  it("runs the vault-root tectonic wrapper instead of a nested document-folder decoy", async () => {
    // #given
    const scenario = await createScenario(".obsidian/tectonic-sentinel", "vault-tectonic", "document-tectonic");

    // #when
    const observed = await compileAndObserve(scenario, {
      engine: "tectonic",
      tectonicPath: ".obsidian/tectonic-sentinel"
    });

    // #then
    expect(observed).toEqual(expectedObservation(scenario, "tectonic", "vault-tectonic"));
  });

  it("resolves a dot-slash latexmk wrapper from the vault root", async () => {
    // #given
    const scenario = await createScenario("./tools/latexmk-sentinel", "vault-dot-latexmk", "document-dot-latexmk");

    // #when
    const observed = await compileAndObserve(scenario, {
      engine: "latexmk",
      latexmkPath: "./tools/latexmk-sentinel"
    });

    // #then
    expect(observed).toEqual(expectedObservation(scenario, "latexmk", "vault-dot-latexmk"));
  });

  it("resolves a dot-slash tectonic wrapper from the vault root", async () => {
    // #given
    const scenario = await createScenario("./tools/tectonic-sentinel", "vault-dot-tectonic", "document-dot-tectonic");

    // #when
    const observed = await compileAndObserve(scenario, {
      engine: "tectonic",
      tectonicPath: "./tools/tectonic-sentinel"
    });

    // #then
    expect(observed).toEqual(expectedObservation(scenario, "tectonic", "vault-dot-tectonic"));
  });

  it("falls back to the vault-root tectonic wrapper when the vault-root latexmk wrapper is absent", async () => {
    // #given
    const scenario = await createScenario(".obsidian/tectonic-sentinel", "vault-fallback-tectonic", "document-fallback-tectonic");
    await createCompilerExecutable(
      path.join(scenario.documentDirectory, ".obsidian", "missing-latexmk"),
      "document-fallback-latexmk"
    );

    // #when
    const observed = await compileAndObserve(scenario, {
      engine: "auto",
      latexmkPath: ".obsidian/missing-latexmk",
      tectonicPath: ".obsidian/tectonic-sentinel"
    });

    // #then
    expect(observed).toEqual(expectedObservation(scenario, "tectonic", "vault-fallback-tectonic"));
  });

  it("keeps a bare latexmk command on PATH", async () => {
    // #given
    const scenario = await createScenario("unused", "unused-root", "unused-document");
    const binDirectory = path.join(scenario.vaultRoot, "bin");
    await createCompilerExecutable(path.join(binDirectory, "latexmk-path-sentinel"), "path-latexmk");
    const originalPath = process.env.PATH;
    process.env.PATH = `${binDirectory}${path.delimiter}${originalPath ?? ""}`;

    try {
      // #when
      const observed = await compileAndObserve(scenario, {
        engine: "latexmk",
        latexmkPath: "latexmk-path-sentinel"
      });

      // #then
      expect(observed).toEqual(expectedObservation(scenario, "latexmk", "path-latexmk"));
    } finally {
      process.env.PATH = originalPath;
    }
  });

  it("keeps an absolute tectonic executable unchanged", async () => {
    // #given
    const scenario = await createScenario("unused", "unused-root", "unused-document");
    const absoluteExecutable = path.join(scenario.vaultRoot, "absolute", "tectonic-sentinel");
    await createCompilerExecutable(absoluteExecutable, "absolute-tectonic");

    // #when
    const observed = await compileAndObserve(scenario, {
      engine: "tectonic",
      tectonicPath: absoluteExecutable
    });

    // #then
    expect(observed).toEqual(expectedObservation(scenario, "tectonic", "absolute-tectonic"));
  });

  it("keeps empty default names on PATH during auto fallback", async () => {
    // #given
    const scenario = await createScenario("unused", "unused-root", "unused-document");
    const binDirectory = path.join(scenario.vaultRoot, "bin");
    await createCompilerExecutable(path.join(binDirectory, "tectonic"), "path-default-tectonic");
    const originalPath = process.env.PATH;
    process.env.PATH = `${binDirectory}${path.delimiter}${originalPath ?? ""}`;

    try {
      // #when
      const observed = await compileAndObserve(scenario, {
        engine: "auto",
        latexmkPath: "",
        tectonicPath: ""
      });

      // #then
      expect(observed).toEqual(expectedObservation(scenario, "tectonic", "path-default-tectonic"));
    } finally {
      process.env.PATH = originalPath;
    }
  });
});

interface CompilerScenario {
  vaultRoot: string;
  documentDirectory: string;
  compilerCwd: string;
  texPath: string;
}

async function createScenario(
  relativeExecutablePath: string,
  vaultIdentity: string,
  documentIdentity: string
): Promise<CompilerScenario> {
  const vaultRoot = await mkdtemp(path.join(os.tmpdir(), "latex-studio-compiler-"));
  temporaryDirectories.push(vaultRoot);
  const documentDirectory = path.join(vaultRoot, "projects", "deep");
  const texPath = path.join(documentDirectory, "document.tex");
  await mkdir(documentDirectory, { recursive: true });
  await writeFile(texPath, "\\documentclass{article}", "utf8");
  await createCompilerExecutable(path.join(vaultRoot, relativeExecutablePath), vaultIdentity);
  await createCompilerExecutable(path.join(documentDirectory, relativeExecutablePath), documentIdentity);
  return { vaultRoot, documentDirectory, compilerCwd: await realpath(documentDirectory), texPath };
}

async function createCompilerExecutable(executablePath: string, identity: string): Promise<void> {
  await mkdir(path.dirname(executablePath), { recursive: true });
  await writeFile(executablePath, `#!/bin/sh
arguments="$*"
output_directory=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    -outdir=*) output_directory="\${1#-outdir=}" ;;
    --outdir) shift; output_directory="$1" ;;
  esac
  shift
done
mkdir -p "$output_directory"
printf 'PDF:${identity}' > "$output_directory/document.pdf"
printf '${identity}|cwd=%s|argv=%s\\n' "$PWD" "$arguments"
`, "utf8");
  await chmod(executablePath, 0o755);
}

async function compileAndObserve(
  scenario: CompilerScenario,
  overrides: Partial<LatexStudioSettings>
): Promise<{ result: { ok: boolean; engine: string; pdfPath: string; log: string }; pdf: string }> {
  const result = await compileLatex(scenario.texPath, settings(overrides), scenario.vaultRoot);
  return {
    result: {
      ok: result.ok,
      engine: result.engine,
      pdfPath: result.pdfPath,
      log: result.log
    },
    pdf: await readFile(path.join(scenario.documentDirectory, "document.pdf"), "utf8")
  };
}

function expectedObservation(
  scenario: CompilerScenario,
  engine: "latexmk" | "tectonic",
  identity: string
): { result: { ok: boolean; engine: string; pdfPath: string; log: string }; pdf: string } {
  const buildDirectory = path.join(scenario.documentDirectory, ".latex-studio", "document");
  const argumentsForEngine = engine === "latexmk"
    ? `-pdf -interaction=nonstopmode -file-line-error -synctex=1 -outdir=${buildDirectory} document.tex`
    : `--synctex --keep-logs --keep-intermediates --outdir ${buildDirectory} document.tex`;
  return {
    result: {
      ok: true,
      engine,
      pdfPath: path.join(scenario.documentDirectory, "document.pdf"),
      log: `${identity}|cwd=${scenario.compilerCwd}|argv=${argumentsForEngine}`
    },
    pdf: `PDF:${identity}`
  };
}

function settings(overrides: Partial<LatexStudioSettings>): LatexStudioSettings {
  return {
    engine: "latexmk",
    latexmkPath: "latexmk",
    tectonicPath: "tectonic",
    compileOnSave: false,
    compileDebounceMs: 500,
    openPdfAfterCompile: false,
    ...overrides
  };
}
