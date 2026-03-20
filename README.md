# Webcelerate

A userscript that adds keyboard shortcuts for quick model switching on AI chat interfaces. It automatically selects your preferred model on page load.

Made with Claude.

## Supported Sites

### Claude (claude.ai)
- **F1** - Haiku (latest version, auto-selected)
- **F2** - Sonnet (latest version)
- **F3** - Opus (latest version)

### ChatGPT (chatgpt.com)
- **F2** - Instant (latest version, auto-selected)
- **F3** - Thinking (latest version)

### Gemini (gemini.google.com)
- **F1** - Fast (auto-selected)
- **F2** - Thinking
- **F3** - Pro

## Features

- **Instant model switching** with function keys
- **Auto-selects the default model** on page load (stops if you manually pick a model)
- **Smart retry** - distinguishes slow page loads from unavailable models
- **Prevents browser defaults** for supported function-key shortcuts
- **Automatic updates** from this repository

## Installation

1. Install a userscript manager like [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/) in your browser
2. Open the script: https://raw.githubusercontent.com/hsi3/webcelerate/main/webcelerate.user.js
3. Your userscript manager should prompt you to install. Click "Install"
4. Visit any supported site and the script will activate automatically
