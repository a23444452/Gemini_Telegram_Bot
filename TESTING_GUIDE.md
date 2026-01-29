# Testing Guide

Comprehensive manual testing guide for the Gemini Telegram Bot.

## Prerequisites

### 1. Environment Setup

```bash
# Verify environment variables
cat .env

# Required variables:
# - TELEGRAM_BOT_TOKEN
# - TELEGRAM_ALLOWED_USERS
# - GOOGLE_API_KEY
# - GOOGLE_APPLICATION_CREDENTIALS (for image generation)
```

### 2. Install Dependencies

```bash
# Install Node dependencies
bun install

# Install Playwright browsers
npx playwright install chromium

# Verify TypeScript compilation
bun run typecheck
```

### 3. Start the Bot

```bash
# Start bot in background
./start.sh

# Verify bot is running
./status.sh

# Check logs
tail -f bot.log
```

## Test Categories

## 1. Authentication & Authorization

### Test 1.1: Authorized User Access

**Steps:**
1. Send `/start` to the bot from an allowed user
2. Send `/help` command

**Expected Results:**
- Bot responds with welcome message
- Help menu displays all available commands
- No error messages

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

### Test 1.2: Unauthorized User Access

**Steps:**
1. Send `/start` from a user NOT in `TELEGRAM_ALLOWED_USERS`

**Expected Results:**
- Bot responds with "Access denied" or similar message
- Bot ignores all subsequent commands from this user

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

## 2. Basic Commands

### Test 2.1: Directory Navigation

**Steps:**
1. Send `/pwd` - Show current directory
2. Send `/ls` - List current directory
3. Send `/cd /tmp` - Change to /tmp directory
4. Send `/pwd` - Verify directory changed

**Expected Results:**
- `/pwd` shows current working directory path
- `/ls` shows directory contents with file/folder icons
- `/cd` successfully changes directory (if path is allowed)
- Working directory persists across commands

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

### Test 2.2: New Conversation

**Steps:**
1. Have a conversation with the bot
2. Send `/new` command
3. Reference previous conversation

**Expected Results:**
- `/new` clears conversation history
- Bot does not remember previous context
- Confirmation message displayed

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

## 3. File Operations (Read)

### Test 3.1: Read File

**Steps:**
1. Create a test file: `echo "Hello World" > /tmp/test.txt`
2. Send to bot: "Please read the file /tmp/test.txt"

**Expected Results:**
- Bot calls `read_file` tool automatically (no confirmation needed)
- Bot displays file contents: "Hello World"
- No permission prompt shown (read is auto-approved)

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

### Test 3.2: List Directory

**Steps:**
1. Send to bot: "Please list the files in /tmp"

**Expected Results:**
- Bot calls `list_directory` tool automatically
- Bot displays file and folder names
- Shows relative sizes and types

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

## 4. File Operations (Write)

### Test 4.1: Write File

**Steps:**
1. Send to bot: "Please create a file /tmp/bot_test.txt with content 'Testing write'"
2. Click "Allow" on permission prompt
3. Verify file exists: `cat /tmp/bot_test.txt`

**Expected Results:**
- Bot shows permission prompt with file path and content preview
- After approval, bot executes `write_file` tool
- File is created with correct content
- Bot confirms success

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

### Test 4.2: Deny Write Operation

**Steps:**
1. Send to bot: "Please create a file /tmp/denied.txt with content 'Test'"
2. Click "Deny" on permission prompt

**Expected Results:**
- Bot shows permission prompt
- After denial, bot does NOT create file
- Bot responds with "Operation cancelled" or similar
- File does not exist

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

### Test 4.3: Append to File

**Steps:**
1. Create initial file: `echo "Line 1" > /tmp/append_test.txt`
2. Send to bot: "Please append 'Line 2' to /tmp/append_test.txt"
3. Approve operation
4. Verify: `cat /tmp/append_test.txt`

**Expected Results:**
- Bot requests permission for append operation
- After approval, content is appended (not overwritten)
- File contains both lines

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

### Test 4.4: Delete File

**Steps:**
1. Create test file: `touch /tmp/delete_me.txt`
2. Send to bot: "Please delete /tmp/delete_me.txt"
3. Approve operation
4. Verify: `ls /tmp/delete_me.txt` (should not exist)

**Expected Results:**
- Bot shows permission prompt with file path
- After approval, file is deleted
- Bot confirms deletion
- File no longer exists

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

### Test 4.5: Create Directory

**Steps:**
1. Send to bot: "Please create a directory /tmp/test_dir"
2. Approve operation
3. Verify: `ls -ld /tmp/test_dir`

**Expected Results:**
- Bot requests permission
- Directory is created after approval
- Bot confirms success

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

### Test 4.6: Move/Rename File

**Steps:**
1. Create file: `echo "Move me" > /tmp/source.txt`
2. Send to bot: "Please move /tmp/source.txt to /tmp/destination.txt"
3. Approve operation
4. Verify both paths

**Expected Results:**
- Bot requests permission showing source and destination
- Source file is moved/renamed to destination
- Source no longer exists, destination has correct content

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

### Test 4.7: Copy File

**Steps:**
1. Create file: `echo "Copy me" > /tmp/original.txt`
2. Send to bot: "Please copy /tmp/original.txt to /tmp/copy.txt"
3. Approve operation
4. Verify both files exist

**Expected Results:**
- Bot requests permission showing source and destination
- Both files exist after operation
- Both files have identical content

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

## 5. Browser Automation

### Test 5.1: Browse URL

**Steps:**
1. Send to bot: "Please browse https://example.com and tell me what it says"

**Expected Results:**
- Bot calls `browse_url` tool automatically (no confirmation)
- Bot extracts page title and text content
- Bot summarizes the webpage content
- Operation completes within timeout (30 seconds default)

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

### Test 5.2: Screenshot URL

**Steps:**
1. Send to bot: "Take a screenshot of https://google.com"

**Expected Results:**
- Bot calls `screenshot_url` tool automatically
- Bot sends screenshot image in PNG format
- Image shows the actual webpage
- Operation completes within timeout

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

### Test 5.3: Extract Data from Webpage

**Steps:**
1. Send to bot: "Extract the main heading from https://example.com"

**Expected Results:**
- Bot calls `extract_data` tool with appropriate CSS selector
- Bot extracts and returns the heading text
- Handles missing elements gracefully

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

## 6. AI Image Generation

### Test 6.1: Generate Image

**Steps:**
1. Send to bot: "Generate an image of a cute kitten playing with yarn"
2. Click "Allow" on permission prompt

**Expected Results:**
- Bot shows permission prompt (image generation costs API quota)
- After approval, bot calls `generate_image` tool
- Bot sends generated image
- Image matches the description

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

### Test 6.2: Image Generation Failure Handling

**Steps:**
1. If Google Cloud credentials are not configured, try generating an image

**Expected Results:**
- Bot shows appropriate error message
- Error explains authentication requirement
- Bot suggests checking GOOGLE_APPLICATION_CREDENTIALS

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

## 7. Document Analysis

### Test 7.1: Analyze PDF Document

**Steps:**
1. Create or download a test PDF file
2. Send to bot: "Please analyze the PDF at /path/to/document.pdf"

**Expected Results:**
- Bot extracts text from PDF
- Bot summarizes document content
- Handles multi-page PDFs correctly

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

### Test 7.2: Analyze Word Document

**Steps:**
1. Create or download a test DOCX file
2. Send to bot: "Please analyze the document at /path/to/document.docx"

**Expected Results:**
- Bot extracts text from DOCX
- Bot summarizes document content
- Preserves basic formatting information

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

## 8. File Organization

### Test 8.1: Organize Files by Type

**Steps:**
1. Create test directory with mixed files:
   ```bash
   mkdir /tmp/test_organize
   touch /tmp/test_organize/{test1.txt,test2.txt,image.jpg,doc.pdf}
   ```
2. Send to bot: "Please organize files in /tmp/test_organize by type"
3. Approve operation

**Expected Results:**
- Bot creates subdirectories (documents/, images/, etc.)
- Files are moved to appropriate subdirectories
- Original directory structure is updated
- Bot provides summary of organization

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

## 9. Web Research

### Test 9.1: Search and Summarize

**Steps:**
1. Send to bot: "Search for information about TypeScript and summarize the results"

**Expected Results:**
- Bot performs web search (if search tool is available)
- Bot summarizes search results
- Provides relevant links or citations

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

## 10. Security & Path Validation

### Test 10.1: Blocked Path Access

**Steps:**
1. Send to bot: "Read the file ~/.ssh/id_rsa"

**Expected Results:**
- Bot denies access to sensitive path
- Error message explains path is not allowed
- No permission prompt shown (hard block)

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

### Test 10.2: Path Traversal Prevention

**Steps:**
1. Send to bot: "Read the file /allowed/path/../../etc/passwd"

**Expected Results:**
- Bot detects path traversal attempt
- Access is denied
- Error message shown

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

### Test 10.3: Outside Allowed Paths

**Steps:**
1. Send to bot: "List files in /root"

**Expected Results:**
- Bot checks if path is in ALLOWED_PATHS
- If not allowed, operation is denied
- Error message explains allowed paths

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

## 11. Quota Management

### Test 11.1: Normal Quota Usage

**Steps:**
1. Check initial quota: Send a few messages
2. Bot should track token usage

**Expected Results:**
- Quota is tracked per user
- No warnings initially
- Usage increases with each request

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

### Test 11.2: Quota Warning

**Steps:**
1. Generate enough requests to reach 80% of quota
2. Continue sending messages

**Expected Results:**
- At 80% threshold, bot shows warning
- Warning includes current usage and limit
- Bot still processes requests

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

### Test 11.3: Quota Limit Exceeded

**Steps:**
1. Continue requests beyond quota limit

**Expected Results:**
- Bot refuses new requests
- Error message explains quota exceeded
- Message includes reset time

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

## 12. MCP Integration

### Test 12.1: MCP Server Connection

**Steps:**
1. Configure MCP server in config
2. Restart bot
3. Send command that uses MCP tool

**Expected Results:**
- Bot connects to MCP server
- MCP tools are available in tool registry
- Tools execute correctly

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

### Test 12.2: MCP Server Failure

**Steps:**
1. Stop MCP server or misconfigure
2. Try to use MCP tool

**Expected Results:**
- Bot detects MCP server unavailable
- Error message is user-friendly
- Bot continues working with other tools

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

## 13. Conversation & Context

### Test 13.1: Multi-turn Conversation

**Steps:**
1. Send: "Create a file called test.txt with content 'Hello'"
2. Approve and wait for completion
3. Send: "Now read that file"

**Expected Results:**
- Bot remembers context from first message
- Bot understands "that file" refers to test.txt
- Operation completes successfully

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

### Test 13.2: Context Persistence

**Steps:**
1. Have a conversation about a specific topic
2. Bot should maintain context across multiple messages
3. Send `/new` to clear context
4. Reference previous conversation

**Expected Results:**
- Bot remembers conversation context
- Context is cleared after `/new`
- Bot does not remember cleared context

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

## 14. Error Handling

### Test 14.1: Invalid File Path

**Steps:**
1. Send to bot: "Read the file /nonexistent/path/file.txt"

**Expected Results:**
- Bot attempts operation
- Returns clear error message
- Error explains file not found

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

### Test 14.2: Permission Timeout

**Steps:**
1. Send write operation request
2. Wait 30 seconds without responding to permission prompt

**Expected Results:**
- Permission request times out
- Operation is automatically denied
- Bot sends timeout message

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

### Test 14.3: Network Error

**Steps:**
1. Disconnect internet
2. Try to browse URL or generate image

**Expected Results:**
- Bot handles network error gracefully
- Error message is user-friendly
- Bot remains operational

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

## 15. Performance & Stability

### Test 15.1: Large File Handling

**Steps:**
1. Create large file: `dd if=/dev/zero of=/tmp/large.bin bs=1M count=10`
2. Send to bot: "Read the file /tmp/large.bin"

**Expected Results:**
- Bot handles large file appropriately
- Returns error or truncates if file too large
- Bot remains responsive

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

### Test 15.2: Concurrent Requests

**Steps:**
1. Send multiple messages quickly (5-10 messages)
2. All should be different commands

**Expected Results:**
- Bot processes all requests
- Responses may be queued but all complete
- No crashes or errors

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

### Test 15.3: Long-running Operation

**Steps:**
1. Browse a slow-loading website
2. Wait for operation to complete

**Expected Results:**
- Bot shows typing indicator while processing
- Operation completes or times out gracefully
- Timeout duration matches BROWSER_TIMEOUT setting

**Status:** ⬜ Not Tested | ✅ Pass | ❌ Fail

## Troubleshooting

### Common Issues

#### Bot not responding
```bash
# Check if bot is running
./status.sh

# Check logs for errors
tail -50 bot.log

# Restart bot
./stop.sh && ./start.sh
```

#### Permission prompts not showing
- Check user ID is in TELEGRAM_ALLOWED_USERS
- Verify operation requires permission (writes, not reads)
- Check bot logs for errors

#### Tools not working
```bash
# Check environment variables
cat .env

# Verify dependencies
bun install
npx playwright install chromium

# Check TypeScript compilation
bun run typecheck
```

#### Quota issues
- Check quota limits in .env
- Wait for quota reset (hourly/daily)
- Adjust limits if needed

## Test Summary Template

Date: _______________
Tester: _______________

Total Tests: 44
Passed: ___ / 44
Failed: ___ / 44
Not Tested: ___ / 44

Critical Failures: _______
Notes: _______________________

## Continuous Testing

For ongoing development:
1. Run these tests after each major feature addition
2. Run subset of tests before each release
3. Add new test cases for new features
4. Update test cases when behavior changes

## Automated Testing

While this guide focuses on manual testing, consider:
- Writing unit tests for core functions
- Adding integration tests for tool execution
- Creating end-to-end tests with Playwright
- Setting up CI/CD pipeline for automated testing
