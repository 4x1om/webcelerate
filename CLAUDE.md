# Webcelerate

A userscript that provides keyboard shortcuts and enhancements for AI chat interfaces.

## Structure

- `webcelerate.user.js` - Main userscript

## Supported Sites

- chatgpt.com / chat.openai.com - Model switcher (F1-F4 keys)
- claude.ai - Model switcher (F1=Sonnet 4.5, F2=Opus 4.5)

## Architecture

The script uses a site-handler pattern:
- `SITE_HANDLERS` object maps hostname patterns to handler modules
- Each handler has an `init()` function and site-specific logic
- Common utilities are shared at the top level

## Development

Install in a userscript manager (Tampermonkey, Violentmonkey, etc.) and enable auto-reload from disk for development.
