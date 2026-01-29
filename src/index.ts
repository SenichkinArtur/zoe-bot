import "dotenv/config";
import { parse } from "./parser.js";
import {
  dbInit,
  getScheduleByDate,
  insertSchedule,
  updateSchedule,
} from "./db.js";
import { getData } from "./request.js";
import { createBot, type ZoeBot } from "./bot.js";
import { ScheduleType, type Schedule } from "./types.js";

const INTERVAL = 10 * 60 * 1000; // 10 minutes
// const INTERVAL = 30 * 1000; // 30 seconds for testing

const getToken = () => {
  const token = process.env.BOT_TOKEN;
  if (!token) throw new Error("BOT_TOKEN is missing");

  return token;
};

const fetchAndUpdate = async (zoeBot: ZoeBot) => {
  const rawHtml = await getData();
  if ("error" in rawHtml) {
    console.error("error returned from zoe.com.ua", rawHtml.error);
    return;
  }

  if (rawHtml.data === "") {
    console.error("empty response");
    return;
  }

  const parsedData = parse(rawHtml.data);

  if (!parsedData || !parsedData?.date) {
    console.error("error during parsing the data");
    return;
  }

  const { date, schedule, scheduleType } = parsedData;
  const currentSchedule = getScheduleByDate(date);

  if (JSON.stringify(schedule) === JSON.stringify(currentSchedule)) {
    return;
  }

  if (scheduleType === ScheduleType.New) {
    insertSchedule(date, schedule);
    await zoeBot.sendMessagesNew(date, schedule);

    return;
  }

  if (scheduleType === ScheduleType.Updated && currentSchedule) {
    const updatedSchedule: Partial<Schedule> = {};

    for (const [key, value] of Object.entries(schedule) as [
      keyof Schedule,
      string,
    ][]) {
      if (currentSchedule[key] !== value) {
        updatedSchedule[key] = value;
      }
    }
    updateSchedule(date, schedule);
    await zoeBot.sendMessageUpdated(date, updatedSchedule);

    return;
  }
};

const main = async () => {
  dbInit();

  const zoeBot: ZoeBot = createBot(getToken());
  zoeBot.init();
  zoeBot.launch();

  await fetchAndUpdate(zoeBot);

  setInterval(() => {
    fetchAndUpdate(zoeBot);
  }, INTERVAL);
};

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
