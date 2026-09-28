import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { JSDOM } from "jsdom";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { toast } from "sonner";

import SettingsPanel from "../src/components/settings/SettingsPanel.js";
import { ConfigProvider } from "../src/config/ConfigProvider.js";
import { DEFAULT_CONFIG, type ConfigOptions } from "../src/config/default.js";
import { useAppConfig } from "../src/config/hooks.js";
import { apiService } from "../src/services/api.js";
import type { PublicInfo } from "../src/types/node.js";

interface ProbeSnapshot {
  active: {
    visualPreset: ConfigOptions["visualPreset"];
    backgroundAlignment: string;
  };
  preview: ConfigOptions | null;
}

interface ToastSuccessOptions {
  action?: {
    label: string;
    onClick: () => void | Promise<void>;
  };
}

interface ToastSuccessCall {
  message: unknown;
  options?: ToastSuccessOptions;
}

interface LifecycleHarness {
  dom: JSDOM;
  root: Root;
  savedPayloads: ConfigOptions[];
  successToasts: ToastSuccessCall[];
  closeCount: () => number;
  cleanup: () => Promise<void>;
  clickButton: (label: string) => Promise<void>;
  importConfig: (config: unknown) => Promise<void>;
  readSnapshot: () => ProbeSnapshot;
  unmountPanel: () => Promise<void>;
  waitFor: (predicate: () => boolean, message: string) => Promise<void>;
}

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

const installDom = () => {
  const dom = new JSDOM(
    "<!doctype html><html><body><div id='root'></div></body></html>",
    { pretendToBeVisual: true, url: "http://localhost/" }
  );
  const originalDescriptors = new Map<
    PropertyKey,
    PropertyDescriptor | undefined
  >();

  const installGlobal = (key: PropertyKey, value: unknown) => {
    originalDescriptors.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value,
    });
  };

  const windowGlobals = [
    "window",
    "document",
    "navigator",
    "location",
    "HTMLElement",
    "HTMLInputElement",
    "Element",
    "Node",
    "Event",
    "MouseEvent",
    "CustomEvent",
    "File",
    "FileReader",
    "MutationObserver",
    "DOMRect",
  ] as const;
  const windowRecord = dom.window as unknown as Record<string, unknown>;

  for (const key of windowGlobals) {
    installGlobal(key, key === "window" ? dom.window : windowRecord[key]);
  }

  installGlobal("self", dom.window);
  installGlobal(
    "getComputedStyle",
    dom.window.getComputedStyle.bind(dom.window)
  );
  installGlobal(
    "requestAnimationFrame",
    dom.window.requestAnimationFrame.bind(dom.window)
  );
  installGlobal(
    "cancelAnimationFrame",
    dom.window.cancelAnimationFrame.bind(dom.window)
  );
  installGlobal("IS_REACT_ACT_ENVIRONMENT", true);

  Object.defineProperty(dom.window, "innerWidth", {
    configurable: true,
    value: 1024,
  });
  dom.window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;

  class TestResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(dom.window, "ResizeObserver", {
    configurable: true,
    value: TestResizeObserver,
  });
  installGlobal("ResizeObserver", TestResizeObserver);

  return {
    dom,
    restore: () => {
      for (const [key, descriptor] of originalDescriptors) {
        if (descriptor) {
          Object.defineProperty(globalThis, key, descriptor);
        } else {
          Reflect.deleteProperty(globalThis, key);
        }
      }
      dom.window.close();
    },
  };
};

const createPublicInfo = (themeSettings: object): PublicInfo => ({
  allow_cors: false,
  custom_body: "",
  custom_head: "",
  description: "",
  disable_password_login: false,
  oauth_enable: false,
  oauth_provider: null,
  ping_record_preserve_time: 0,
  private_site: false,
  record_enabled: false,
  record_preserve_time: 0,
  sitename: "Lifecycle Test",
  theme: "PurCarte",
  theme_settings: themeSettings,
});

const ConfigProbe = () => {
  const config = useAppConfig();
  const previewConfig: ConfigOptions | null = config.previewConfig;
  const snapshot: ProbeSnapshot = {
    active: {
      visualPreset: config.visualPreset,
      backgroundAlignment: config.backgroundAlignment,
    },
    preview: previewConfig,
  };

  return <output id="config-probe">{JSON.stringify(snapshot)}</output>;
};

const createHarness = async (
  t: TestContext,
  initialSettings: object
): Promise<LifecycleHarness> => {
  const { dom, restore } = installDom();
  const originalCheckSiteStatus = apiService.checkSiteStatus;
  const originalSaveThemeSettings = apiService.saveThemeSettings;
  const originalFetch = globalThis.fetch;
  const originalToastSuccess = toast.success;
  let persistedSettings: object = initialSettings;
  let closeCalls = 0;
  let includePanel = true;
  const savedPayloads: ConfigOptions[] = [];
  const successToasts: ToastSuccessCall[] = [];

  apiService.checkSiteStatus = async () => ({
    status: "public",
    publicInfo: createPublicInfo(persistedSettings),
  });
  apiService.saveThemeSettings = async (_theme, settings) => {
    const payload = settings as ConfigOptions;
    savedPayloads.push(payload);
    persistedSettings = payload;
    return { status: "success", message: "", data: null };
  };
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ configuration: { data: [] } }), {
      headers: { "Content-Type": "application/json" },
    });
  toast.success = ((message: unknown, options?: ToastSuccessOptions) => {
    successToasts.push({ message, options });
    return `success-${successToasts.length}`;
  }) as typeof toast.success;

  const container = dom.window.document.getElementById("root");
  assert.ok(container);
  const root = createRoot(container);

  const TestApp = ({ showPanel }: { showPanel: boolean }) => (
    <ConfigProvider>
      <ConfigProbe />
      {showPanel && (
        <SettingsPanel
          isOpen
          onClose={() => {
            closeCalls += 1;
          }}
        />
      )}
    </ConfigProvider>
  );

  const render = async () => {
    await act(async () => {
      root.render(<TestApp showPanel={includePanel} />);
      await wait(325);
    });
  };

  const readSnapshot = (): ProbeSnapshot => {
    const probe = dom.window.document.getElementById("config-probe");
    assert.ok(probe, "ConfigProvider probe should be mounted");
    return JSON.parse(probe.textContent || "") as ProbeSnapshot;
  };

  const waitFor = async (
    predicate: () => boolean,
    message: string
  ): Promise<void> => {
    const deadline = Date.now() + 1500;
    while (Date.now() < deadline) {
      if (predicate()) return;
      await act(async () => {
        await wait(10);
      });
    }
    assert.fail(message);
  };

  const clickButton = async (label: string) => {
    const button = Array.from(dom.window.document.querySelectorAll("button")).find(
      (candidate) => candidate.textContent?.trim() === label
    );
    assert.ok(button, `button '${label}' should exist`);
    await act(async () => {
      button.click();
      await wait(0);
    });
  };

  const importConfig = async (config: unknown) => {
    const input = dom.window.document.querySelector<HTMLInputElement>(
      "input[type='file']"
    );
    assert.ok(input, "the real SettingsPanel file input should exist");
    const file = new dom.window.File([JSON.stringify(config)], "config.json", {
      type: "application/json",
    });
    Object.defineProperty(input, "files", {
      configurable: true,
      value: [file],
    });
    const previousToastCount = successToasts.length;
    await act(async () => {
      input.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
      await wait(20);
    });
    await waitFor(
      () => successToasts.length > previousToastCount,
      "the import success toast should be emitted"
    );
  };

  const cleanup = async () => {
    await act(async () => {
      root.unmount();
      // ConfigProvider intentionally delays its loaded transition by 300 ms.
      // Keep the DOM installed until any reload timer has drained.
      await wait(325);
    });
    toast.dismiss();
    apiService.checkSiteStatus = originalCheckSiteStatus;
    apiService.saveThemeSettings = originalSaveThemeSettings;
    globalThis.fetch = originalFetch;
    toast.success = originalToastSuccess;
    restore();
  };

  t.after(cleanup);
  await render();
  await waitFor(
    () => dom.window.document.getElementById("config-probe") !== null,
    "ConfigProvider should finish loading"
  );

  return {
    dom,
    root,
    savedPayloads,
    successToasts,
    closeCount: () => closeCalls,
    cleanup,
    clickButton,
    importConfig,
    readSnapshot,
    unmountPanel: async () => {
      includePanel = false;
      await render();
    },
    waitFor,
  };
};

const assertCompletePreview: (
  preview: ConfigOptions | null
) => asserts preview is ConfigOptions = (preview) => {
  assert.ok(preview);
  assert.deepEqual(
    Object.keys(preview).sort(),
    Object.keys(DEFAULT_CONFIG).sort(),
    "preview config should contain every canonical ConfigOptions field"
  );
};

test("Preview ON applies the complete editing draft through mounted components", async (t) => {
  const harness = await createHarness(t, {
    visualPreset: "purcarte",
    backgroundAlignment: "contain,bottom",
  });

  await harness.importConfig({
    visualPreset: "nezha",
    backgroundAlignment: "cover,top",
  });
  await harness.waitFor(
    () => harness.readSnapshot().preview?.visualPreset === "nezha",
    "Preview ON should apply the imported draft"
  );

  const { preview } = harness.readSnapshot();
  assertCompletePreview(preview);
  assert.equal(preview.visualPreset, "nezha");
  assert.equal(preview.backgroundAlignment, "cover,top");
});

test("Preview OFF remains cleared after the editing draft changes", async (t) => {
  const harness = await createHarness(t, { visualPreset: "purcarte" });

  await harness.clickButton("关闭预览");
  assert.equal(harness.readSnapshot().preview, null);

  await harness.importConfig({ visualPreset: "nezha" });
  await act(async () => {
    await wait(20);
  });

  assert.equal(harness.readSnapshot().preview, null);
  assert.equal(harness.readSnapshot().active.visualPreset, "purcarte");
});

test("Preview re-enable applies the latest complete draft", async (t) => {
  const harness = await createHarness(t, { visualPreset: "purcarte" });

  await harness.clickButton("关闭预览");
  await harness.importConfig({
    visualPreset: "nezha",
    backgroundAlignment: "cover,left",
  });
  assert.equal(harness.readSnapshot().preview, null);

  await harness.clickButton("开启预览");
  await harness.waitFor(
    () => harness.readSnapshot().preview?.backgroundAlignment === "cover,left",
    "re-enabling preview should apply the latest draft"
  );

  const { preview } = harness.readSnapshot();
  assertCompletePreview(preview);
  assert.equal(preview.visualPreset, "nezha");
});

test("Close clears preview and restores the persisted runtime config", async (t) => {
  const harness = await createHarness(t, {
    visualPreset: "purcarte",
    backgroundAlignment: "contain,bottom",
  });
  await harness.importConfig({ visualPreset: "nezha" });
  assert.equal(harness.readSnapshot().preview?.visualPreset, "nezha");

  await harness.clickButton("关闭");

  assert.equal(harness.closeCount(), 1);
  assert.equal(harness.readSnapshot().preview, null);
  assert.deepEqual(harness.readSnapshot().active, {
    visualPreset: "purcarte",
    backgroundAlignment: "contain,bottom",
  });
  assert.equal(harness.savedPayloads.length, 0);
});

test("unmounting SettingsPanel clears an active preview", async (t) => {
  const harness = await createHarness(t, { visualPreset: "purcarte" });
  await harness.importConfig({ visualPreset: "nezha" });
  assert.equal(harness.readSnapshot().preview?.visualPreset, "nezha");

  await harness.unmountPanel();

  assert.equal(harness.readSnapshot().preview, null);
  assert.equal(harness.readSnapshot().active.visualPreset, "purcarte");
});

test("normal Save sends the current editing config and clears preview", async (t) => {
  const harness = await createHarness(t, { visualPreset: "purcarte" });
  await harness.importConfig({ visualPreset: "nezha" });

  await harness.clickButton("保存");
  await harness.waitFor(
    () => harness.savedPayloads.length === 1,
    "normal Save should call saveThemeSettings"
  );
  await harness.waitFor(
    () => harness.readSnapshot().preview === null,
    "successful Save should clear preview"
  );

  assert.equal(harness.savedPayloads[0].visualPreset, "nezha");
  assertCompletePreview(harness.savedPayloads[0]);
  assert.equal(harness.closeCount(), 1);
  assert.equal(harness.readSnapshot().active.visualPreset, "nezha");
});

test("an empty file import replaces persisted values with fork defaults", async (t) => {
  const harness = await createHarness(t, {
    visualPreset: "purcarte",
    backgroundAlignment: "contain,bottom",
  });

  await harness.importConfig({});
  await harness.waitFor(
    () => harness.readSnapshot().preview?.visualPreset === "nezha",
    "empty import should resolve against defaults"
  );

  const { preview } = harness.readSnapshot();
  assertCompletePreview(preview);
  assert.equal(preview.visualPreset, "nezha");
  assert.equal(preview.backgroundAlignment, "cover,top");
});

test("a legacy-only alignment survives the real file import flow", async (t) => {
  const harness = await createHarness(t, {});

  await harness.importConfig({
    backagroundAlignment: "contain,bottom",
  });

  assert.equal(
    harness.readSnapshot().preview?.backgroundAlignment,
    "contain,bottom"
  );
});

test("the corrected alignment wins in the real file import flow", async (t) => {
  const harness = await createHarness(t, {});

  await harness.importConfig({
    backgroundAlignment: "cover,left",
    backagroundAlignment: "contain,bottom",
  });

  assert.equal(
    harness.readSnapshot().preview?.backgroundAlignment,
    "cover,left"
  );
});

test("the real import toast Save callback saves the resolved imported config", async (t) => {
  const harness = await createHarness(t, { visualPreset: "purcarte" });

  await harness.importConfig({ visualPreset: "nezha" });
  const importToast = harness.successToasts.find(
    ({ options }) => options?.action?.label === "保存"
  );
  assert.ok(importToast?.options?.action);

  await act(async () => {
    await importToast.options?.action?.onClick();
  });
  await harness.waitFor(
    () => harness.savedPayloads.length === 1,
    "the toast Save action should call saveThemeSettings"
  );

  assert.equal(harness.savedPayloads[0].visualPreset, "nezha");
  assertCompletePreview(harness.savedPayloads[0]);
  assert.equal(harness.readSnapshot().preview, null);
});
