# Largest Memory-Consuming Applications & Dependencies

Generated to help get memory down. Two views: **RAM (running)** and **disk (install/cache)**.

---

## 1. Running applications (RAM – close to free memory)

**Total working set (all processes): ~9.2 GB**

| Application / process           | Total RAM (MB) | # processes | Action to reduce |
|---------------------------------|----------------|-------------|-------------------|
| **Windsurf**                    | **1,829**      | 16         | Close Windsurf if you use Cursor only. |
| **language_server_windows_x64** | **1,277**      | 1          | Language server (often Cursor/VS); restart IDE or disable heavy extensions. |
| **Cursor**                      | **1,196**      | 19         | Close unused windows; disable unused extensions. |
| **comet**                       | **846**        | 34         | Perplexity Comet app; uninstall to free RAM. |
| **OneDrive**                    | **446**        | 1          | Pause sync or close if not needed. |
| **svchost**                     | **434**        | 92         | Windows services; don’t kill. |
| **java**                        | **306**        | 1          | Close the Java app (e.g. IDE, backend) if not needed. |
| **msedgewebview2**              | **294**        | 31         | Edge WebView (used by many apps); close apps that embed it. |
| **powershell**                  | **275**        | 18         | Close unused PowerShell windows. |
| **mc-fw-host**                  | **204**        | 2          | Often McAfee/security; check if you can disable or replace. |
| **Copilot**                     | **200**        | 1          | Disable or close if not used. |
| **msedge**                      | **155**        | 10         | Close Edge or reduce tabs. |
| **explorer**                    | **141**        | 1          | Windows Explorer; keep. |
| **OmenCommandCenterBackground** | **120**        | 1          | HP Omen; disable from startup if not needed. |
| **node**                        | **95**         | 5          | Stop dev servers / Node apps you don’t need. |
| **snyk-win**                    | **93**         | 1          | Quit Snyk if not actively scanning. |
| **ollama**                      | **43**         | 1          | Stop Ollama when not using local LLM: `ollama stop` or quit. |

**Quick wins to free RAM:** Close Windsurf (use Cursor only), close OneDrive or pause sync, quit Snyk, stop Ollama when idle, close extra Cursor windows and Node/PowerShell windows.

---

## 2. Largest installs & dependencies (disk – remove/prune to free space and reduce pressure)

| What                          | Size (approx.) | Action to reduce |
|-------------------------------|----------------|-------------------|
| **Ollama models**             | **17.3 GB**    | `ollama rm <model>` for models you don’t use. You have qwen3-coder:30b (~18 GB). |
| **Miniconda base**            | **13.4 GB**    | Remove unused conda packages or create a minimal env and use that instead of base. |
| **local-tts .venv**           | **5.3 GB**     | Keep if you use Jarvis TTS; else remove the `.venv` folder and recreate only if needed. |
| **Ollama app** (Programs)     | **5.1 GB**     | Keep to run Ollama; no need to remove. |
| **Conda vision-engine**       | **2.7 GB**     | `conda env remove -n vision-engine` if you don’t use that project. |
| **.vscode** (user data)       | **2.0 GB**     | Prune extensions/cache if you use Cursor mainly. |
| **Cursor** (cache/extensions) | **1.8 GB**     | Clear Cursor caches or disable heavy extensions. |
| **Windsurf** (Programs)       | **1.5 GB**     | Uninstall if you only use Cursor. |
| **pnpm store**                | **0.8 GB**     | `pnpm store prune` to remove unreferenced packages. |
| **jarvis-desktop node_modules** | **0.77 GB**  | Keep for development; remove only if you delete the app. |
| **npm global**                | **0.65 GB**    | Uninstall unused globals (see docs/LIKELY_UNUSED_INSTALLS.md). |
| **codeeditor node_modules**   | **0.45 GB**    | Remove if you don’t use that project. |
| **lightbrowser node_modules** | **0.44 GB**    | Remove if you don’t use webx/lightbrowser. |
| **Root node_modules**         | **0.35 GB**    | Keep for Jarvis Orchestrator. |
| **dashboard node_modules**    | **0.2 GB**     | Keep for dashboard. |
| **Algo-2 node_modules**       | **0.12 GB**    | Remove if you don’t use Algo-2. |

---

## 3. Summary – get memory down

**RAM (running):**

1. Close **Windsurf** if you use Cursor only (~1.8 GB).
2. **Pause or close OneDrive** when not syncing (~0.4 GB).
3. **Quit Snyk** when not scanning (~0.1 GB).
4. **Stop Ollama** when not using local LLM: `ollama stop` (~0.04 GB).
5. Close **extra Cursor windows** and **Node/PowerShell** sessions you don’t need.
6. Disable **Omen / Perplexity Comet / Copilot** from startup if you don’t use them.

**Disk / dependencies:**

1. Remove **conda vision-engine** env if unused (~2.7 GB).
2. **Prune pnpm**: `pnpm store prune` (~hundreds of MB).
3. Uninstall **Windsurf** if you only use Cursor (~1.5 GB).
4. Trim **Ollama** models you don’t need (you already removed several; only qwen3-coder:30b left).
5. Trim **conda base** or use a minimal env instead of base (~13 GB potential).
6. Remove **codeeditor** or **lightbrowser** or **Algo-2** `node_modules` (or whole folders) if those projects are unused.

After closing the biggest running apps, total RAM use can drop by several GB, which helps with the “36.9 GiB required vs 15.5 GiB available” issue when combined with a larger page file or reduced context (e.g. `OLLAMA_NUM_CTX=4096`).
