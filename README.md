# Gemini Telegram Bot

A powerful Telegram bot powered by Google Gemini with Model Context Protocol (MCP) support.

## Features

- Google Gemini AI integration
- MCP server support for extensible tooling
- File processing (PDF, DOCX, TXT)
- Web browsing capabilities with Playwright
- Permission system for tool access control
- TypeScript + Bun for fast development

## Setup

1. Install dependencies:
```bash
bun install
```

2. Copy environment template:
```bash
cp .env.example .env
```

3. Configure your environment variables in `.env`

4. Run the bot:
```bash
bun run dev
```

## Project Structure

```
gemini-telegram-bot/
├── src/
│   ├── bot/              # Telegram bot logic
│   ├── gemini/           # Gemini AI integration
│   ├── tools/            # Tool implementations
│   ├── permissions/      # Permission system
│   └── types/            # TypeScript types
├── config/               # Configuration files
├── data/                 # Runtime data
├── tests/                # Test suites
└── mcp-servers/          # MCP server implementations
```

## Development

- `bun run dev` - Run in development mode
- `bun run test` - Run tests
- `bun run typecheck` - Type checking

## License

MIT
