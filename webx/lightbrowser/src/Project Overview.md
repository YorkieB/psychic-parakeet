
# Project Overview
This project is a **privacy-focused homepage search engine** that integrates with Brave Search. It has a custom frontend for entering queries and displaying results, and a backend service that queries the Brave Search API (and potentially other sources in future). The emphasis is on delivering fast, unbiased search results with **no user tracking**, aligning with Brave’s privacy principles.

# Technology Stack & Preferences
- **Frontend**: Modern JavaScript (ES6+). Use a framework like **React** (with JSX) for a dynamic UI, or a simple static page if preferred. Ensure the UI is lightweight and respects privacy (no unnecessary third-party calls).
- **Backend**: **Node.js** (LTS version) with **Express.js** for the API server. Use `node-fetch` or `axios` for HTTP requests to Brave’s API. Write asynchronous code with `async/await` to keep the code readable and non-blocking.
- **Search Integration**: Utilise the **Brave Search API** for web search results (and other Brave endpoints for images, news, etc., if needed). Do not maintain a large local search index (to keep things simple and focused on Brave’s results). If needed, use a small in-memory index (e.g., **Lunr.js**) for any local or custom data (like a list of favourite sites).
- **Data & State**: No database is required for search results. Queries are fetched live or served from a cache. If user preferences (like theme or safe-search level) need to be stored, use local storage on the client or environment variables on the server. Keep user-specific data to a minimum to protect privacy.
- **Testing**: Use **Jest** for unit and integration tests. Aim for good coverage on search logic and critical functions. Use React Testing Library for frontend components and supertest for backend endpoints to ensure everything works as expected.

# Coding Standards
- **Syntax**: Use ES6+ syntax everywhere (arrow functions, `let`/`const`, template literals, destructuring, etc.). Avoid old-style callbacks in favour of Promises and async/await.
- **Style Guide**: Follow the principles of a popular style guide (like Airbnb JavaScript Style Guide) for consistency:
  - 2 spaces for indentation.
  - Use single quotes for strings.
  - End statements with semicolons.
  - Prefer `const` for constants, `let` for mutable variables; do not use `var`.
  - Place braces on the same line for control structures.
- **Naming Conventions**:
  - Use **camelCase** for variables and functions (`searchQuery`, `fetchResults`).
  - Use **PascalCase** for React components or classes (`SearchBar`, `ResultItem`).
  - Use **kebab-case** for filenames (`search-controller.js`, `result-list.jsx`).
  - Choose meaningful names that describe the purpose (e.g., `getUserQuery()` instead of `handle()`).
- **Comments**: Write clear comments for complex logic or important sections. Use JSDoc-style comments for functions and modules (especially exported ones) to explain their interface and behaviour. All comments and documentation should be in British English (e.g., use “behaviour” not “behavior”).
- **Formatting**: Keep code tidy. Use an auto-formatter (like Prettier) to enforce spacing, commas, etc., if available. Ensure there are no trailing spaces and files end with a newline. This makes diffs cleaner and Copilot suggestions more uniform.
- **Git Hygiene**: Do not commit debugging code or commented-out blocks. Ensure each commit is focused and has a clear message. Use `.gitignore` to exclude `node_modules`, build outputs, secrets, and any other irrelevant files from version control.

# Project Structure
- **`frontend/`** – Contains all front-end code (HTML, CSS, JS, React components, etc.). For example:
  - `frontend/index.html` (if a static page) or `frontend/src/` (if using React app).
  - `frontend/components/` for reusable UI components (SearchBar, ResultsList, etc.).
  - `frontend/assets/` for images, icons, or styles.
- **`backend/`** – Contains all back-end code:
  - `backend/index.js` (entry point of the server).
  - `backend/routes/` for Express route definitions (e.g., `searchRoutes.js`).
  - `backend/controllers/` for route handler logic (e.g., `searchController.js`).
  - `backend/services/` for external API calls or heavy logic (e.g., `braveService.js` to call Brave API).
  - `backend/middleware/` for Express middleware (e.g., logging, rate limiting).
- **`search/`** – Contains core search logic not tied to Express or HTTP:
  - `search/indexing.js` (if any indexing of local data or pre-processing of Brave results).
  - `search/ranking.js` (functions to merge or rank results, if needed).
  - `search/cache.js` (module for caching results in memory).
  - This separation allows potentially reusing search logic outside an HTTP context (e.g., a CLI tool or different interface).
- **`config/`** – Configuration files and scripts:
  - `config/default.js`, `config/production.js` etc., if using a config library; or simply use this for any constants.
  - This is where environment variables are accessed (or use a central `config.js` that loads `.env`).
  - Contains `.env.example` to document required environment variables like `BRAVE_API_KEY`.
- **`scripts/`** – Automation and utility scripts:
  - Scripts for tasks like seeding caches, testing API connectivity, or deploy routines.
  - E.g., `scripts/fetchTrends.js` (to fetch trending search terms, if we had such a feature), `scripts/clearCache.js`, etc.
  - These should be safe to run without harming real data (since we avoid storing user data, scripts are mainly for maintenance or setup).
- **(Optional) `tests/`** – If including automated tests, mirror the structure here for test files. E.g., `tests/search/searchController.test.js` to test the search controller.

# Preferred Libraries & Frameworks
- **Web Framework**: `express` for building the API endpoints on the Node.js backend.
- **HTTP Requests**: `axios` or `node-fetch` for making calls to Brave’s API (choose one and use consistently).
- **Environment Variables**: `dotenv` to load `.env` in development so you can use `process.env.BRAVE_API_KEY` etc., without hardcoding values.
- **Caching**: Use an in-memory caching solution like `node-cache` or simple Javascript Map for caching recent search results.
- **Search Index (Optional)**: `lunr` or `mini-search` for any client-side or server-side text indexing if we add a local search feature (like searching a small set of bookmarks or history). Keep usage minimal.
- **Frontend Libraries**:
  - If using React: choose a state management approach (basic React `useState` and Context API should suffice given the app’s simplicity).
  - For styling: possibly use **Tailwind CSS** for quick, consistent styling or simple CSS modules. Avoid frameworks that are overkill for a single-page app.
  - Use `react-helmet` or similar if you need to manage document head (for titles, meta tags).
- **Testing**:
  - `jest` for running tests.
  - `supertest` for HTTP endpoint testing (to simulate calls to the Express app).
  - `@testing-library/react` for React component tests (ensuring UI behaves correctly).
- **Utilities**:
  - `lodash` for any heavy data manipulation (only if needed — prefer native methods first).
  - `debug` for structured logging instead of console.log (gives namespace control).
  - **Avoid** large or tracking libraries. For example, do not use Google Analytics or similar in this project.

# Behaviour Guidelines
- **Modern JavaScript Practices**: Do not use deprecated Node.js APIs or outdated JavaScript syntax. Always prefer promises/async over callbacks for asynchronous flows. Ensure any new code follows the patterns already established (consistent error handling, etc.).
- **Privacy First**: Absolutely **no telemetry or tracking** of user queries. Do not log full query terms to console or files in production. The only logging should be for system debugging (and anonymised if necessary). We respect user privacy; the search should feel like a local tool even though it uses an external API.
- **No Hardcoded Secrets**: Never hardcode API keys, credentials, or sensitive URLs in the code. Use environment variables (via config) for anything secret. For example, `process.env.BRAVE_API_KEY` must be used for the Brave API key. If it’s missing, the application should throw an error on start-up rather than falling back to a hardcoded string.
- **Request Validation**: Validate user input on the backend. The search query (`q`) should be a string; if the request is malformed (missing `q`), respond with a 400 error (and do not call the external API). This prevents unnecessary external calls and ensures the client gets quick feedback on misuse.
- **Rate Limiting**: Implement basic rate limiting on the backend search endpoint (e.g., no more than 5 requests per second from the same IP) to prevent abuse or accidental overload (especially to avoid hitting Brave’s rate limits). Use an Express middleware or simple in-memory counters. This protects both our app and Brave’s service.
- **Error Handling**: Always handle errors gracefully. If Brave’s API call fails or times out, catch the exception and return an error response like 502 (Bad Gateway) or 504 (Gateway Timeout) with a user-friendly message (`{ error: "Search service unavailable, please try again later." }`). Do not let the server crash or return a raw stack trace. All unexpected errors on the backend should be caught by the global error handler middleware which returns a 500 JSON error.
- **Logging**: Use the `debug` module or similar for logging. For example, have a namespace `search-app:*` and use `debug('search-app:brave')("Querying Brave for", query)`. Do not use `console.log` in production except for critical errors (which could use `console.error`). Logs should never contain sensitive info (like the actual API key or personal data).
- **RESTful API Design**: Keep the backend API clean and simple. For now, one GET endpoint (`/api/search`) is sufficient. If expanding (e.g., separate endpoint for images or suggestions), follow REST principles and remain consistent (perhaps `/api/search/images` or a query param `?type=images`). Document any new endpoints in the project README.
- **Consistent Style**: Maintain consistent coding style throughout the project. For example, if using semi-colons, always use them. If using single quotes for strings, do not mix with double quotes in the same context. This consistency helps Copilot make better suggestions and makes the codebase easier to read.
- **Third-Party Services**: Only call out to Brave’s API (or any other search provider integrated). Do not introduce random APIs or services without discussion. Every external call should be essential and vetted (especially for privacy implications).
- **Testing Before Commit**: Get into the habit of running tests and linters before pushing changes. Copilot’s suggestions should always be verified by running the code. If a suggestion passes tests and lints, it’s likely solid. If not, adjust the code or tests accordingly.

# Security & Privacy Practices
- **API Key Management**: The Brave API key is stored in an environment variable (`BRAVE_API_KEY`). The key must never appear in client-side code or be exposed to users. Ensure the frontend does not send this key; only the backend uses it when constructing requests to Brave. In local development, use a `.env` file; in production, configure the environment variable securely on the server or hosting platform.
- **HTTPS**: All communications with Brave’s API should use HTTPS. If the app is deployed as a web service, it should also be under HTTPS to protect query data in transit. If serving the frontend via the backend, consider using Helmet middleware to enforce secure headers.
- **Content Security Policy (CSP)**: If hosting the frontend, set a Content Security Policy that only allows resources from known origins (self, Brave’s domains for search results if needed, etc.). This minimises the risk of malicious scripts. Avoid inline scripts/styles or eval-like functions in the frontend to keep CSP strict.
- **Input Sanitisation**: While the search query is mostly free text, be mindful of how it’s used. For display on a results page, escape any HTML in results or user input to prevent XSS. The Brave API presumably returns already-sanitised snippets, but if we ever mix in other sources, treat them as untrusted content.
- **Safe Search & Filtering**: Respect any user preference for safe search. If the app provides a safe search toggle, ensure that parameter is sent to Brave and that any content filtering promised to the user is actually happening. Also, do not override Brave’s safesearch settings without user consent.
- **Dependency Security**: Keep an eye on `npm audit`. If any library has vulnerabilities, update it. Avoid overly complex dependencies; prefer simple implementations to reduce attack surface.
- **Privacy of Queries**: Do not store user queries on the server. If caching, consider hashing the query as a key rather than storing the raw query string, if privacy is a concern (though since queries could be personal, hashing is a slight improvement). In memory this is not a big issue, but definitely do not write queries to disk or log files persistently.
- **Preventing Abuse**: Implement basic measures to prevent the service from being misused:
  - e.g., limit query length to a reasonable maximum (Brave might have an upper limit too).
  - Possibly block obviously malicious queries (like attempts to use our server as a proxy for non-search tasks).
  - Use rate limiting (as mentioned) to avoid denial-of-service scenarios.
- **Data Ownership**: Clarify in documentation that apart from cached results (ephemeral, to speed up responses), no data is stored by the service. This transparency will help maintain user trust.
- **Compliance**: Ensure the usage of Brave’s API complies with their terms of service. If they require an attribution or have restrictions on how results are used, incorporate that (e.g., a “Powered by Brave” note if needed).

# Documentation & Internationalisation
- **README**: Keep the README.md updated with instructions to run the project, how to set up the environment variables, and any special configurations. Include screenshots of the UI (if applicable) and example queries to showcase the functionality.
- **Inline Documentation**: Important modules (like the search service or significant algorithms) should have comments explaining the approach. For example, if we implement a custom ranking merge between Brave results and something else, document the rationale in code comments.
- **British English**: All documentation, comments, and UI text use British English spelling and grammar. For instance, use “customise” (not “customize”), “behaviour” (not “behavior”), “colour” (not “color”). Maintain a professional but friendly tone.
- **User-Facing Text**: If the UI has any instructional text (placeholder in search bar, error messages, etc.), double-check for clarity and grammar. For example, an error message might say: “Unable to fetch results. Please check your connection and try again.”
- **Internationalisation (i18n)**: The app’s primary language is English. If considering multi-language support, structure the frontend to allow easy swapping of text (using a simple dictionary or i18n library). However, given this is a personal project, full i18n is optional. At minimum, avoid hardcoding text in multiple places – use constants or a config so it’s easier to change.
- **Comments for Future Work**: It’s okay to use `// TODO:` comments to note potential improvements or things to revisit. This can actually guide Copilot as well, since it sees those and might adjust suggestions to leave those sections alone unless targeting them. But don’t leave big sections of functionality as TODO without an issue or plan to address them.

# Collaboration & Git
- **Branching**: Work on a separate git branch for each major feature or fix (e.g., `feature/add-image-search` or `bugfix/fix-typo-homepage`). This helps isolate changes and makes it easier to manage Copilot’s contributions.
- **Commit Messages**: Write meaningful commit messages in the imperative mood, e.g., “Add search suggestions dropdown” or “Fix encoding of query parameters”. Include context if not obvious: “Update caching logic to prevent stale results”.
- **Pull Requests**: If collaborating with others (or even for yourself for record-keeping), open PRs for changes with a description. Summarise what the change does. This is a good practice to review your own (and Copilot’s) work before merging.
- **Code Reviews**: Treat Copilot’s code as if another developer wrote it. Always review suggestions, especially large code completions, and test them. If something looks off, question it. It’s fine to reject or edit Copilot’s suggestions — the instruction files (this document and others) help it improve, but it’s not infallible.
- **Issue Tracking**: Use GitHub issues or a simple TODO list to track enhancements or bugs (for example, “Brave API occasionally returns 429 Too Many Requests – implement exponential backoff”). This helps direct Copilot in future sessions because you might mention these issues in discussions or commit messages.
- **Continuous Integration**: If using CI, ensure that tests and lint checks run on each push. This will catch any Copilot-introduced issues quickly. For example, if Copilot suggests a change that breaks a test, CI failing will prompt you to double-check that suggestion.
- **Knowledge Sharing**: If working with others, share these Copilot instruction files with them. That way, everyone knows the project conventions. Also, new team members (or just future you) can read these to get up to speed on how the project is structured and why things are done in certain ways.
- **Copilot Interaction**: These guidelines are provided to steer Copilot. If Copilot suggestions ever contradict this document (for example, using a style that’s disallowed or a library that’s off-limits), those suggestions should be modified or ignored. The aim is for Copilot to generate code that fits our project out-of-the-box, requiring only minimal tweaks.

## Safety and Change Control
- **Stay Within Scope**: Copilot should only modify or create files relevant to the current task or prompt. It **must not** refactor or “optimise” unrelated code on its own. For example, if working on the frontend, Copilot should not suddenly change backend logic (and vice versa) unless explicitly asked.
- **Non-Destructive Edits**: Avoid making destructive changes (such as deleting code or files) without explicit instruction. If a piece of code seems unused or redundant, Copilot should flag it with a comment (e.g., `// TODO: consider removing this if not needed`) rather than just removing it.
- **Flag Uncertain Suggestions**: If Copilot is unsure about a change, it should make a note in the code instead of a confident edit. For instance, it can insert a comment like `// TODO: Confirm if this change is appropriate` or `// Uncertain: please review this logic`. This gives a clear signal to review that part manually.
- **Do Not Reformat Unless Asked**: Copilot should not reformat entire files or sections just to match a style. Formatting is handled by our linters/formatter. Unnecessary reformatting can cause merge conflicts and obscure the real changes. Only format code that Copilot itself is writing or that is immediately around the changes it must make.
- **Maintain Behaviour**: Unless the goal of the task is to change functionality, Copilot must ensure that any suggestions do not alter the existing behaviour of the application. If it’s making an improvement (like refactoring for clarity), the external behaviour (output, side-effects) should remain the same.
- **Ask for Confirmation on Major Changes**: For any significant architectural change or anything that affects many files, Copilot (especially in Agent mode) should defer to human confirmation. It can outline a plan or propose the change via comments or in a pull request description, but not apply it without review.
- **Follow These Guidelines**: Copilot’s suggestions are expected to comply with all sections of this instructions file. This Safety and Change Control section is especially important: any suggestion that might violate these rules should be reconsidered by Copilot (or not offered at all). Ultimately, when in doubt, Copilot should err on the side of caution and seek clarification (via comments or by not making the leap).
