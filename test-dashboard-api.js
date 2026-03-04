// Test dashboard API connection
const http = require("http");

const options = {
  hostname: "localhost",
  port: 3000,
  path: "/health/agents",
  method: "GET",
};

console.log("🧪 Testing Dashboard API Connection...");

const req = http.request(options, (res) => {
  console.log(`📊 Status Code: ${res.statusCode}`);

  let data = "";
  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    try {
      const response = JSON.parse(data);
      console.log("✅ API Response received");

      if (response.success && response.data && response.data.agents) {
        console.log(`🎉 Dashboard API Test PASSED!`);
        console.log(`📊 Found ${response.data.agents.length} agents`);
        console.log(
          `🟢 Healthy: ${response.data.healthy}, 🔴 Unhealthy: ${response.data.unhealthy}`,
        );

        // Show first few agents
        response.data.agents.slice(0, 3).forEach((agent, i) => {
          console.log(
            `   ${i + 1}. ${agent.name} - ${agent.status} (${agent.isHealthy ? "Healthy" : "Unhealthy"})`,
          );
        });
      } else {
        console.log("❌ Dashboard API Test FAILED!");
        console.log("🔍 Unexpected response format:", response);
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

req.end();
