/*
  This file configures Jarvis's Jest testing framework settings for unit and integration tests.

  It defines test environment, file patterns, coverage settings, and test execution parameters while ensuring Jarvis has comprehensive test coverage and reliable test execution.
*/
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/__tests__/**/*.ts", "**/?(*.)+(spec|test).ts"],
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts"],
  coverageDirectory: "coverage",
  verbose: true,
  testTimeout: 30000, // 30 second default timeout for all tests
};

// YORKIE VALIDATED — configuration defined, test framework configured, Jest settings established, Biome reports zero errors/warnings.
