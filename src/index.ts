import "dotenv/config";

import https from "node:https";
import axios from "axios";
import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import "dayjs/locale/uk.js";

dayjs.extend(customParseFormat);
// dayjs.locale('uk');

const token = process.env.BOT_TOKEN;
if (!token) {
  throw new Error("Missing BOT_TOKEN in environment (.env)");
}
const bot = new Telegraf(token);

bot.start((ctx) => ctx.reply("Welcome to Zoe bot"));

bot.launch(() => console.log("Zoe is running"));

// agent that skips TLS verification for www.zoe.com.ua host
const insecureAgentForZoe = new https.Agent({
  rejectUnauthorized: false,
  servername: "www.zoe.com.ua",
});

let schedule = "";
let date = dayjs();

axios
  .get("https://www.zoe.com.ua/outage/", {
    httpsAgent: insecureAgentForZoe,
    proxy: false,
  })
  .then(function (response) {
    const mainSection = response.data.split('<main role="main">')[1]; // section with all schedules
    const articles = mainSection.split('<article id="'); // array of post with schedules
    articles.shift(); // remove text before first article
    const lastArticleArray = articles[0].split("\n"); // last posted schedule
    const lastArticleTitle = lastArticleArray
      .find((a: string) => a.includes("ПО ЗАПОРІЗЬКІЙ ОБЛАСТІ"))
      .trim();
    console.log("lastArticleTitle: ", lastArticleTitle);

    switch (true) {
      case lastArticleTitle.includes("ДІЯТИМУТЬ ГПВ"): {
        // new schedule
        const newScheduleForQueue = lastArticleArray
          .find((a: string) => a.includes("6.1"))
          .split("<");
        newScheduleForQueue.pop();
        schedule = newScheduleForQueue[0];

        const title = lastArticleTitle.split(" ");
        date = dayjs(
          `${title[0].match(/\d+$/)[0]} ${title[1]}`.toLowerCase(),
          "DD MMMM",
          "uk",
        );
        break;
      }
      case lastArticleTitle.includes("ОНОВЛЕНО ГПВ"): {
        // updated schedule
        const updatedScheduleForQueue = lastArticleArray
          .find((a: string) => a.includes("6.1"))
          .split("<");
        updatedScheduleForQueue.pop();
        schedule = updatedScheduleForQueue[0];

        const title = lastArticleTitle.split(" ");
        date = dayjs(
          `${title[3]} ${title[4]}`.toLowerCase(),
          "DD MMMM",
          "uk",
        );
        break;
      }
      default: {
        console.log("default");
        // need to handle unknown post
        break;
      }
    }

    // console.log("qwe: ", dayjs(articleTitleWithDate));
  })
  .catch(function (error) {
    console.log("axios error code:", error.code);
    console.log("axios error message:", error.message);
  });

bot.on(message(), (ctx) =>
  ctx.reply(`${date.locale("en").format("dddd, DD MMMM")} \n\n${schedule}`),
);
