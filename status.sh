#!/bin/bash

# Gemini Telegram Bot - Status Script
# This script displays the current status of the bot

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

echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}  Gemini Telegram Bot - Status${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# Check if PID file exists
if [ ! -f "$PID_FILE" ]; then
    echo -e "Status: ${RED}Not running${NC}"
    echo ""
    echo "Start the bot with: ./start.sh"
    exit 0
fi

# Read PID
PID=$(cat "$PID_FILE")

# Check if process is running
if ! ps -p "$PID" > /dev/null 2>&1; then
    echo -e "Status: ${RED}Not running (stale PID file)${NC}"
    echo ""
    echo "Cleaning up stale PID file..."
    rm -f "$PID_FILE"
    echo "Start the bot with: ./start.sh"
    exit 0
fi

# Bot is running - display information
echo -e "Status: ${GREEN}Running ✓${NC}"
echo ""
echo -e "${BLUE}Process Information:${NC}"
echo "  PID: $PID"

# Get start time (works on both macOS and Linux)
if [ "$(uname)" = "Darwin" ]; then
    # macOS
    START_TIME=$(ps -p "$PID" -o lstart= | xargs)
    ELAPSED=$(ps -p "$PID" -o etime= | xargs)
else
    # Linux
    START_TIME=$(ps -p "$PID" -o lstart= | xargs)
    ELAPSED=$(ps -p "$PID" -o etime= | xargs)
fi

echo "  Started: $START_TIME"
echo "  Uptime: $ELAPSED"

# Get memory usage
MEM=$(ps -p "$PID" -o rss= | awk '{printf "%.1f MB", $1/1024}')
echo "  Memory: $MEM"

# Get CPU usage
CPU=$(ps -p "$PID" -o %cpu= | xargs)
echo "  CPU: ${CPU}%"

# Check log file
echo ""
echo -e "${BLUE}Log Information:${NC}"
if [ -f "$LOG_FILE" ]; then
    LOG_SIZE=$(du -h "$LOG_FILE" | cut -f1)
    echo "  Log file: $LOG_FILE"
    echo "  Log size: $LOG_SIZE"
else
    echo "  Log file: ${YELLOW}Not found${NC}"
fi

# Display recent logs
echo ""
echo -e "${BLUE}Recent Logs (last 15 lines):${NC}"
echo "=========================================="
if [ -f "$LOG_FILE" ]; then
    tail -15 "$LOG_FILE"
else
    echo -e "${YELLOW}No log file available${NC}"
fi
echo "=========================================="

echo ""
echo -e "${BLUE}Commands:${NC}"
echo "  ./stop.sh           - Stop the bot"
echo "  tail -f $LOG_FILE   - View live logs"
echo ""
