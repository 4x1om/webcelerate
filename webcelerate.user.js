// ==UserScript==
// @name         Webcelerate
// @namespace    4x1om-webcelerate
// @version      1.6
// @description  Keyboard shortcuts and enhancements for AI chat interfaces
// @author       Claude
// @match        *://*/*
// @updateURL    https://raw.githubusercontent.com/4x1om/webcelerate/main/webcelerate.user.js
// @downloadURL  https://raw.githubusercontent.com/4x1om/webcelerate/main/webcelerate.user.js
// @run-at       document-start
// @grant        none
// ==/UserScript==

(() => {
  "use strict";

  // ============ EARLY KEY BLOCKING ============
  // Block F1-F4 immediately to prevent browser defaults (e.g., F1 help)
  const BLOCKED_KEYS = ["F1", "F2", "F3", "F4"];
  document.addEventListener("keydown", (e) => {
    if (BLOCKED_KEYS.includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  const DEBUG = true;
  const log = (...a) => DEBUG && console.log("[Webcelerate]", ...a);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const norm = (s) => (s || "").replace(/\s+/g, " ").trim().toLowerCase();

  // ============ SITE HANDLERS ============

  const SITE_HANDLERS = {
    chatgpt: {
      hostnames: ["chatgpt.com", "chat.openai.com"],
      init: initChatGPT,
    },
    claude: {
      hostnames: ["claude.ai"],
      init: initClaude,
    },
  };

  // ============ CHATGPT HANDLER ============

  function initChatGPT() {
    const MAPPINGS = {
      "F1": { label: "Instant", match: "instant" },
      "F2": { label: "GPT-5 Thinking", match: "5 thinking", exclude: ["mini"], legacy: true },
      "F3": { label: "o3", match: "o3", legacy: true },
      "F4": { label: "GPT-4o", match: "4o", legacy: true },
    };

    const LEGACY_LABEL = "Legacy models";

    let lastRun = 0;
    let savedScrollTop = 0;
    let scrollContainer = null;

    function isVisible(el) {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }

    function getScrollContainer() {
      const byScrollbarGutter = document.querySelector('[class*="scrollbar-gutter"]');
      if (byScrollbarGutter && byScrollbarGutter.scrollHeight > byScrollbarGutter.clientHeight) {
        return byScrollbarGutter;
      }
      for (const el of document.querySelectorAll('div')) {
        if (el.scrollTop > 0 && el.scrollHeight > el.clientHeight) {
          return el;
        }
      }
      return document.documentElement;
    }

    function saveScroll() {
      scrollContainer = getScrollContainer();
      savedScrollTop = scrollContainer.scrollTop;
    }

    function restoreScroll() {
      if (scrollContainer) {
        if (Math.abs(scrollContainer.scrollTop - savedScrollTop) > 5) {
          scrollContainer.scrollTop = savedScrollTop;
        }
      }
    }

    function scheduleScrollRestore(times = 3) {
      let count = 0;
      const restore = () => {
        restoreScroll();
        count++;
        if (count < times) requestAnimationFrame(restore);
      };
      requestAnimationFrame(restore);
    }

    function findModelButton() {
      const byTestId = document.querySelector('button[data-testid="model-switcher-dropdown-button"]');
      if (byTestId && isVisible(byTestId)) return byTestId;
      for (const btn of document.querySelectorAll('button[aria-haspopup]')) {
        const t = norm(btn.innerText);
        if ((t.includes("gpt") || t.includes("o1") || t.includes("o3") || t.includes("4o") || t.includes("instant")) && isVisible(btn)) {
          return btn;
        }
      }
      return null;
    }

    function findMenuItem(text, exclude = []) {
      const wanted = norm(text);
      for (const el of document.querySelectorAll('[role="menuitem"], [role="option"], [role="menu"] div, [role="listbox"] div')) {
        const t = norm(el.innerText);
        if (t.includes(wanted) && isVisible(el)) {
          if (exclude.length === 0 || !exclude.some(ex => t.includes(norm(ex)))) {
            return el;
          }
        }
      }
      return null;
    }

    function findTextbox() {
      const selectors = [
        '#prompt-textarea',
        'textarea[data-id="root"]',
        'textarea[placeholder*="Message"]',
        'div[contenteditable="true"]',
        'textarea',
      ];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && isVisible(el)) return el;
      }
      return null;
    }

    function focusTextbox() {
      const textbox = findTextbox();
      if (textbox) {
        textbox.focus({ preventScroll: true });
        scheduleScrollRestore(5);
      }
    }

    function reactClick(el) {
      if (!el) return false;
      const key = Object.keys(el).find((k) => k.startsWith("__reactFiber$"));
      if (!key) return false;
      let cur = el[key];
      while (cur) {
        const p = cur.memoizedProps || cur.pendingProps;
        if (p?.onClick) {
          p.onClick({ preventDefault(){}, stopPropagation(){}, target: el, currentTarget: el, nativeEvent: { stopImmediatePropagation(){} } });
          return true;
        }
        cur = cur.return;
      }
      return false;
    }

    function pointerClick(el) {
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const opts = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, pointerId: 1, pointerType: "mouse", isPrimary: true };
      el.dispatchEvent(new PointerEvent("pointerdown", opts));
      el.dispatchEvent(new PointerEvent("pointerup", opts));
      el.dispatchEvent(new MouseEvent("click", { ...opts, button: 0 }));
      return true;
    }

    function clickMenuButton(el) {
      if (!el) return false;
      reactClick(el);
      pointerClick(el);
      el.click();
      scheduleScrollRestore(3);
      return true;
    }

    function clickItem(el) {
      if (!el) return false;
      if (reactClick(el)) {
        scheduleScrollRestore(3);
        return true;
      }
      el.click();
      scheduleScrollRestore(3);
      return true;
    }

    async function waitFor(fn, timeout = 1000, interval = 20) {
      const end = Date.now() + timeout;
      while (Date.now() < end) {
        const el = fn();
        if (el) return el;
        await sleep(interval);
      }
      return null;
    }

    function isAlreadySelected(match) {
      const btn = findModelButton();
      return btn && norm(btn.innerText).includes(norm(match));
    }

    function dismissMenu() {
      document.body.click();
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }));
    }

    async function switchModel(config) {
      const { label, match, exclude = [], legacy } = config;

      saveScroll();

      if (isAlreadySelected(match)) {
        focusTextbox();
        return true;
      }

      const btn = findModelButton();
      if (!btn) { log("No model button"); return false; }

      clickMenuButton(btn);
      await sleep(50);
      restoreScroll();

      if (legacy) {
        const legacyItem = await waitFor(() => findMenuItem(LEGACY_LABEL));
        if (!legacyItem) {
          dismissMenu();
          restoreScroll();
          return false;
        }
        clickItem(legacyItem);
        await sleep(40);
        restoreScroll();
      }

      const target = await waitFor(() => findMenuItem(match, exclude));
      if (!target) {
        dismissMenu();
        restoreScroll();
        return false;
      }

      clickItem(target);

      await sleep(60);
      scheduleScrollRestore(5);
      focusTextbox();

      return true;
    }

    document.addEventListener("keydown", async (e) => {
      const config = MAPPINGS[e.key];
      if (!config) return;

      e.preventDefault();
      e.stopPropagation();

      if (e.isComposing || e.repeat) return;
      if (Date.now() - lastRun < 800) return;
      lastRun = Date.now();

      await switchModel(config);
    }, true);

    // Auto-select F1 model on page load
    (async () => {
      const config = MAPPINGS["F1"];
      const btn = await waitFor(findModelButton, 15000, 200);
      if (!btn) { log("Auto-select: model button not found"); return; }
      await sleep(500);
      if (!isAlreadySelected(config.match)) {
        log("Auto-selecting:", config.label);
        await switchModel(config);
      }
      await sleep(2000);
      if (!isAlreadySelected(config.match)) {
        log("Re-selecting:", config.label);
        await switchModel(config);
      }
    })();

    log("ChatGPT: Ready - F1=Instant, F2=5 Thinking, F3=o3, F4=4o (auto-select enabled)");
  }

  // ============ CLAUDE HANDLER ============

  function initClaude() {
    const MAPPINGS = {
      "F1": { label: "Sonnet 4.5", match: "sonnet 4.5" },
      "F2": { label: "Opus 4.5", match: "opus 4.5" },
    };

    let lastRun = 0;

    function isVisible(el) {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }

    function findModelButton() {
      return document.querySelector('button[data-testid="model-selector-dropdown"]');
    }

    function findMenuItem(text) {
      const wanted = norm(text);
      for (const el of document.querySelectorAll('[role="menuitem"]')) {
        const t = norm(el.innerText);
        if (t.includes(wanted) && isVisible(el)) return el;
      }
      return null;
    }

    function findTextbox() {
      const selectors = [
        'div[contenteditable="true"].ProseMirror',
        'div[contenteditable="true"]',
        'textarea',
      ];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && isVisible(el)) return el;
      }
      return null;
    }

    function focusTextbox() {
      const textbox = findTextbox();
      if (textbox) {
        textbox.focus();
      }
    }

    function isAlreadySelected(match) {
      const btn = findModelButton();
      return btn && norm(btn.innerText).includes(norm(match));
    }

    function dismissMenu() {
      document.body.click();
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }));
    }

    async function switchModel(config) {
      const { label, match } = config;

      if (isAlreadySelected(match)) {
        focusTextbox();
        return true;
      }

      const btn = findModelButton();
      if (!btn) { log("No model button"); return false; }

      btn.click();
      await sleep(50);

      const target = await waitFor(() => findMenuItem(match), 1000);
      if (!target) {
        log("Model not found:", match);
        dismissMenu();
        return false;
      }

      target.click();
      await sleep(50);
      focusTextbox();

      return true;
    }

    async function waitFor(fn, timeout = 1000, interval = 20) {
      const end = Date.now() + timeout;
      while (Date.now() < end) {
        const el = fn();
        if (el) return el;
        await sleep(interval);
      }
      return null;
    }

    document.addEventListener("keydown", async (e) => {
      const config = MAPPINGS[e.key];
      if (!config) return;

      e.preventDefault();
      e.stopPropagation();

      if (e.isComposing || e.repeat) return;
      if (Date.now() - lastRun < 800) return;
      lastRun = Date.now();

      await switchModel(config);
    }, true);

    // Auto-select F1 model on page load
    (async () => {
      const config = MAPPINGS["F1"];
      const btn = await waitFor(findModelButton, 15000, 200);
      if (!btn) { log("Auto-select: model button not found"); return; }
      await sleep(500);
      if (!isAlreadySelected(config.match)) {
        log("Auto-selecting:", config.label);
        await switchModel(config);
      }
      await sleep(2000);
      if (!isAlreadySelected(config.match)) {
        log("Re-selecting:", config.label);
        await switchModel(config);
      }
    })();

    log("Claude: Ready - F1=Sonnet 4.5, F2=Opus 4.5 (auto-select enabled)");
  }

  // ============ INITIALIZATION ============

  function getCurrentSite() {
    const hostname = window.location.hostname;
    for (const [name, handler] of Object.entries(SITE_HANDLERS)) {
      if (handler.hostnames.some(h => hostname.includes(h))) {
        return { name, handler };
      }
    }
    return null;
  }

  function initSiteHandler() {
    const site = getCurrentSite();
    if (site) {
      log(`Detected site: ${site.name}`);
      site.handler.init();
    }
  }

  // Wait for DOM to be ready before initializing site handlers
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSiteHandler);
  } else {
    initSiteHandler();
  }
})();
