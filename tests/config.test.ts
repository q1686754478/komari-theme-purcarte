import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { DEFAULT_CONFIG } from "../src/config/default.js";
import {
  normalizeThemeConfig,
  normalizeThemeSettings,
  resolveThemeConfig,
} from "../src/config/normalize.js";
import {
  createConfigSaveAction,
  getActiveConfig,
  getBlurCssValue,
  getPreviewConfig,
} from "../src/config/runtime.js";

test("normalization prefers the correctly spelled background alignment", () => {
  const config = normalizeThemeConfig({
    backgroundAlignment: "contain,center",
    backagroundAlignment: "cover,bottom",
  });

  assert.equal(config.backgroundAlignment, "contain,center");
});

test("normalization preserves the legacy background alignment spelling", () => {
  const config = normalizeThemeConfig({
    backagroundAlignment: "contain,bottom",
  });

  assert.equal(config.backgroundAlignment, "contain,bottom");
});

test("partial settings migrate the legacy key without retaining the typo", () => {
  const settings = normalizeThemeSettings({
    backagroundAlignment: "contain,bottom",
  });

  assert.deepEqual(settings, { backgroundAlignment: "contain,bottom" });
});

test("partial settings do not invent an undefined alignment property", () => {
  assert.deepEqual(normalizeThemeSettings({}), {});
});

test("partial settings use the legacy alignment when the corrected key is null", () => {
  const settings = normalizeThemeSettings({
    backgroundAlignment: null,
    backagroundAlignment: "contain,center",
  });

  assert.deepEqual(settings, { backgroundAlignment: "contain,center" });
});

test("partial settings drop nullish alignment values", () => {
  const settings = normalizeThemeSettings({
    backgroundAlignment: null,
    backagroundAlignment: null,
  });

  assert.deepEqual(settings, {});
});

test("normalization falls back to the default background alignment", () => {
  const config = normalizeThemeConfig({});

  assert.equal(config.backgroundAlignment, DEFAULT_CONFIG.backgroundAlignment);
});

test("an empty imported replacement ignores the currently saved configuration", async () => {
  const persisted = resolveThemeConfig({
    visualPreset: "purcarte",
    backgroundAlignment: "contain,bottom",
  });
  const imported = resolveThemeConfig({});
  const preview = getPreviewConfig(true, true, imported);
  let saved = persisted;
  await createConfigSaveAction(imported, async (config) => {
    saved = config;
  })();
  const reloaded = resolveThemeConfig(saved);

  assert.equal(persisted.visualPreset, "purcarte");
  assert.equal(persisted.backgroundAlignment, "contain,bottom");
  assert.equal(imported.visualPreset, "nezha");
  assert.equal(imported.backgroundAlignment, "cover,top");
  assert.deepEqual(preview, imported);
  assert.deepEqual(saved, imported);
  assert.deepEqual(reloaded, imported);
});

test("the complete resolver filters unknown and nullish fields", () => {
  const imported = resolveThemeConfig({
    visualPreset: "purcarte",
    mainWidth: null,
    unknownSetting: "ignored",
  });

  assert.equal(imported.visualPreset, "purcarte");
  assert.equal(imported.mainWidth, DEFAULT_CONFIG.mainWidth);
  assert.equal("unknownSetting" in imported, false);
  assert.deepEqual(resolveThemeConfig(null), DEFAULT_CONFIG);
});

test("nullish imported alignment values resolve to the default", () => {
  const imported = resolveThemeConfig({
    backgroundAlignment: null,
    backagroundAlignment: null,
  });

  assert.equal(imported.backgroundAlignment, "cover,top");
});

test("an imported legacy alignment survives the complete resolver", () => {
  const imported = resolveThemeConfig({
    backagroundAlignment: "contain,bottom",
  });

  assert.equal(imported.backgroundAlignment, "contain,bottom");
});

test("an imported corrected alignment wins over the legacy spelling", () => {
  const imported = resolveThemeConfig({
    backgroundAlignment: "cover,left",
    backagroundAlignment: "contain,bottom",
  });

  assert.equal(imported.backgroundAlignment, "cover,left");
});

test("an imported PurCarte preset survives preview save and reload", async () => {
  const imported = resolveThemeConfig({ visualPreset: "purcarte" });
  const preview = getPreviewConfig(true, true, imported);
  let saved = resolveThemeConfig({ visualPreset: "nezha" });
  await createConfigSaveAction(imported, async (config) => {
    saved = config;
  })();
  const reloaded = resolveThemeConfig(saved);

  assert.equal(imported.visualPreset, "purcarte");
  assert.equal(preview?.visualPreset, "purcarte");
  assert.equal(saved.visualPreset, "purcarte");
  assert.equal(reloaded.visualPreset, "purcarte");
});

test("an imported Nezha preset survives preview save and reload", async () => {
  const imported = resolveThemeConfig({ visualPreset: "nezha" });
  const preview = getPreviewConfig(true, true, imported);
  let saved = resolveThemeConfig({ visualPreset: "purcarte" });
  await createConfigSaveAction(imported, async (config) => {
    saved = config;
  })();
  const reloaded = resolveThemeConfig(saved);

  assert.equal(imported.visualPreset, "nezha");
  assert.equal(preview?.visualPreset, "nezha");
  assert.equal(saved.visualPreset, "nezha");
  assert.equal(reloaded.visualPreset, "nezha");
});

test("preview lifecycle only exposes the full draft while enabled and open", () => {
  const persisted = resolveThemeConfig({ visualPreset: "purcarte" });
  let draft = resolveThemeConfig({ visualPreset: "purcarte" });

  assert.equal(getPreviewConfig(true, true, draft)?.visualPreset, "purcarte");

  assert.equal(getPreviewConfig(true, false, draft), null);
  draft = resolveThemeConfig({ visualPreset: "nezha" });
  const disabledPreview = getPreviewConfig(true, false, draft);
  assert.equal(disabledPreview, null);
  assert.equal(
    getActiveConfig(persisted, disabledPreview).visualPreset,
    "purcarte"
  );

  const restoredPreview = getPreviewConfig(true, true, draft);
  assert.equal(restoredPreview?.visualPreset, "nezha");

  const closedPreview = getPreviewConfig(false, true, draft);
  assert.equal(closedPreview, null);
  assert.equal(
    getActiveConfig(persisted, closedPreview).visualPreset,
    "purcarte"
  );
});

test("the imported save action captures the resolved imported config explicitly", async () => {
  const persisted = resolveThemeConfig({ visualPreset: "purcarte" });
  const imported = resolveThemeConfig({ visualPreset: "nezha" });
  let saved = persisted;
  const saveImported = createConfigSaveAction(imported, async (config) => {
    saved = config;
  });

  await saveImported();

  assert.equal(saved.visualPreset, "nezha");
});

test("an empty configuration uses the locked Nezha fork defaults", () => {
  const config = normalizeThemeConfig({});

  assert.deepEqual(
    {
      visualPreset: config.visualPreset,
      mainWidth: config.mainWidth,
      backgroundImage: config.backgroundImage,
      backgroundImageMobile: config.backgroundImageMobile,
      backgroundAlignment: config.backgroundAlignment,
      enableVideoBackground: config.enableVideoBackground,
      enableBlur: config.enableBlur,
      blurValue: config.blurValue,
      selectThemeColor: config.selectThemeColor,
      selectedDefaultAppearance: config.selectedDefaultAppearance,
      selectedHeaderStyle: config.selectedHeaderStyle,
      selectedFooterStyle: config.selectedFooterStyle,
      selectTrafficProgressStyle: config.selectTrafficProgressStyle,
    },
    {
      visualPreset: "nezha",
      mainWidth: 80,
      backgroundImage:
        "https://s2.loli.net/2023/03/24/NH3vuKOx1jipoBr.webp",
      backgroundImageMobile: "",
      backgroundAlignment: "cover,top",
      enableVideoBackground: false,
      enableBlur: false,
      blurValue: 0,
      selectThemeColor: "green",
      selectedDefaultAppearance: "light",
      selectedHeaderStyle: "fixed",
      selectedFooterStyle: "followContent",
      selectTrafficProgressStyle: "linear",
    }
  );
});

test("the managed configuration exposes the corrected alignment and preset", () => {
  const manifest = JSON.parse(
    readFileSync(new URL("../../komari-theme.json", import.meta.url), "utf8")
  ) as {
    configuration: {
      data: Array<{ key?: string; default?: unknown; options?: string }>;
    };
  };
  const fields = new Map(
    manifest.configuration.data
      .filter((field) => field.key)
      .map((field) => [field.key, field])
  );

  assert.equal(fields.has("backagroundAlignment"), false);
  assert.equal(fields.get("backgroundAlignment")?.default, "cover,top");
  assert.equal(fields.get("visualPreset")?.default, "nezha");
  assert.equal(fields.get("visualPreset")?.options, "purcarte,nezha");
});

test("disabled blur always resolves to zero pixels", () => {
  assert.equal(getBlurCssValue(false, 18), "0px");
});

test("enabled blur uses the configured blur value", () => {
  assert.equal(getBlurCssValue(true, 18), "18px");
});
