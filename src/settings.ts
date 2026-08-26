import { App, PluginSettingTab, Setting, type SettingDefinitionItem } from "obsidian";
import type LatexStudioPlugin from "./main";
import type { LatexStudioSettings } from "./types";

export const DEFAULT_SETTINGS: LatexStudioSettings = {
  engine: "auto",
  latexmkPath: "latexmk",
  tectonicPath: "tectonic",
  compileOnSave: true,
  compileDebounceMs: 700,
  openPdfAfterCompile: true
};

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
      .setName("Compile on save")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.compileOnSave)
        .onChange(async (value) => {
          this.plugin.settings.compileOnSave = value;
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
        name: "Compile on save",
        control: {
          type: "toggle",
          key: "compileOnSave",
          defaultValue: DEFAULT_SETTINGS.compileOnSave
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
    } else if ((key === "latexmkPath" || key === "tectonicPath") && typeof value === "string") {
      this.plugin.settings[key] = value.trim() || DEFAULT_SETTINGS[key];
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
