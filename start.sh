#!/bin/bash

# Gemini Telegram Bot - Start Script
# This script starts the bot in background mode with proper environment checks

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$PROJECT_ROOT/bot.pid"
LOG_FILE="$PROJECT_ROOT/bot.log"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Gemini Telegram Bot - Startup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if bot is already running
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠ Bot is already running (PID: $PID)${NC}"
        echo ""
        echo "Use './stop.sh' to stop it first, or './status.sh' to check status."
        exit 1
    else
        echo -e "${YELLOW}⚠ Found stale PID file, cleaning up...${NC}"
        rm -f "$PID_FILE"
    fi
fi

# Check if .env file exists
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo -e "${RED}✗ Error: .env file not found${NC}"
    echo ""
    echo "Please create your .env file:"
    echo "  1. Copy the example: cp .env.example .env"
    echo "  2. Edit .env with your configuration"
    echo "  3. Run this script again"
    exit 1
fi

# Load environment variables
source "$PROJECT_ROOT/.env"

# Check required environment variables
echo -e "${BLUE}Checking environment variables...${NC}"

MISSING_VARS=0

if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo -e "${RED}✗ TELEGRAM_BOT_TOKEN is not set${NC}"
    MISSING_VARS=1
fi

if [ -z "$GOOGLE_API_KEY" ]; then
    echo -e "${RED}✗ GOOGLE_API_KEY is not set${NC}"
    MISSING_VARS=1
fi

if [ -z "$TELEGRAM_ALLOWED_USERS" ]; then
    echo -e "${YELLOW}⚠ TELEGRAM_ALLOWED_USERS is not set (bot will be accessible to anyone)${NC}"
fi

if [ $MISSING_VARS -eq 1 ]; then
    echo ""
    echo -e "${RED}✗ Missing required environment variables${NC}"
    echo "Please configure your .env file and try again."
    exit 1
fi

echo -e "${GREEN}✓ Environment variables OK${NC}"

# Check if bun is installed
echo -e "${BLUE}Checking dependencies...${NC}"

if ! command -v bun &> /dev/null; then
    echo -e "${RED}✗ Error: bun is not installed${NC}"
    echo ""
    echo "Please install bun first:"
    echo "  curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

echo -e "${GREEN}✓ Bun found: $(bun --version)${NC}"

# Check if node_modules exists
if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
    echo -e "${YELLOW}⚠ Dependencies not installed, installing now...${NC}"
    cd "$PROJECT_ROOT"
    bun install
    if [ $? -ne 0 ]; then
        echo -e "${RED}✗ Failed to install dependencies${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓ Dependencies OK${NC}"

# Create necessary directories
echo -e "${BLUE}Preparing directories...${NC}"

mkdir -p "$PROJECT_ROOT/data"
mkdir -p "$PROJECT_ROOT/logs"

echo -e "${GREEN}✓ Directories ready${NC}"

# Start the bot
echo ""
echo -e "${GREEN}Starting Gemini Telegram Bot...${NC}"
cd "$PROJECT_ROOT"

# Start bot in background with nohup
nohup bun run src/index.ts > "$LOG_FILE" 2>&1 &
BOT_PID=$!
echo $BOT_PID > "$PID_FILE"

# Wait a moment for the bot to start
sleep 3

# Verify that the bot process is running
if ps -p $BOT_PID > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Bot started successfully!${NC}"
    echo ""
    echo -e "${BLUE}Details:${NC}"
    echo "  PID: $BOT_PID"
    echo "  Log: $LOG_FILE"
    echo ""
    echo -e "${BLUE}Commands:${NC}"
    echo "  ./status.sh  - Check bot status"
    echo "  ./stop.sh    - Stop the bot"
    echo "  tail -f $LOG_FILE - View live logs"
    echo ""
    echo -e "${GREEN}Bot is now running in background mode.${NC}"
else
    echo -e "${RED}✗ Failed to start bot${NC}"
    echo ""
    echo "Last 20 lines of log:"
    echo "=========================================="
    tail -20 "$LOG_FILE"
    echo "=========================================="
    rm -f "$PID_FILE"
    exit 1
fi
