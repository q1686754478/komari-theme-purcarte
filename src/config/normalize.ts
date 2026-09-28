import { DEFAULT_CONFIG, type ConfigOptions } from "./default.js";

export type ThemeSettings = {
  [Key in keyof ConfigOptions]?: ConfigOptions[Key] | null;
} & {
  backgroundAlignment?: string | null;
  backagroundAlignment?: string | null;
  [key: string]: unknown;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isValidConfigValue = (
  key: keyof ConfigOptions,
  value: unknown
): boolean => {
  if (value === null || value === undefined) return false;
  if (key === "visualPreset") {
    return value === "purcarte" || value === "nezha";
  }
  return typeof value === typeof DEFAULT_CONFIG[key];
};

const getValidAlignment = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0 ? value : undefined;

export const normalizeThemeSettings = (
  themeSettings: unknown
): Partial<ConfigOptions> => {
  if (!isObject(themeSettings)) return {};

  const settings: Partial<ConfigOptions> = {};

  for (const key of Object.keys(DEFAULT_CONFIG) as Array<keyof ConfigOptions>) {
    if (key === "backgroundAlignment") continue;
    const value = themeSettings[key];
    if (isValidConfigValue(key, value)) {
      (settings as unknown as Record<string, unknown>)[key] = value;
    }
  }

  const correctedAlignment = getValidAlignment(
    themeSettings.backgroundAlignment
  );
  const legacyAlignment = getValidAlignment(
    themeSettings.backagroundAlignment
  );
  const backgroundAlignment = correctedAlignment ?? legacyAlignment;

  return backgroundAlignment === undefined
    ? settings
    : { ...settings, backgroundAlignment };
};

export const resolveThemeConfig = (themeSettings: unknown): ConfigOptions => ({
  ...DEFAULT_CONFIG,
  ...normalizeThemeSettings(themeSettings),
});

export const normalizeThemeConfig = resolveThemeConfig;
