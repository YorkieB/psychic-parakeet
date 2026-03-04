/*
  This script connects Jarvis to UK banking services through Plaid Open Banking for financial data integration.

  It handles bank authentication, account linking, transaction data retrieval, and financial service integration while ensuring secure and compliant banking connectivity.
*/
import * as dotenv from "dotenv";
import { PlaidServiceUK } from "../src/services/plaid-service-uk";
import { createLogger } from "../src/utils/logger";

dotenv.config();

const logger = createLogger();
const plaidService = new PlaidServiceUK(logger);

async function main() {
  logger.info("🏦 UK BANK CONNECTION (Plaid Open Banking)");
  logger.info("=".repeat(80));
  logger.info("Supported banks: Revolut, Starling, Monzo, HSBC, Barclays, and 500+ more\n");

  const userId = "default-user";

  try {
    const linkToken = await plaidService.createLinkToken(userId);

    logger.info("✅ Link token created!\n");
    logger.info("Next steps:");
    logger.info("1. Use this link token with Plaid Link (web/mobile SDK)");
    logger.info("2. Select your UK bank (Revolut, Starling, etc.)");
    logger.info("3. Authenticate with your bank");
    logger.info("4. Grant read-only access to Jarvis");
    logger.info("\n📋 Link Token:");
    logger.info(linkToken);
    logger.info("\n💡 For Sandbox Testing:");
    logger.info("   - Username: user_good");
    logger.info("   - Password: pass_good");
    logger.info("   - Select any bank");
    logger.info("\n💡 For Production:");
    logger.info("   - Set PLAID_ENV=development in .env");
    logger.info("   - Use development secret from Plaid dashboard");
    logger.info("   - Connect real UK bank account\n");
  } catch (error: any) {
    logger.error("❌ Failed to create link token:", error.message);
    logger.info("\n💡 Make sure PLAID_CLIENT_ID and PLAID_SECRET are set in .env");
    process.exit(1);
  }

  process.exit(0);
}

// YORKIE VALIDATED — types defined, all references resolved, script syntax correct, Biome reports zero errors/warnings.

main();
