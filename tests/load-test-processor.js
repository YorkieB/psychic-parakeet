/**
 * Artillery load test processor
 * Custom functions for load testing scenarios
 */

module.exports = {
  setJSONBody: setJSONBody,
  logHeaders: logHeaders,
  randomUserId: randomUserId,
};

function setJSONBody(requestParams, context, ee, next) {
  requestParams.json = {
    message: "Load test message",
    userId: `user_${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
  };
  return next();
}

function logHeaders(requestParams, response, context, ee, next) {
  if (response.timings?.phases) {
    console.log(`Response time: ${response.timings.phases.total}ms`);
  }
  return next();
}

function randomUserId(requestParams, context, ee, next) {
  context.vars.userId = `user_${Math.floor(Math.random() * 10000)}`;
  return next();
}
