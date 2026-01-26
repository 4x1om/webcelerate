// ==UserScript==
// @name         Webcelerate
// @namespace    4x1om-webcelerate
// @version      1.2
// @description  Keyboard shortcuts and enhancements for AI chat interfaces
// @author       Claude
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @match        https://claude.ai/*
// @updateURL    https://raw.githubusercontent.com/4x1om/webcelerate/main/webcelerate.user.js
// @downloadURL  https://raw.githubusercontent.com/4x1om/webcelerate/main/webcelerate.user.js
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {
  "use strict";

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
      "F1": { label: "ChatGPT 5 Instant", match: "5 instant", legacy: true },
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
      for (const btn of document.querySelectorAll('button[aria-haspopup]')) {
        const t = norm(btn.innerText);
        if ((t.includes("gpt") || t.includes("o1") || t.includes("o3") || t.includes("4o")) && isVisible(btn)) {
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

    log("ChatGPT: Ready - F1=5.1 Instant, F2=5.1 Thinking, F3=o3, F4=4o");
  }

  // ============ CLAUDE HANDLER ============

  function initClaude() {
    // Placeholder for Claude.ai features
    log("Claude: Ready - no features implemented yet");
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

  const site = getCurrentSite();
  if (site) {
    log(`Detected site: ${site.name}`);
    site.handler.init();
  } else {
    log("Unknown site, no handler available");
  }
})();
