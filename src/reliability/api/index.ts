/**
 * Jarvis Reliability System API Server
 * Main entry point for the API server
 */

import { getAPIConfig, validateConfig } from "./config/api-config.js";
import { handleUncaughtException, handleUnhandledRejection } from "./middleware/error-handler.js";
import { JarvisAPIServer } from "./server.js";

async function startServer(): Promise<void> {
  try {
    // Load and validate configuration
    const config = getAPIConfig();
    validateConfig(config);

    // Log startup information
    console.log("🚀 Starting Jarvis Reliability System API Server...");
    console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(
      `🔧 Configuration: Port ${config.port}, Auth ${config.enableAuthentication ? "enabled" : "disabled"}`,
    );
    console.log(
      `⚡ Features: MAD ${config.reliabilityConfig.madFramework?.enabled ? "enabled" : "disabled"}, GTVP ${config.reliabilityConfig.gtvpFramework?.enabled ? "enabled" : "disabled"}`,
    );

    // Set up global error handlers
    process.on("uncaughtException", handleUncaughtException);
    process.on("unhandledRejection", handleUnhandledRejection);

    // Create and start server
    const server = new JarvisAPIServer(config);
    await server.start();

    console.log(
      "✅ Jarvis Reliability System API Server is ready to integrate with other Jarvis components",
    );
  } catch (error) {
    console.error("💥 Failed to start Jarvis Reliability API Server:", error);
    process.exit(1);
  }
}

// Start server if this file is run directly
if (require.main === module) {
  startServer().catch((error) => {
    console.error("💥 Fatal startup error:", error);
    process.exit(1);
  });
}

// Export server class for programmatic use
export { JarvisAPIServer };
export { getAPIConfig, validateConfig } from "./config/api-config.js";
export type { JarvisAPIConfig } from "./server.js";
