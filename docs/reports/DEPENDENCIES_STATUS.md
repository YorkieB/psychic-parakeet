# Knowledge Base Dependencies Status

## ✅ Installed Dependencies

The following dependencies are **required** and should be installed:

### Core Dependencies (Required)
- ✅ `ioredis` - Redis client (optional, falls back to memory cache)
- ⚠️ `@aws-sdk/client-s3` - AWS S3 client (optional, HTTP method used by default)

### Optional Dependencies
- ⚠️ `@huggingface/datasets` - HuggingFace datasets (Python package, not available via npm)
  - **Note**: This is a Python package, not an npm package
  - Install via: `pip install datasets huggingface_hub`
  - Or use a Python bridge library

## 📦 Installation Commands

### Install Available npm Packages

```bash
# Install AWS SDK (optional - HTTP method works without it)
npm install @aws-sdk/client-s3

# Install Redis client (optional - memory cache works without it)
npm install ioredis
```

### Install Python Packages (for Stack v2 streaming)

```bash
# Install HuggingFace datasets (Python)
pip install datasets huggingface_hub
```

## 🧪 Testing Status

### What Works Without External Dependencies

1. ✅ **Software Heritage HTTP Client** - Works without AWS SDK
2. ✅ **Cache Manager (Memory)** - Works without Redis
3. ✅ **License Filter** - No dependencies
4. ✅ **Code Search** - Works without Stack v2 (if you provide metadata manually)

### What Requires Dependencies

1. ⚠️ **Stack v2 Streaming** - Requires Python `datasets` package
2. ⚠️ **S3 SDK Method** - Requires `@aws-sdk/client-s3` (HTTP method works without it)
3. ⚠️ **Redis Cache** - Requires `ioredis` (memory cache works without it)
4. ⚠️ **RAG Pipeline** - Requires `OPENAI_API_KEY` environment variable

## 🚀 Quick Test (Without All Dependencies)

Run the simple test that works with minimal dependencies:

```bash
npx ts-node scripts/test-knowledge-base-simple.ts
```

This tests:
- ✅ Software Heritage HTTP client
- ✅ License filter
- ✅ Memory cache
- ✅ Batch fetching

## 📝 Full Installation

For full functionality, install:

```bash
# npm packages
npm install @aws-sdk/client-s3 ioredis

# Python packages (if you want Stack v2 streaming)
pip install datasets huggingface_hub

# Environment variables
export OPENAI_API_KEY=your_key
export REDIS_URL=redis://localhost:6379  # Optional
```

## 🔧 Current Status

- **Core functionality**: ✅ Works (HTTP client, memory cache)
- **Stack v2 streaming**: ⚠️ Requires Python packages
- **S3 SDK method**: ⚠️ Optional (HTTP method works)
- **Redis cache**: ⚠️ Optional (memory cache works)
- **RAG pipeline**: ⚠️ Requires OpenAI API key

## 💡 Workaround for Stack v2

Since HuggingFace datasets is a Python package, you have options:

1. **Use Python bridge**: Use `node-python-bridge` or similar to call Python from Node.js
2. **Use HuggingFace Hub API**: Query the Hub API directly instead of using datasets library
3. **Make it optional**: Stack v2 streaming is optional - you can provide code examples manually

The knowledge base is designed to work incrementally - each component can work independently.
