import "dotenv/config";

import https from "node:https";
import axios from "axios";
import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";

const token = process.env.BOT_TOKEN;
if (!token) {
  throw new Error("Missing BOT_TOKEN in environment (.env)");
}
const bot = new Telegraf(token);

bot.start((ctx) => ctx.reply("Welcome to Zoe bot"));

bot.on(message(), (ctx) => ctx.reply("👍"));
bot.launch(() => console.log("Zoe is running"));

// agent that skips TLS verification for www.zoe.com.ua host
const insecureAgentForZoe = new https.Agent({
  rejectUnauthorized: false,
  servername: "www.zoe.com.ua",
});

axios
  .get("https://www.zoe.com.ua/outage/", {
    httpsAgent: insecureAgentForZoe,
    proxy: false,
  })
  .then(function (response) {
    const mainSection = response.data.split('<main role="main">')[1];
    const articles = mainSection.split('<article id="');
    articles.shift();
    console.log(articles[0]);
  })
  .catch(function (error) {
    console.log("axios error code:", error.code);
    console.log("axios error message:", error.message);
  });
