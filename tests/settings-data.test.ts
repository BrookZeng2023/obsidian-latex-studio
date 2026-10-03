import { describe, expect, it } from "vitest";
import { sanitizeSettings } from "../src/settings-data";

describe("sanitizeSettings", () => {
  it("keeps a persisted vault-root build location", () => {
    // #given
    const stored = { buildFilesLocation: "vault-root" };

    // #when
    const settings = sanitizeSettings(stored);

    // #then
    expect(settings.buildFilesLocation).toBe("vault-root");
  });

  it("uses the source-folder default when the setting is missing", () => {
    // #given
    const stored = {};

    // #when
    const settings = sanitizeSettings(stored);

    // #then
    expect(settings.buildFilesLocation).toBe("source-folder");
  });

  it("uses the source-folder default for an unknown build location", () => {
    // #given
    const stored = { buildFilesLocation: "somewhere-else" };

    // #when
    const settings = sanitizeSettings(stored);

    // #then
    expect(settings.buildFilesLocation).toBe("source-folder");
  });
});
