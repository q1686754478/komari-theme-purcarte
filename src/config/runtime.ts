import type { ConfigOptions } from "./default.js";

export const getBlurCssValue = (enableBlur: boolean, blurValue: number) =>
  `${enableBlur ? blurValue : 0}px`;

export const getPreviewConfig = (
  isOpen: boolean,
  isPreviewing: boolean,
  editingConfig: ConfigOptions
): ConfigOptions | null =>
  isOpen && isPreviewing ? editingConfig : null;

export const getActiveConfig = (
  persistedConfig: ConfigOptions,
  previewConfig: ConfigOptions | null
): ConfigOptions => previewConfig ?? persistedConfig;

export const createConfigSaveAction = (
  configToSave: ConfigOptions,
  saveConfig: (config: ConfigOptions) => void | Promise<void>
): (() => Promise<void>) => async () => {
  await saveConfig(configToSave);
};
