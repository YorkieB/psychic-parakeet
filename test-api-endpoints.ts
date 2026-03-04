/**
 * Diagnostic script to test API endpoints
 * Helps identify the correct endpoint format for Suno and Runway APIs
 */

import axios from "axios";
import * as dotenv from "dotenv";

dotenv.config();

async function testEndpoints(): Promise<void> {
  console.log("🔍 Testing API Endpoints");
  console.log("=".repeat(60) + "\n");

  const sunoKey = process.env.SUNO_API_KEY;
  const runwayKey = process.env.RUNWAY_API_KEY;

  if (!sunoKey) {
    console.log("❌ SUNO_API_KEY not found in .env");
  } else {
    console.log("✅ SUNO_API_KEY found (length: " + sunoKey.length + ")");
  }

  if (!runwayKey) {
    console.log("❌ RUNWAY_API_KEY not found in .env");
  } else {
    console.log("✅ RUNWAY_API_KEY found (length: " + runwayKey.length + ")");
  }

  console.log("");

  // Test Suno endpoints
  if (sunoKey) {
    console.log("=".repeat(60));
    console.log("Testing Suno API Endpoints (AIMLAPI)");
    console.log("=".repeat(60) + "\n");

    const sunoEndpoints = [
      "https://api.aimlapi.com/v1/suno/generate",
      "https://api.aimlapi.com/v1/audio/generate",
      "https://api.aimlapi.com/v1/suno/music/generate",
      "https://api.aimlapi.com/v1/suno/create",
    ];

    for (const endpoint of sunoEndpoints) {
      try {
        console.log(`Testing: ${endpoint}`);
        const response = await axios.post(
          endpoint,
          {
            prompt: "test",
            wait_audio: false,
          },
          {
            headers: {
              Authorization: `Bearer ${sunoKey}`,
              "Content-Type": "application/json",
            },
            timeout: 10000,
            validateStatus: () => true, // Don't throw on any status
          },
        );

        console.log(`  Status: ${response.status} ${response.statusText}`);
        if (response.status < 400) {
          console.log(`  ✅ SUCCESS! This endpoint works!`);
          console.log(`  Response: ${JSON.stringify(response.data).substring(0, 200)}...`);
        } else {
          console.log(`  ❌ Failed: ${response.status}`);
          if (response.data) {
            console.log(`  Error: ${JSON.stringify(response.data).substring(0, 200)}`);
          }
        }
      } catch (error: any) {
        console.log(`  ❌ Error: ${error.message}`);
        if (error.response) {
          console.log(`  Status: ${error.response.status}`);
          console.log(`  Data: ${JSON.stringify(error.response.data).substring(0, 200)}`);
        }
      }
      console.log("");
    }
  }

  // Test Runway endpoints
  if (runwayKey) {
    console.log("=".repeat(60));
    console.log("Testing Runway API Endpoints");
    console.log("=".repeat(60) + "\n");

    const runwayEndpoints = [
      "https://api.runwayml.com/v1/gen3/generate",
      "https://api.runwayml.com/v1/video/generate",
      "https://api.runwayml.com/v1/tasks",
      "https://api.runwayml.com/v1/generate",
    ];

    for (const endpoint of runwayEndpoints) {
      try {
        console.log(`Testing: ${endpoint}`);
        const response = await axios.post(
          endpoint,
          {
            prompt: "test video",
            duration: 4,
          },
          {
            headers: {
              Authorization: `Bearer ${runwayKey}`,
              "Content-Type": "application/json",
              "X-Runway-Version": "2024-09-13",
            },
            timeout: 10000,
            validateStatus: () => true,
          },
        );

        console.log(`  Status: ${response.status} ${response.statusText}`);
        if (response.status < 400) {
          console.log(`  ✅ SUCCESS! This endpoint works!`);
          console.log(`  Response: ${JSON.stringify(response.data).substring(0, 200)}...`);
        } else {
          console.log(`  ❌ Failed: ${response.status}`);
          if (response.data) {
            console.log(`  Error: ${JSON.stringify(response.data).substring(0, 200)}`);
          }
        }
      } catch (error: any) {
        console.log(`  ❌ Error: ${error.message}`);
        if (error.response) {
          console.log(`  Status: ${error.response.status}`);
          console.log(`  Data: ${JSON.stringify(error.response.data).substring(0, 200)}`);
        }
      }
      console.log("");
    }
  }

  console.log("=".repeat(60));
  console.log("Diagnostic Complete");
  console.log("=".repeat(60));
}

testEndpoints().catch(console.error);
