import { App, PluginSettingTab, Setting, type SettingDefinitionItem } from "obsidian";
import type LatexStudioPlugin from "./main";
import type { LatexStudioSettings } from "./types";
import { DEFAULT_SETTINGS } from "./settings-data";

export { DEFAULT_SETTINGS } from "./settings-data";

export class LatexStudioSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: LatexStudioPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Compiler engine")
      .setDesc("Auto tries latexmk first, then Tectonic if latexmk is unavailable.")
      .addDropdown((dropdown) => dropdown
        .addOptions({ auto: "Auto", latexmk: "latexmk", tectonic: "Tectonic" })
        .setValue(this.plugin.settings.engine)
        .onChange(async (value) => {
          this.plugin.settings.engine = value as LatexStudioSettings["engine"];
          await this.plugin.saveSettings();
        }));

    this.addTextSetting("latexmk executable", "latexmkPath", "latexmk");
    this.addTextSetting("Tectonic executable", "tectonicPath", "tectonic");

    new Setting(containerEl)
      .setName("Build files location")
      .setDesc("Choose where logs, auxiliary files, and SyncTeX data are stored. Compiled PDFs remain next to their source files.")
      .addDropdown((dropdown) => dropdown
        .addOptions({
          "source-folder": "Per source folder",
          "vault-root": "Vault root"
        })
        .setValue(this.plugin.settings.buildFilesLocation)
        .onChange(async (value) => {
          this.plugin.settings.buildFilesLocation = value as LatexStudioSettings["buildFilesLocation"];
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Compile on save")
      .setDesc("Waits until typing stops, then compiles only when the source changed.")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.compileOnSave)
        .onChange(async (value) => {
          this.plugin.settings.compileOnSave = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Live preview delay")
      .setDesc("Longer delays avoid repeatedly compiling while you are still typing.")
      .addSlider((slider) => slider
        .setLimits(500, 5000, 250)
        .setDynamicTooltip()
        .setValue(this.plugin.settings.compileDebounceMs)
        .onChange(async (value) => {
          this.plugin.settings.compileDebounceMs = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Open PDF after compilation")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.openPdfAfterCompile)
        .onChange(async (value) => {
          this.plugin.settings.openPdfAfterCompile = value;
          await this.plugin.saveSettings();
        }));
  }

  getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      {
        name: "Compiler engine",
        desc: "Auto tries latexmk first, then Tectonic if latexmk is unavailable.",
        control: {
          type: "dropdown",
          key: "engine",
          options: { auto: "Auto", latexmk: "latexmk", tectonic: "Tectonic" },
          defaultValue: DEFAULT_SETTINGS.engine
        }
      },
      {
        name: "latexmk executable",
        desc: "Use a command on PATH or an absolute executable path.",
        control: {
          type: "text",
          key: "latexmkPath",
          placeholder: "latexmk",
          defaultValue: DEFAULT_SETTINGS.latexmkPath
        }
      },
      {
        name: "Tectonic executable",
        desc: "Use a command on PATH or an absolute executable path.",
        control: {
          type: "text",
          key: "tectonicPath",
          placeholder: "tectonic",
          defaultValue: DEFAULT_SETTINGS.tectonicPath
        }
      },
      {
        name: "Build files location",
        desc: "Choose where logs, auxiliary files, and SyncTeX data are stored. Compiled PDFs remain next to their source files.",
        control: {
          type: "dropdown",
          key: "buildFilesLocation",
          options: {
            "source-folder": "Per source folder",
            "vault-root": "Vault root"
          },
          defaultValue: DEFAULT_SETTINGS.buildFilesLocation
        }
      },
      {
        name: "Compile on save",
        desc: "Waits until typing stops, then compiles only when the source changed.",
        control: {
          type: "toggle",
          key: "compileOnSave",
          defaultValue: DEFAULT_SETTINGS.compileOnSave
        }
      },
      {
        name: "Live preview delay",
        desc: "Longer delays avoid repeatedly compiling while you are still typing.",
        control: {
          type: "slider",
          key: "compileDebounceMs",
          min: 500,
          max: 5000,
          step: 250,
          defaultValue: DEFAULT_SETTINGS.compileDebounceMs,
          displayFormat: (value) => `${(value / 1000).toFixed(2)}s`
        }
      },
      {
        name: "Open PDF after compilation",
        control: {
          type: "toggle",
          key: "openPdfAfterCompile",
          defaultValue: DEFAULT_SETTINGS.openPdfAfterCompile
        }
      }
    ];
  }

  getControlValue(key: string): unknown {
    if (isSettingsKey(key)) return this.plugin.settings[key];
    return undefined;
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    if (!isSettingsKey(key)) return;

    if (key === "engine" && (value === "auto" || value === "latexmk" || value === "tectonic")) {
      this.plugin.settings.engine = value;
    } else if (key === "buildFilesLocation"
      && (value === "source-folder" || value === "vault-root")) {
      this.plugin.settings.buildFilesLocation = value;
    } else if ((key === "latexmkPath" || key === "tectonicPath") && typeof value === "string") {
      this.plugin.settings[key] = value.trim() || DEFAULT_SETTINGS[key];
    } else if (key === "compileDebounceMs" && typeof value === "number" && Number.isFinite(value)) {
      this.plugin.settings.compileDebounceMs = Math.max(500, Math.min(5000, value));
    } else if ((key === "compileOnSave" || key === "openPdfAfterCompile") && typeof value === "boolean") {
      this.plugin.settings[key] = value;
    } else {
      return;
    }

    await this.plugin.saveSettings();
  }

  private addTextSetting(
    name: string,
    key: "latexmkPath" | "tectonicPath",
    placeholder: string
  ): void {
    new Setting(this.containerEl)
      .setName(name)
      .setDesc("Use a command on PATH or an absolute executable path.")
      .addText((text) => text
        .setPlaceholder(placeholder)
        .setValue(this.plugin.settings[key])
        .onChange(async (value) => {
          this.plugin.settings[key] = value.trim() || placeholder;
          await this.plugin.saveSettings();
        }));
  }
}

function isSettingsKey(key: string): key is keyof LatexStudioSettings {
  return key in DEFAULT_SETTINGS;
}
