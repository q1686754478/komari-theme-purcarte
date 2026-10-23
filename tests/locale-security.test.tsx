import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { deepMerge, getModifiedKeys, mergeTexts, parseCustomTexts } from "../src/utils/localeUtils.js";

test("custom texts reject prototype paths, unknown keys and non-leaf overrides", () => {
  const defaults = { chart: { title: "original", hint: "hint" } };
  const custom = [
    "__proto__.polluted:bad", "constructor.prototype.polluted:bad",
    "chart.__proto__.polluted:bad", "chart.constructor.prototype.polluted:bad",
    "chart:replace-object", "unknown.title:bad", "toString:bad",
    "chart.title:hello%2C%20world", "chart.hint:%E4%BD%A0%E5%A5%BD",
  ].join(",");
  assert.deepEqual(mergeTexts(defaults, custom), { chart: { title: "hello, world", hint: "你好" } });
  assert.deepEqual(defaults, { chart: { title: "original", hint: "hint" } });
  assert.equal(Object.hasOwn(Object.prototype, "polluted"), false);
  assert.deepEqual(getModifiedKeys(defaults, custom), ["chart.title", "chart.hint"]);
  assert.equal(Object.hasOwn(parseCustomTexts(custom), "__proto__.polluted"), false);
});

test("deep merge ignores dangerous keys without traversing inherited properties", () => {
  const source = JSON.parse('{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}},"chart":{"title":"new","prototype":{"polluted":true}}}');
  assert.deepEqual(deepMerge({ chart: { hint: "keep" } }, source), { chart: { hint: "keep", title: "new" } });
  assert.equal(Object.hasOwn(Object.prototype, "polluted"), false);
});

test("localized HTML preserves formatting but removes active content and every attribute", async () => {
  const dom = new JSDOM("<!doctype html><div id='root'></div>", { url: "https://example.test/" });
  const previous = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  }
  const root = createRoot(dom.window.document.getElementById("root")!);
  try {
    // Import after installing the DOM, as in the browser entry point.
    const { LocaleHtml } = await import("../src/components/ui/locale-html.js");
    await act(async () => root.render(<LocaleHtml html={'<h2 class="text-lg">标题</h2><p onclick="alert(1)"><strong>加粗</strong><br>正文<img src=x onerror=alert(1)><script>alert(1)</script><svg onload=alert(1)></svg><a href="javascript:alert(1)">链接文字</a><iframe srcdoc="<script>alert(1)</script>"></iframe></p>'} />));
    const container = dom.window.document.getElementById("root")!;
    assert.equal(container.querySelector("strong")?.textContent, "加粗");
    assert.equal(container.querySelector("h2")?.textContent, "标题");
    assert.ok(container.querySelector("br"));
    assert.equal(container.querySelector("script,img,svg,iframe,a"), null);
    assert.ok(container.textContent?.includes("链接文字"));
    for (const element of container.querySelectorAll("*")) assert.equal(element.attributes.length, 0);
    await act(async () => root.render(<LocaleHtml html="<p>替换后的正常提示</p>" />));
    assert.equal(container.textContent, "替换后的正常提示");
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
