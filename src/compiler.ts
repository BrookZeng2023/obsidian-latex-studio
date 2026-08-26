import { execFile, type ExecFileException } from "node:child_process";
import path from "node:path";
import { parseDiagnostics } from "./diagnostics";
import type { CompileResult, EngineKind, LatexStudioSettings } from "./types";

const MAX_LOG_BYTES = 4 * 1024 * 1024;

interface ExecOutput {
  stdout: string;
  stderr: string;
}

interface CompilerError extends Error {
  code?: string | number | null;
  stdout?: string;
  stderr?: string;
}

interface CommandSpec {
  engine: Exclude<EngineKind, "auto">;
  executable: string;
  args: string[];
}

export async function compileLatex(
  absoluteTexPath: string,
  settings: LatexStudioSettings
): Promise<CompileResult> {
  const startedAt = Date.now();
  const workingDirectory = path.dirname(absoluteTexPath);
  const fileName = path.basename(absoluteTexPath);
  const pdfPath = path.join(workingDirectory, `${path.parse(fileName).name}.pdf`);
  const candidates = commandCandidates(fileName, settings);
  let lastFailure: unknown;

  for (const command of candidates) {
    try {
      const { stdout, stderr } = await runCompiler(command, workingDirectory);
      const log = `${stdout}\n${stderr}`.trim();
      return {
        ok: true,
        engine: command.engine,
        pdfPath,
        log,
        diagnostics: parseDiagnostics(log),
        durationMs: Date.now() - startedAt
      };
    } catch (error) {
      lastFailure = error;
      if (settings.engine !== "auto" || !isMissingExecutable(error)) {
        return failureResult(command.engine, pdfPath, error, startedAt);
      }
    }
  }

  return failureResult("tectonic", pdfPath, lastFailure, startedAt);
}

function commandCandidates(fileName: string, settings: LatexStudioSettings): CommandSpec[] {
  const latexmk: CommandSpec = {
    engine: "latexmk",
    executable: settings.latexmkPath || "latexmk",
    args: ["-pdf", "-interaction=nonstopmode", "-file-line-error", "-synctex=1", fileName]
  };
  const tectonic: CommandSpec = {
    engine: "tectonic",
    executable: settings.tectonicPath || "tectonic",
    args: ["--synctex", "--keep-logs", "--keep-intermediates", fileName]
  };

  if (settings.engine === "latexmk") return [latexmk];
  if (settings.engine === "tectonic") return [tectonic];
  return [latexmk, tectonic];
}

function isMissingExecutable(error: unknown): boolean {
  return isCompilerError(error) && error.code === "ENOENT";
}

function failureResult(
  engine: Exclude<EngineKind, "auto">,
  pdfPath: string,
  error: unknown,
  startedAt: number
): CompileResult {
  const stdout = getErrorText(error, "stdout");
  const stderr = getErrorText(error, "stderr");
  const message = error instanceof Error ? error.message : String(error ?? "Unknown compiler error");
  const log = [stdout, stderr, message].filter(Boolean).join("\n");
  const diagnostics = parseDiagnostics(log);
  if (diagnostics.length === 0) {
    diagnostics.push({ file: "", line: null, severity: "error", message });
  }
  return { ok: false, engine, pdfPath, log, diagnostics, durationMs: Date.now() - startedAt };
}

function getErrorText(error: unknown, key: "stdout" | "stderr"): string {
  if (!isCompilerError(error)) return "";
  return error[key] ?? "";
}

function isCompilerError(error: unknown): error is CompilerError {
  return error instanceof Error;
}

function runCompiler(command: CommandSpec, workingDirectory: string): Promise<ExecOutput> {
  return new Promise((resolve, reject: (reason: CompilerError) => void) => {
    execFile(command.executable, command.args, {
      cwd: workingDirectory,
      encoding: "utf8",
      maxBuffer: MAX_LOG_BYTES,
      timeout: 120_000,
      windowsHide: true
    }, (error: ExecFileException | null, stdout: string, stderr: string) => {
      if (error) {
        const compilerError: CompilerError = Object.assign(error, { stdout, stderr });
        reject(compilerError);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}
