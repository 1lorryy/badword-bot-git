require("dotenv").config();

const { startBot } = require("./bot");

startBot();

if (process.env.ENABLE_WEB === "true") {
  const { startWeb } = require("./web");
  startWeb();
}

// DASHBOARD
require("./dashboard/server");