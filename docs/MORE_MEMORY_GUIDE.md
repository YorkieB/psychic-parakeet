# Getting More Memory (36.9 GiB required vs 15–17 GiB available)

Something (e.g. Ollama, a local LLM, ComfyUI, or another ML app) is asking for **36.9 GiB** while you only have **15.5 GiB** (or similar) available. You can either **increase what’s “available”** or **lower the 36.9 GiB requirement**.

---

## 1. Increase “available” memory (Windows)

### A. Increase virtual memory (page file)

This lets Windows use disk as extra “RAM” so total available can exceed physical RAM.

1. Press **Win + R**, type `sysdm.cpl`, Enter.
2. **Advanced** tab → **Performance** → **Settings**.
3. **Advanced** tab → **Virtual memory** → **Change**.
4. Uncheck **Automatically manage paging file size for all drives**.
5. Select your **C:** (or the drive with most free space).
6. Choose **Custom size**:
   - **Initial size (MB):** `24576` (24 GB)  
   - **Maximum size (MB):** `49152` (48 GB) or higher if you have disk space.
7. **Set** → **OK** → **OK** → restart when prompted (or restart later).

After restart, “available” memory can include this extra virtual memory, so the 36.9 GiB check may pass (slower than RAM but often enough for loading models).

### B. Free RAM before running the app

- Close browsers (many tabs), other IDEs, and heavy apps.
- In Task Manager (**Ctrl+Shift+Esc**): **Performance** → **Memory** to see free RAM before starting the app that needs 36.9 GiB.

---

## 2. Lower the 36.9 GiB requirement (use a smaller model)

If the message is from **Ollama** or another local LLM:

- **Use a smaller or quantized model** so it needs less than 17 GiB, e.g.:
  - 7B Q4: `ollama run llama3.2:7b` or `ollama run mistral:7b-instruct-q4_0`
  - 13B Q4: `ollama run llama3.2:13b` (often fits in ~10–12 GiB)
- **Reduce context length** (fewer GiB for the KV cache):
  - Environment variable: `OLLAMA_NUM_CTX=4096` (or `OLLAMA_CONTEXT_LENGTH=4096` depending on version).
  - **For qwen3-coder:30b on ~15 GiB:** set `OLLAMA_NUM_CTX=4096` (or `8192`) before running so total need stays under 15 GiB.
- **Force some layers on CPU** (less VRAM, more system RAM/CPU):
  - Example: `OLLAMA_NUM_GPU=0` to run fully on CPU (slow but no 36.9 GiB GPU requirement).
  - Or set a lower `OLLAMA_NUM_GPU` (number of layers on GPU) if your Ollama build supports it.

If the message is from **ComfyUI / PyTorch**:

- Use a smaller checkpoint or lower resolution.
- Set `PYTORCH_CUDA_ALLOC_CONF` or reduce batch size so VRAM usage stays under 17 GiB.

---

## 3. Quick reference

| Goal                         | Action                                                                 |
|-----------------------------|------------------------------------------------------------------------|
| More “available” memory     | Increase page file (e.g. 24–48 GB), then restart.                      |
| Use less RAM right now      | Close other apps; free RAM in Task Manager.                            |
| Run a smaller model (Ollama)| `ollama run <model>:7b` or `:13b` with Q4; set `OLLAMA_NUM_CTX=4096`.  |
| Run on CPU only (Ollama)    | `OLLAMA_NUM_GPU=0` (no 36.9 GiB GPU requirement; slower).              |

After increasing the page file and/or switching to a smaller model, try again; the “more system memory (36.9 GiB) than is available (17.4 GiB)” error should go away or reduce.
