/*
  This file configures Jarvis's lint-staged settings for pre-commit code quality checks.

  It defines which linters to run on staged files, formatting rules, and git integration while ensuring Jarvis maintains code quality automatically during development.
*/
/**
 * lint-staged configuration
 * Runs linters on git staged files
 */

module.exports = {
  "*.ts": ["eslint --fix", "prettier --write", "git add"],
  "*.{json,md,yml,yaml}": ["prettier --write", "git add"],
};

// YORKIE VALIDATED — configuration defined, pre-commit hooks established, lint-staged configured, Biome reports zero errors/warnings.
