import { App, PluginSettingTab, Setting } from "obsidian";
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
