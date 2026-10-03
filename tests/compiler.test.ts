import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveBuildDirectory } from "../src/compiler";

const normalize = (value: string): string => value.split(path.sep).join("/");

describe("resolveBuildDirectory", () => {
  it("keeps the existing per-source-folder layout", () => {
    // #given
    const source = "/vault/campaign/character.tex";

    // #when
    const result = resolveBuildDirectory(source, "/vault", "source-folder");

    // #then
    expect(normalize(result)).toBe("/vault/campaign/.latex-studio/character");
  });

  it("mirrors the source path under the vault build directory", () => {
    // #given
    const source = "/vault/campaign/players/character.tex";

    // #when
    const result = resolveBuildDirectory(source, "/vault", "vault-root");

    // #then
    expect(normalize(result)).toBe("/vault/.latex-studio/campaign/players/character");
  });

  it("keeps same-named documents in separate vault build directories", () => {
    // #given
    const sources = ["/vault/alpha/main.tex", "/vault/beta/main.tex"];

    // #when
    const results = sources.map((source) => normalize(
      resolveBuildDirectory(source, "/vault", "vault-root")
    ));

    // #then
    expect(results).toEqual([
      "/vault/.latex-studio/alpha/main",
      "/vault/.latex-studio/beta/main"
    ]);
  });

  it("places a root-level document directly under the vault build directory", () => {
    // #given
    const source = "/vault/main.tex";

    // #when
    const result = resolveBuildDirectory(source, "/vault", "vault-root");

    // #then
    expect(normalize(result)).toBe("/vault/.latex-studio/main");
  });

  it("rejects a vault-root build directory for a source outside the vault", () => {
    // #given
    const source = "/other/main.tex";

    // #when
    const resolveOutsideVault = (): string => resolveBuildDirectory(
      source,
      "/vault",
      "vault-root"
    );

    // #then
    expect(resolveOutsideVault).toThrow("LaTeX source must be inside the Obsidian vault.");
  });
});
