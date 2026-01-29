#!/bin/bash

# Gemini Telegram Bot - Stop Script
# This script gracefully stops the bot and cleans up PID files

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$PROJECT_ROOT/bot.pid"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Gemini Telegram Bot - Shutdown${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if PID file exists
if [ ! -f "$PID_FILE" ]; then
    echo -e "${YELLOW}⚠ Bot is not running (no PID file found)${NC}"
    exit 0
fi

# Read PID
PID=$(cat "$PID_FILE")

# Check if process is running
if ! ps -p "$PID" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Bot is not running (stale PID file)${NC}"
    echo "Cleaning up PID file..."
    rm -f "$PID_FILE"
    exit 0
fi

# Stop the bot gracefully
echo -e "${BLUE}Stopping bot (PID: $PID)...${NC}"
kill "$PID"

# Wait for process to terminate (max 10 seconds)
COUNTER=0
MAX_WAIT=10

while [ $COUNTER -lt $MAX_WAIT ]; do
    if ! ps -p "$PID" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Bot stopped successfully${NC}"
        rm -f "$PID_FILE"
        exit 0
    fi
    sleep 1
    COUNTER=$((COUNTER + 1))
    echo -n "."
done

echo ""

# If still running, force kill
if ps -p "$PID" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Bot did not stop gracefully, forcing shutdown...${NC}"
    kill -9 "$PID"
    sleep 1

    if ! ps -p "$PID" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Bot stopped (forced)${NC}"
    else
        echo -e "${RED}✗ Failed to stop bot${NC}"
        echo "You may need to manually kill the process:"
        echo "  kill -9 $PID"
        exit 1
    fi
fi

# Clean up PID file
rm -f "$PID_FILE"
echo -e "${GREEN}Cleanup complete${NC}"
