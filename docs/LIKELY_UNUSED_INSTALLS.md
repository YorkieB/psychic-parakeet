# Likely-Unused Installs (from other projects)

These were found on your system. **Only remove if you don't use them in any other project.**

---

## 1. Global npm packages (~670 MB under `%APPDATA%\npm`)

| Package | Typical use | Jarvis Ochestrator uses it? | Safe to uninstall? |
|--------|--------------|------------------------------|--------------------|
| **create-react-app** | Old React scaffold (deprecated) | No – uses Vite | ✅ Likely yes |
| **expo-cli** | React Native / Expo mobile apps | No | ✅ Likely yes (unless you have a mobile project) |
| **firebase-tools** | Firebase CLI (hosting, firestore, etc.) | No | ✅ Likely yes (unless you use Firebase elsewhere) |
| **snyk** | Security scanning | No (uses `npm audit`) | ✅ Optional |
| **@biomejs/biome** | Linter/formatter | In root `package.json` as dep – not required globally | ⚠️ Optional (keep if you like `biome` CLI globally) |
| **chalk** | Terminal colors | Often a dependency of other globals | ⚠️ Keep |
| **pm2** | Process manager | Yes – `npm run pm2:start` etc. | ❌ Keep |
| **pnpm** | Package manager | Yes – jarvis-desktop has pnpm-lock | ❌ Keep |
| **typescript**, **vite** | Build/language | Used in projects | ❌ Keep |
| **npm** | Package manager | Yes | ❌ Keep |

**Uninstall commands (run only if you don't need these elsewhere):**

```powershell
npm uninstall -g create-react-app
npm uninstall -g expo-cli
npm uninstall -g firebase-tools
npm uninstall -g snyk
# Optional: npm uninstall -g @biomejs/biome
```

---

## 2. Node versions (NVM) – ~79 MB per version

You have:

- **Node 24.12.0**
- **Node 20.20.0** (current) ← Jarvis uses this
- **Node 18.20.8**

If you don't have any project that needs Node 18 or Node 24, you can remove them to free space:

```powershell
nvm uninstall 18.20.8
nvm uninstall 24.12.0
```

(Keep 20.20.0 as current.)

---

## 3. Conda base environment (~13.7 GB)

`conda list` in base shows 234+ packages, including ML libs (e.g. `accelerate`, `bitsandbytes`). Jarvis uses:

- **local-tts** – has its own `.venv` (not conda base)
- **Jarvis-Emotions-Engine** / **Jarvis Visual Engine** – may use Python; check if they use conda or venv

You also have a separate env: **vision-engine**.

- If you **don't** run any other Python/ML projects that rely on **base**, you can:
  - Create a minimal env for the one thing that needs conda and use that instead of base, or
  - Remove unused packages from base:  
    `conda list` then `conda uninstall <package>` for ones you don't need.
- If **vision-engine** is from an old project you no longer use:

  ```powershell
  conda env remove -n vision-engine
  ```

---

## 4. pnpm store (~830 MB)

Shared cache for all pnpm projects. Safe to prune if you're fine re-downloading packages when needed:

```powershell
pnpm store prune
```

---

## 5. Summary – safe to remove first

| Action | Frees (approx.) |
|--------|------------------|
| `npm uninstall -g create-react-app expo-cli firebase-tools snyk` | ~100–400 MB |
| `nvm uninstall 18.20.8` and `nvm uninstall 24.12.0` | ~160 MB |
| `pnpm store prune` | Variable (often 200–500 MB) |
| Conda: remove `vision-engine` env or trim base | Up to several GB if you remove whole env or many packages |

Run only the commands for tools you're sure you don't use in any other project.
