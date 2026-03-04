# Using Your Own LLM on Vertex AI

To use **your own** deployed model (e.g. your dedicated endpoint on Vertex AI) for chat in Jarvis:

## 1. Service account from the same project

The backend must authenticate with a **service account that belongs to the same GCP project** that owns your endpoint.

1. In [Google Cloud Console](https://console.cloud.google.com), open the **project where your endpoint lives** (the one where you see your endpoint in Vertex AI → Endpoints).
2. Go to **IAM & Admin → Service accounts**.
3. **Create service account** (e.g. name: `jarvis-vertex`).
4. Grant it role **Vertex AI User** (or at least permission to call the endpoint).
5. **Create key** → JSON → download the key file and save it somewhere safe (e.g. `C:\Users\conta\jarvis-vertex-key.json`).

## 2. Set environment variables

In your project root `.env`:

```env
# Your dedicated endpoint (from Vertex AI → your endpoint → Dedicated endpoint)
VERTEX_AI_ENDPOINT_URL=https://mg-endpoint-977b9d87-be15-46e0-bff4-f969ecaee420.europe-west4-51539011350.prediction.vertexai.goog

# Use the STANDARD Vertex API (recommended for "my own LLM") so the service account can call your endpoint
VERTEX_AI_USE_STANDARD_API=true

# Project ID of the project that owns the endpoint (Project ID, not project number)
# Find it in Cloud Console: project dropdown → Project ID
VERTEX_AI_PROJECT_ID=your-project-id

# Region where your endpoint is (e.g. europe-west4)
VERTEX_AI_REGION=europe-west4

# Optional: endpoint ID; if not set, it is parsed from VERTEX_AI_ENDPOINT_URL
# VERTEX_AI_ENDPOINT_ID=mg-endpoint-977b9d87-be15-46e0-bff4-f969ecaee420

# Path to the service account JSON key (required for your own LLM)
GOOGLE_APPLICATION_CREDENTIALS=C:\Users\conta\jarvis-vertex-key.json

# Model / params (adjust if your model expects different)
VERTEX_AI_MODEL=qwen3-30b-a3b-claude-4_5-opus-high-reasoning
VERTEX_AI_MAX_TOKENS=4000
VERTEX_AI_TEMPERATURE=0.1
```

Replace:

- `your-project-id` with the **Project ID** (e.g. `my-vertex-project`) of the project that contains your endpoint.
- `GOOGLE_APPLICATION_CREDENTIALS` with the **full path** to your downloaded service account JSON key.

## 3. Restart the Jarvis backend

After saving `.env`, restart the backend so it picks up the new variables and uses the service account to call your endpoint.

---

**Summary:** Use a **service account key** from the project that owns your endpoint, set **GOOGLE_APPLICATION_CREDENTIALS** and **VERTEX_AI_USE_STANDARD_API=true** plus **VERTEX_AI_PROJECT_ID** and **VERTEX_AI_REGION**, and the chat will use your own LLM.
