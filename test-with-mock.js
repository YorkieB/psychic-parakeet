// Test with mock environment variables
process.env.VERTEX_AI_ENDPOINT_URL = "https://mock-vertex-endpoint.com";
process.env.VERTEX_AI_PROJECT_ID = "test-project";
process.env.VERTEX_AI_REGION = "europe-west4";
process.env.VERTEX_AI_MODEL = "test-model";

const http = require("http");

// Test data
const testData = JSON.stringify({
  message: "Hello, this is a test message. Please respond with a simple greeting.",
});

// Options for the HTTP request
const options = {
  hostname: "localhost",
  port: 3000,
  path: "/chat",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(testData),
  },
};

console.log("🧪 Testing LLM Connection with Mock Environment...");
console.log("📡 Sending request to Jarvis API...");
console.log("🔧 Environment: VERTEX_AI_ENDPOINT_URL =", process.env.VERTEX_AI_ENDPOINT_URL);

const req = http.request(options, (res) => {
  console.log(`📊 Status Code: ${res.statusCode}`);

  let data = "";
  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    try {
      const response = JSON.parse(data);
      console.log("✅ Response received:", JSON.stringify(response, null, 2));

      if (response.text && !response.text.includes("fetch failed")) {
        console.log("🎉 LLM Connection Test with Mock Environment PASSED!");
        console.log("🤖 LLM Response:", response.text);
      } else {
        console.log("❌ LLM Connection Test FAILED!");
        console.log("🔍 Error:", response.text);
      }
    } catch (error) {
      console.log("❌ Failed to parse response:", error.message);
      console.log("📄 Raw response:", data);
    }
  });
});

req.on("error", (error) => {
  console.log("❌ Request failed:", error.message);
});

// Write data to request body
req.write(testData);
req.end();

console.log("⏳ Waiting for response...");
