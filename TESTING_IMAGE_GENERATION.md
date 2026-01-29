# Testing Image Generation Feature

## Quick Start

### Prerequisites

1. **Environment Variables** (already configured in `.env`):
   ```bash
   TELEGRAM_BOT_TOKEN=<your_token>
   GEMINI_API_KEY=<your_key>
   ```

2. **Google Cloud Credentials** (for Nano Banana):
   ```bash
   # Set up default application credentials
   gcloud auth application-default login

   # OR set credentials file
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/credentials.json"
   ```

3. **Install Dependencies**:
   ```bash
   npm install
   ```

### Running the Bot

```bash
npm start
```

## Manual Testing

### Test Case 1: Basic Image Generation

1. **Send message to bot**:
   ```
   請幫我生成一張可愛的小貓圖片
   ```

2. **Expected behavior**:
   - Bot sends confirmation request with "Approve" and "Reject" buttons
   - Tool name: `generate_image`
   - Shows prompt parameter

3. **Click "Approve"**

4. **Expected result**:
   - Message: "✅ 已允許"
   - Wait 10-30 seconds
   - Bot sends:
     a. Text response from Gemini (e.g., "我已經生成了一張可愛的小貓圖片！")
     b. Generated image of a cute cat

### Test Case 2: English Prompt

1. **Send message**:
   ```
   Generate a futuristic city with flying cars at sunset
   ```

2. **Click "Approve"**

3. **Expected result**:
   - Text response
   - High-quality image matching the description

### Test Case 3: Permission Rejection

1. **Send message**:
   ```
   Generate an image of a robot
   ```

2. **Click "Reject"**

3. **Expected result**:
   - Message: "❌ 已拒絕"
   - Gemini responds that permission was denied
   - No image generated

### Test Case 4: Complex Prompt

1. **Send message**:
   ```
   Generate a serene Japanese garden with cherry blossoms, a stone bridge over a koi pond, and Mount Fuji in the background during golden hour
   ```

2. **Click "Approve"**

3. **Expected result**:
   - Detailed image matching all elements of the prompt

## Checking Logs

Watch the console output for debug information:

```bash
npm start

# Look for these log messages:
# [ImageGen] Generating image with prompt: <prompt>
# [ImageGen] MCP tool response received
# [ImageGen] Successfully generated image (<size> bytes base64)
```

## Troubleshooting

### Issue: "Image generation service not available"

**Solution**:
```bash
# Install nanobanana globally
npm install -g nanobanana

# Test it works
npx -y nanobanana
```

### Issue: "Failed to extract image data from response"

**Solution**:
- Check Google Cloud credentials are configured
- Verify Imagen API is enabled in your GCP project
- Check you have quota/billing enabled

### Issue: MCP client connection error

**Solution**:
```bash
# Check Node.js version (should be 18+)
node --version

# Reinstall dependencies
rm -rf node_modules
npm install
```

### Issue: Image not appearing in Telegram

**Solution**:
- Check console for "Error sending image"
- Verify base64 data is valid
- Ensure image size is under Telegram limits (10MB)

## Expected Output Examples

### Console Output (Success)

```
🚀 Starting Gemini Telegram Bot...
✅ Bot is running!
[ImageGen] Generating image with prompt: a cute cat
[ImageGen] MCP tool response received
[ImageGen] Successfully generated image (152837 bytes base64)
```

### Console Output (Error)

```
[ImageGen] Error generating image: Error: Failed to connect to MCP server
Error sending message: Image generation service not available
```

## Performance Metrics

- **Cold start**: ~5-10 seconds (first time nanobanana downloads)
- **Warm generation**: ~15-25 seconds per image
- **Image size**: Typically 100-500 KB (base64: ~150-700 KB)

## Next Steps

After confirming image generation works:

1. Test with various prompt styles (realistic, cartoon, abstract)
2. Test error handling (reject permission, invalid prompts)
3. Test multiple consecutive generations
4. Monitor Google Cloud usage/quotas

## Quick Debug Commands

```bash
# Check if nanobanana is accessible
npx -y nanobanana --help

# Verify TypeScript compilation
npx tsc --noEmit

# Check bot token is valid
curl https://api.telegram.org/bot<YOUR_TOKEN>/getMe

# Test MCP client directly (create test script)
node -e "console.log(require('./src/mcp/client'))"
```

## Known Limitations

1. **Single image per prompt**: Currently generates one image at a time
2. **No caching**: Each request generates a new image
3. **No quality controls**: Uses Imagen defaults
4. **Synchronous**: Bot waits for generation to complete

## Success Criteria

- ✅ Permission confirmation appears
- ✅ User can approve/reject
- ✅ Image generates within 30 seconds
- ✅ Image appears in Telegram chat
- ✅ Gemini provides contextual response
- ✅ Error messages are user-friendly
- ✅ Multiple generations work consecutively

---

**Note**: If you encounter persistent issues with nanobanana, check:
- [Nano Banana GitHub Issues](https://github.com/gemini-cli-extensions/nanobanana/issues)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
