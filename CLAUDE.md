# Webcelerate

A userscript that provides keyboard shortcuts and enhancements for AI chat interfaces.

## Structure

- `webcelerate.user.js` - Main userscript
- `README.md` - User-facing documentation
- `CLAUDE.md` - Developer documentation (this file)

## Supported Sites

### ChatGPT (chatgpt.com / chat.openai.com)
- F1-F4 keys for model switching
- Includes legacy model navigation
- Scroll position preservation
- Auto-selects GPT-5.1 Instant on page load

### Claude (claude.ai)
- F1 = Sonnet 4.5 (auto-selected)
- F2 = Opus 4.6
- Simpler implementation using data-testid selectors

### Gemini (gemini.google.com)
- F1 = Fast (auto-selected)
- F2 = Thinking
- F3 = Pro
- Uses data-test-id selectors and aria-checked for state

## Architecture

The script uses a site-handler pattern:
- `SITE_HANDLERS` object maps hostname patterns to handler modules
- Each handler has an `init()` function and site-specific logic
- Common utilities (log, sleep, norm) are shared at the top level
- Early key blocking prevents browser defaults for F1-F4

### Adding a New Site

1. Add entry to `SITE_HANDLERS` with hostnames and init function
2. Create init function following the pattern:
   - Define MAPPINGS for function keys
   - Implement element finders (button, menu items, textbox)
   - Implement switchModel logic
   - Add keydown event listener
   - Optional: auto-select preferred model on page load
3. Update version number
4. Update README.md and CLAUDE.md

## Development

Install in a userscript manager (Tampermonkey, Violentmonkey, etc.) and enable auto-reload from disk for development.

### Debugging
- Set `DEBUG = true` for console logging
- Check browser console for "[Webcelerate]" messages
- Inspect DOM elements to find appropriate selectors
