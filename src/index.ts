import "dotenv/config";
import { parse } from "./parser.js";
import { dbInit, getScheduleByDate, insertSchedule, updateSchedule } from "./db.js";
import { getData } from "./request.js";
import { createBot, type ZoeBot } from "./bot.js";
import { ScheduleType, type Schedule } from "./types.js";

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
    console.error("error returned from zoe.com.ua", rawHtml.error);
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
    return undefined;
  }

  if (scheduleType === ScheduleType.New) {
    insertSchedule(date, schedule);
    zoeBot.sendMessagesNew(date, schedule);

    return undefined;
  }

  if (scheduleType === ScheduleType.Updated) {
  // if (true) {
    const currentSchedule = {
      "1.1": "00:00 – 05:00, 09:00 – 14:00, 18:00 – 23:00",
      "1.2": "00:00 – 05:00, 09:00 – 14:00",
      "2.1": "00:00 – 00:30, 04:30 – 09:30, 13:30 – 18:30, 22:30 – 24:00",
      "2.2": "00:00 – 00:30, 04:30 – 09:30, 13:30 – 18:30, 22:30 – 24:00",
      "3.1": "00:00 – 05:00, 09:00 – 14:00, 18:00 – 23:00",
      "3.2": "00:00 – 05:00, 09:00 – 14:00, 18:00 – 23:00",
      "4.1": "00:00 – 00:30, 04:30 – 09:30, 13:30 – 18:30, 22:30 – 24:00",
      "4.2": "00:00 – 00:30, 04:30 – 09:30, 13:30 – 18:30, 22:30 – 24:00",
      "5.1": "00:00 – 05:00, 09:00 – 14:00, 18:00 – 23:00",
      "5.2": "00:00 – 05:00, 09:00 – 14:00, 18:00 – 23:00",
      "6.1": "00:00 – 00:30, 04:30 – 09:30, 13:30 – 18:30",
      "6.2": "00:00 – 00:30, 04:30 – 09:30, 13:30 – 18:30, 22:30 – 24:00",
    };

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
    zoeBot.sendMessageUpdated(date, updatedSchedule);

    // TODO: update data in schedules table

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
