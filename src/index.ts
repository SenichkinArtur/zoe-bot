import "dotenv/config";
import { parse } from "./parser.js";
import {
  dbInit,
  getScheduleByDate,
  insertSchedule,
} from "./db.js";
import { getData } from "./request.js";
import { createBot, type ZoeBot } from "./bot.js";
import { ScheduleType } from "./types.js";

// const INTERVAL = 10 * 60 * 1000; // 10 minutes
const INTERVAL = 30 * 1000; // 30 seconds for testing

const getToken = () => {
  const token = process.env.BOT_TOKEN;
  if (!token) throw new Error("BOT_TOKEN is missing");

  return token;
};

const fetchAndUpdate = async (zoeBot: ZoeBot) => {
  const rawHtml = await getData("https://www.zoe.com.ua/outage/");
  if ("error" in rawHtml) {
    console.error("error returned from zoe.com.ua");
    return;
  }

  const parsedData = parse(rawHtml.data);

  if (!parsedData || !parsedData?.date) {
    console.error("error during parsing the data");
    return;
  }

  const { date, schedule, scheduleType } = parsedData;
  const currentSchedule = getScheduleByDate(date);

  if (scheduleType === ScheduleType.New) {
    insertSchedule(date, schedule);
    zoeBot.sendMessageNew(date, schedule);

    return undefined;
  }

  if (scheduleType === ScheduleType.Updated) {
    zoeBot.sendMessageUpdated(date, schedule);

    return undefined;
  }
};

const main = async () => {
  dbInit();

  const zoeBot: ZoeBot = createBot(getToken());
  zoeBot.init();
  zoeBot.launch();

  fetchAndUpdate(zoeBot);

  setInterval(() => {
    fetchAndUpdate(zoeBot);
  }, INTERVAL);
};

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
