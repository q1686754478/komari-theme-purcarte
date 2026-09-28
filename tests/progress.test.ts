import test from "node:test";
import assert from "node:assert/strict";

import { getProgressLevel } from "../src/utils/progress.js";

test("an online zero-percent value remains normal", () => {
  assert.equal(getProgressLevel(0, false), "normal");
});

test("progress levels retain the existing threshold boundaries", () => {
  assert.equal(getProgressLevel(50, false), "normal");
  assert.equal(getProgressLevel(50.01, false), "warning");
  assert.equal(getProgressLevel(90, false), "warning");
  assert.equal(getProgressLevel(90.01, false), "error");
});

test("real offline state overrides every numeric value", () => {
  assert.equal(getProgressLevel(0, true), "offline");
  assert.equal(getProgressLevel(100, true), "offline");
});
