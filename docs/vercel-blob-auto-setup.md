# Vercel Blob Storage Automatic Setup

## Overview

Fluorite-flake now includes automatic Vercel Blob storage token configuration, eliminating the need for manual token management.

## Features

### 🚀 Automatic Token Retrieval
- Automatically retrieves BLOB_READ_WRITE_TOKEN from Vercel
- Creates Blob stores if they don't exist
- Configures tokens in both local and Vercel environments

### 📦 Setup Commands

After creating a project with Vercel Blob storage:

```bash
# Automatic setup (recommended)
npm run setup:blob

# Alternative command
npm run setup:storage

# Check configuration
npm run check:blob
```

### 🔧 How It Works

1. **Project Linking**: Automatically links your project to Vercel
2. **Store Creation**: Creates a new Blob store if none exists
3. **Token Retrieval**: Fetches the token from Vercel's API
4. **Environment Setup**: Configures token in:
   - `.env.local` for local development
   - Vercel environment variables for deployments
   - All environments (production, preview, development)

### 🔑 Manual Fallback

If automatic retrieval fails, the script provides clear instructions:

1. Visit https://vercel.com/dashboard/stores
2. Select or create a Blob store
3. Copy the Read/Write token
4. The script will prompt for the token

### 📝 Deployment Integration

When deploying with `npm run deploy:setup`, the script:
- Checks for existing Blob configuration
- Runs automatic setup if needed
- Ensures token is set in deployment environment

### ✅ Verification

Use the check command to verify configuration:

```bash
npm run check:blob
```

This will:
- Test the token validity
- List existing blobs
- Report any configuration issues

## Benefits

### Before (Manual Process)
1. Go to Vercel dashboard
2. Create Blob store manually
3. Copy token
4. Add to `.env.local`
5. Add to Vercel environment variables
6. Hope you got it right

### After (Automatic)
1. Run `npm run setup:blob`
2. Done! ✨

## Troubleshooting

### Vercel CLI Not Found
```bash
npm i -g vercel
```

### Project Not Linked
The script will automatically run `vercel link` when needed.

### Token Retrieval Failed
- Ensure you're logged in: `vercel login`
- Check you have access to the project
- Use manual fallback if needed

## Security Notes

- Tokens are stored securely in environment variables
- Never commit `.env.local` to version control
- Tokens are scoped to your Vercel project
- Use different tokens for different environments when needed

## Example Workflow

```bash
# 1. Create project
npx fluorite-flake create

# 2. Select Vercel Blob storage
# 3. Navigate to project
cd my-project

# 4. Setup Blob automatically
npm run setup:blob

# 5. Verify configuration
npm run check:blob

# 6. Start developing
npm run dev

# 7. Deploy with automatic token setup
npm run deploy:setup
```

## API Usage

Once configured, use Vercel Blob in your application:

```typescript
import { uploadBuffer, deleteFile, listFiles } from '@/lib/storage';

// Upload a file
const url = await uploadBuffer(buffer, 'file.pdf', 'application/pdf');

// List files
const files = await listFiles({ limit: 10 });

// Delete a file
await deleteFile(url);
```

## Environment Variables

The script manages these automatically:

- `BLOB_READ_WRITE_TOKEN` - Your Vercel Blob access token

No manual configuration needed! 🎉