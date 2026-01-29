# AI Image Generation Feature

## Overview

The Gemini Telegram Bot now supports AI image generation using the Nano Banana MCP server, which connects to Google's Gemini Imagen model.

## Architecture

### Components

1. **MCP Client** (`src/mcp/client.ts`)
   - Connects to MCP servers via stdio transport
   - Manages tool calls and responses
   - Handles connection lifecycle

2. **Image Generation Tool** (`src/tools/imageGeneration.ts`)
   - Uses `executeMCPTool` helper to call nanobanana
   - Extracts base64 image data from MCP response
   - Requires user confirmation before execution

3. **Bot Integration** (`src/index.ts`)
   - Registers image generation tool
   - Handles image responses from Gemini
   - Sends images to Telegram using InputFile

### Flow

```
User: "Generate an image of a cute cat"
  ↓
Gemini decides to call generate_image tool
  ↓
Permission Manager requests confirmation
  ↓
User approves
  ↓
MCP Client connects to nanobanana (npx -y nanobanana)
  ↓
nanobanana calls Gemini Imagen API
  ↓
Base64 image returned
  ↓
GeminiClient collects image in response
  ↓
Bot converts base64 to Buffer
  ↓
Telegram receives image via InputFile
```

## Prerequisites

### 1. Install Nano Banana

The bot uses `npx -y nanobanana` to run the server on-demand, which will automatically download it on first use.

Alternatively, install globally:

```bash
npm install -g nanobanana
```

### 2. Google Cloud Configuration

Nano Banana requires Google Cloud credentials with Imagen API access. Set up:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/credentials.json"
```

Or configure default application credentials:

```bash
gcloud auth application-default login
```

## Usage

### Testing the Feature

1. **Start the bot**:
   ```bash
   npm start
   ```

2. **Send a message to generate an image**:
   ```
   請幫我生成一張可愛的貓咪圖片
   ```
   or
   ```
   Generate a sunset over mountains with vibrant colors
   ```

3. **Approve the permission request**:
   - Bot will send a confirmation message with "Approve" and "Reject" buttons
   - Click "Approve" to proceed

4. **Wait for image generation**:
   - Gemini Imagen typically takes 10-30 seconds
   - Bot will send the generated image when ready

### Example Prompts

- "Generate a futuristic city with flying cars"
- "Create an image of a peaceful forest with sunlight"
- "Draw a cartoon style robot playing guitar"
- "請生成一張櫻花盛開的日本庭園"

## Configuration

### Tool Definition

```typescript
{
  name: 'generate_image',
  description: 'Generate an image using AI based on a text prompt',
  parameters: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'Detailed description of the image to generate'
      }
    },
    required: ['prompt']
  },
  requiresConfirmation: true  // Always requires user approval
}
```

### MCP Server Configuration

- **Server Command**: `npx`
- **Server Args**: `['-y', 'nanobanana']`
- **Tool Name**: `generate_image`

## Error Handling

The tool handles various error scenarios:

1. **Service Not Available**: If nanobanana cannot be found or started
2. **API Errors**: If Gemini Imagen API fails
3. **Timeout**: If generation takes too long
4. **Invalid Response**: If image data cannot be extracted
5. **Telegram Upload Errors**: If image cannot be sent

Error messages are user-friendly and suggest corrective actions.

## Limitations

1. **Generation Time**: 10-30 seconds per image
2. **Prompt Length**: Maximum 1000 characters
3. **Image Size**: Subject to Telegram's file size limits (10MB for photos)
4. **Rate Limits**: Subject to Google Cloud API quotas
5. **Confirmation Required**: Always requires user approval

## Security Considerations

1. **User Confirmation**: All image generation requests require explicit user approval
2. **Prompt Validation**: Basic validation for length and content
3. **Error Messages**: Don't expose internal system details
4. **Resource Limits**: Prompt length limited to prevent abuse

## Troubleshooting

### "Image generation service not available"

- Ensure nanobanana is installed: `npm install -g nanobanana`
- Check Node.js/npm are properly configured
- Verify network connectivity

### "Failed to extract image data"

- Check nanobanana is up to date
- Verify Google Cloud credentials are configured
- Check MCP server logs for detailed errors

### Image not appearing in Telegram

- Verify image size is under Telegram limits
- Check base64 encoding is valid
- Ensure Buffer conversion is working correctly

## Development

### Testing MCP Client

```typescript
import { MCPClient } from './src/mcp/client'

const client = new MCPClient()
await client.connect('npx', ['-y', 'nanobanana'])

const tools = await client.listTools()
console.log('Available tools:', tools)

const result = await client.callTool('generate_image', {
  prompt: 'A beautiful sunset'
})
console.log('Result:', result)

await client.disconnect()
```

### Adding New MCP Tools

1. Create MCP client instance
2. Connect to server
3. Call tool with parameters
4. Extract and process results
5. Disconnect

See `src/mcp/client.ts` for helper functions.

## Future Enhancements

- [ ] Support multiple image generation backends (DALL-E, Stable Diffusion)
- [ ] Image editing capabilities
- [ ] Style presets (cartoon, realistic, artistic)
- [ ] Batch image generation
- [ ] Image-to-image transformations
- [ ] Negative prompts support
- [ ] Resolution/quality controls

## References

- [MCP SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
- [Nano Banana GitHub](https://github.com/gemini-cli-extensions/nanobanana)
- [Grammy File Handling](https://grammy.dev/guide/files)
- [Google Gemini Imagen API](https://cloud.google.com/vertex-ai/docs/generative-ai/image/overview)
