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

console.log("🧪 Testing LLM Connection...");
console.log("📡 Sending request to Jarvis API...");

const req = http.request(options, (res) => {
  console.log(`📊 Status Code: ${res.statusCode}`);
  console.log(`📋 Headers:`, res.headers);

  let data = "";
  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    try {
      const response = JSON.parse(data);
      console.log("✅ Response received:", JSON.stringify(response, null, 2));

      if (response.success && response.data && response.data.response) {
        console.log("🎉 LLM Connection Test PASSED!");
        console.log("🤖 LLM Response:", response.data.response);
      } else {
        console.log("❌ LLM Connection Test FAILED!");
        console.log("🔍 Error:", response.error || "Unknown error");
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
