import "dotenv/config";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import i18n from "i18n";
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

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Europe/Kyiv");

i18n.configure({
  locales: ["en", "ru", "uk"],
  directory: "./locales",
});

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

  // TODO: remove scheduleType later if it is confirmed to be unnecessary
  const { date, schedule, scheduleType: _scheduleType } = parsedData;
  const currentSchedule = getScheduleByDate(date);

  if (JSON.stringify(schedule) === JSON.stringify(currentSchedule)) {
    return;
  }

  if (currentSchedule === null) {
    insertSchedule(date, schedule);
    await zoeBot.sendMessagesNew(date, schedule);

    return;
  }

  if (
    currentSchedule &&
    JSON.stringify(schedule) !== JSON.stringify(currentSchedule)
  ) {
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
