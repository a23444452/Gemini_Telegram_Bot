# Gemini Telegram Bot

A powerful Telegram bot powered by Google Gemini AI, supporting file operations, AI image generation, and intelligent conversation with function calling capabilities.

## Features

- **Gemini AI Conversation** - Intelligent dialogue using Gemini 2.0 Flash
- **Function Calling** - Automatic tool invocation to complete tasks
- **File Operations** - Read, write, move, copy, and delete files
- **AI Image Generation** - Generate images using Gemini Imagen (Nano Banana)
- **Permission Control** - All operations require user confirmation
- **Conversation History** - Maintain multi-turn conversation context
- **Working Directory Management** - Safe directory navigation and browsing
- **Quota Management** - Track token usage and request limits

## Environment Requirements

- [Bun](https://bun.sh/) >= 1.0 (or Node.js >= 18)
- Telegram Bot Token
- Google Gemini API Key
- Google Cloud Credentials (optional, for image generation)

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd gemini-telegram-bot
```

### 2. Install dependencies

```bash
bun install
# or using npm
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 4. Set up Telegram Bot Token

1. Talk to [@BotFather](https://t.me/BotFather) on Telegram to create a bot
2. Copy the bot token to `.env` as `TELEGRAM_BOT_TOKEN`
3. Get your User ID by talking to [@userinfobot](https://t.me/userinfobot)
4. Add your User ID to `.env` as `TELEGRAM_ALLOWED_USERS`

Example:
```bash
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_ALLOWED_USERS=123456789,987654321
```

### 5. Set up Google Gemini API

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Create an API Key
3. Copy it to `.env` as `GOOGLE_API_KEY`

```bash
GOOGLE_API_KEY=AIzaSyD...your-api-key-here
```

### 6. (Optional) Set up Image Generation

For AI image generation to work, you need Google Cloud credentials:

```bash
# Option 1: Use Google Cloud CLI (recommended)
gcloud auth application-default login

# Option 2: Set credentials file path in .env
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
```

## Starting and Stopping

### Start the bot

```bash
./start.sh
```

This will:
- Check environment variables and dependencies
- Start the bot in background mode
- Create a PID file for process management
- Log output to `bot.log`

### Stop the bot

```bash
./stop.sh
```

### Check status

```bash
./status.sh
```

Displays:
- Running status
- Process ID (PID)
- Uptime and start time
- Memory and CPU usage
- Recent log entries

### View logs

```bash
# View all logs
cat bot.log

# Follow live logs
tail -f bot.log

# View last 50 lines
tail -50 bot.log
```

## Usage

### Basic Commands

- `/start` - Start using the bot
- `/help` - Display help message
- `/new` - Start a new conversation
- `/pwd` - Show current working directory
- `/ls [path]` - List directory contents
- `/cd <path>` - Change directory

### Conversation Examples

Simply send messages to the bot:

```
User: Please list the files in the current directory
Bot: [Calls list_directory tool]
Bot: The current directory contains: ...

User: Please create a test.txt file with content "Hello World"
Bot: [Requests confirmation]
User: [Clicks Allow]
Bot: [Calls write_file tool]
Bot: File created successfully

User: Please generate a picture of a cute kitten
Bot: [Requests confirmation]
User: [Clicks Allow]
Bot: [Calls generate_image tool]
Bot: [Sends generated image]
```

### Available Tools

#### Read Operations (Auto-execute)

- `read_file` - Read file contents
- `list_directory` - List directory contents

#### Write Operations (Require confirmation)

- `write_file` - Write to a file
- `append_file` - Append content to a file
- `delete_file` - Delete a file
- `create_directory` - Create a directory
- `move_file` - Move or rename a file
- `copy_file` - Copy a file

#### AI Operations (Require confirmation)

- `generate_image` - Generate AI images with Gemini Imagen

## Project Structure

```
gemini-telegram-bot/
├── src/
│   ├── bot/              # Telegram bot logic
│   │   ├── bot.ts        # Main bot instance
│   │   └── handlers.ts   # Command and message handlers
│   ├── gemini/           # Gemini AI integration
│   │   ├── client.ts     # Gemini client
│   │   ├── function-calling.ts  # Function calling logic
│   │   └── conversation.ts      # Conversation management
│   ├── tools/            # Tool implementations
│   │   ├── file-ops.ts   # File operation tools
│   │   ├── directory-ops.ts     # Directory tools
│   │   └── image-gen.ts  # Image generation tool
│   ├── permissions/      # Permission system
│   │   └── manager.ts    # Permission manager
│   ├── quota/            # Quota management
│   │   └── tracker.ts    # Token and request tracking
│   ├── types/            # TypeScript types
│   ├── config.ts         # Configuration loader
│   └── index.ts          # Entry point
├── config/               # Configuration files
├── data/                 # Runtime data
│   └── users.json        # User permissions
├── logs/                 # Log files
├── tests/                # Test suites
├── docs/                 # Documentation
├── start.sh              # Start script
├── stop.sh               # Stop script
├── status.sh             # Status check script
├── .env.example          # Environment template
└── README.md             # This file
```

## Security

- All write operations require explicit user confirmation
- Path restrictions limited to `ALLOWED_PATHS`
- Path traversal attack prevention
- Sensitive file access blocking (`.ssh/`, `.env`, etc.)
- User authentication (only `ALLOWED_USERS` can use the bot)
- Token usage tracking and quota limits

## Troubleshooting

### Bot won't start

```bash
# Check environment variables
cat .env

# Check dependencies
bun install

# View error logs
cat bot.log

# Check if port is in use
./status.sh
```

### Image generation fails

```bash
# Check Google Cloud authentication
gcloud auth application-default print-access-token

# Verify Imagen API access in Google Cloud Console
# Make sure Imagen API is enabled for your project
```

### Permission errors

- Verify your User ID is in `TELEGRAM_ALLOWED_USERS`
- Verify file paths are within `ALLOWED_PATHS`
- Check file permissions on the host system

### Out of quota

Check your quota status:
- `/status` command shows current usage
- Quotas reset based on time window (hourly/daily)
- Adjust limits in `.env`:
  - `MAX_REQUESTS_PER_HOUR`
  - `MAX_TOKENS_PER_DAY`

## Development

### Run in development mode

```bash
# Run directly (foreground)
bun run src/index.ts

# Run with auto-reload
bun --watch run src/index.ts
```

### Run tests

```bash
bun test
```

### TypeScript type checking

```bash
bun run typecheck
```

### Code structure guidelines

- Keep functions small (<50 lines)
- Use immutable patterns (no mutations)
- Always handle errors with try-catch
- Validate all user inputs with Zod
- Write tests for new features

## Configuration

All configuration is done through environment variables in `.env`:

| Variable | Description | Default |
|----------|-------------|---------|
| `TELEGRAM_BOT_TOKEN` | Telegram Bot API token | (required) |
| `TELEGRAM_ALLOWED_USERS` | Comma-separated user IDs | (required) |
| `GOOGLE_API_KEY` | Google Gemini API key | (required) |
| `GEMINI_DEFAULT_MODEL` | Gemini model to use | `gemini-2.0-flash-exp` |
| `ALLOWED_PATHS` | Allowed directory paths | `~/Documents,~/Downloads,~/Desktop` |
| `DEFAULT_WORKING_DIR` | Default working directory | `~/Documents` |
| `MAX_REQUESTS_PER_HOUR` | Request limit per hour | `100` |
| `MAX_TOKENS_PER_DAY` | Token limit per day | `1000000` |
| `BROWSER_HEADLESS` | Run browser in headless mode | `true` |
| `BROWSER_TIMEOUT` | Browser operation timeout (ms) | `30000` |

## Architecture

### Conversation Flow

1. User sends message to bot
2. Bot adds message to conversation history
3. Gemini processes message and decides if tools are needed
4. If tools required:
   - Gemini calls appropriate tool functions
   - Bot requests user confirmation (for write operations)
   - Upon approval, tool executes and returns result
   - Result sent back to Gemini for response generation
5. Gemini generates final response
6. Response sent to user

### Permission System

- **Read operations**: Auto-approved (safe operations)
- **Write operations**: Require user confirmation (destructive operations)
- **AI operations**: Require user confirmation (API costs)
- Confirmation via inline keyboard buttons (Allow/Deny)
- 30-second timeout for confirmations

### Quota System

Tracks:
- Requests per hour
- Tokens consumed per day
- Warning at 80% threshold
- Hard limit enforcement

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Write tests for new features
4. Ensure all tests pass
5. Submit a pull request

## License

MIT

## Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation in `/docs`
- Review test files for usage examples

## Acknowledgments

- Built with [Grammy](https://grammy.dev/) - Telegram Bot framework
- Powered by [Google Gemini](https://ai.google.dev/) - AI model
- Image generation via [Nano Banana](https://github.com/google-gemini/generative-ai-python) - Gemini Imagen wrapper
- Runtime by [Bun](https://bun.sh/) - Fast JavaScript runtime
