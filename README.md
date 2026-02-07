# Webcelerate

A userscript that adds keyboard shortcuts for quick model switching on AI chat interfaces. Press F1-F4 to switch models instantly and automatically selects your preferred model on page load.

Made with Claude.

## Supported Sites

### ChatGPT (chatgpt.com)
- **F1** - GPT-5.1 Instant
- **F2** - GPT-5.1 Thinking
- **F3** - o3
- **F4** - GPT-5 Thinking mini

### Claude (claude.ai)
- **F1** - Sonnet 4.5 (auto-selected)
- **F2** - Opus 4.6

### Gemini (gemini.google.com)
- **F1** - Fast (auto-selected)
- **F2** - Thinking
- **F3** - Pro

## Features

- **Instant model switching** with function keys
- **Auto-selects F1 model** on page load
- **Prevents browser defaults** for F1-F4 keys
- **Automatic updates** from this repository

## Installation

1. Install a userscript manager like [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/) in your browser
2. Open the script: https://raw.githubusercontent.com/4x1om/webcelerate/main/webcelerate.user.js
3. Your userscript manager should prompt you to install. Click "Install"
4. Visit any supported site and the script will activate automatically
