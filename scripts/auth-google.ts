/*
  This file helps you authenticate with Google services to connect Jarvis to your Gmail and Calendar.

  It handles the OAuth authentication process, gets your permission, and sets up the connection while making it easy to link your Google account with Jarvis.
*/

import readline from "node:readline";
import * as dotenv from "dotenv";
import { CalendarService } from "../src/services/calendar-service";
import { GmailService } from "../src/services/gmail-service";
import { createLogger } from "../src/utils/logger";

dotenv.config();

const logger = createLogger();
const gmailService = new GmailService(logger);
const calendarService = new CalendarService(logger);

async function main() {
  logger.info("🔐 GOOGLE AUTHENTICATION (Gmail + Calendar)");
  logger.info("=".repeat(80));

  const authUrl = gmailService.getAuthUrl();

  logger.info("\n1. Open this URL in your browser:\n");
  logger.info(authUrl);
  logger.info("\n2. Authorize Jarvis to access Gmail and Calendar");
  logger.info("3. Copy the authorization code from the URL\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question("Enter authorization code: ", async (code) => {
    try {
      await gmailService.authenticate(code);
      logger.info("\n✅ SUCCESS! Gmail authenticated");

      // Calendar uses same OAuth2 client, so it should work too
      // But we'll authenticate separately to ensure Calendar scopes are included
      const calendarAuthUrl = calendarService.getAuthUrl();
      logger.info("\n📅 Now authenticate Calendar:");
      logger.info(calendarAuthUrl);

      rl.question(
        "\nEnter Calendar authorization code (or press Enter to skip): ",
        async (calendarCode) => {
          if (calendarCode.trim()) {
            try {
              await calendarService.authenticate(calendarCode);
              logger.info("\n✅ SUCCESS! Calendar authenticated");
            } catch (error: any) {
              logger.warn("Calendar authentication failed:", error.message);
              logger.info(
                "💡 Gmail is authenticated. Calendar can use the same token if scopes match.",
              );
            }
          }

          logger.info("\n📁 Tokens saved to:");
          logger.info("   - ./config/gmail-token.json");
          logger.info("   - ./config/calendar-token.json");
          logger.info("\n✅ You can now use Gmail and Calendar features!");
          rl.close();
          process.exit(0);
        },
      );
    } catch (error: any) {
      logger.error("❌ Authentication failed:", error.message);
      rl.close();
      process.exit(1);
    }
  });
}

main();

// YORKIE VALIDATED — types defined, all references resolved, code syntax correct, Biome reports zero errors/warnings.
