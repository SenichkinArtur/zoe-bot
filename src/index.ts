import "dotenv/config";
import { parse } from "./parser.js";
import { db_init } from "./db.js";
import { getData } from "./request.js";
import { createBot } from "./bot.js";

const getToken = () => {
  const token = process.env.BOT_TOKEN;
  if (!token) throw new Error("BOT_TOKEN is missing");

  return token;
};

const main = async () => {
  db_init();

  const zoeBot = createBot(getToken());
  zoeBot.init();
  zoeBot.launch();

  const rawHtml = await getData("https://www.zoe.com.ua/outage/");
  if ("error" in rawHtml) {
    throw new Error("error returned from zoe.com.ua");
  }

  const parsedData = parse(rawHtml.data);

  if (!parsedData) {
    throw new Error("error during parsing the data");
  }

  const { date, schedule } = parsedData;

  zoeBot.updateData(date, schedule);
};

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
