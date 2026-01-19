import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import "dayjs/locale/uk.js";
import { ScheduleType, type Schedule } from "./types.js";

dayjs.extend(customParseFormat);

const QUEUES: (keyof Schedule)[] = [
  "1.1",
  "1.2",
  "2.1",
  "2.2",
  "3.1",
  "3.2",
  "4.1",
  "4.2",
  "5.1",
  "5.2",
  "6.1",
  "6.2",
];

const extractSchedule = (articleArray: string[]): Schedule => {
  // TODO: handle diff types of schedule ("09:00 – 14:00" and "з 06:30 до 11:00")
  const schedule: Schedule = {
    "1.1": "",
    "1.2": "",
    "2.1": "",
    "2.2": "",
    "3.1": "",
    "3.2": "",
    "4.1": "",
    "4.2": "",
    "5.1": "",
    "5.2": "",
    "6.1": "",
    "6.2": "",
  };

  QUEUES.forEach((queueNumber) => {
    const scheduleItem: string | undefined = articleArray.find((a: string) =>
      a.includes(queueNumber),
    );
    if (!scheduleItem) return;

    schedule[queueNumber] = scheduleItem
      .split("<")
      .slice(0, -1)
      .join("")
      .slice(5); // TODO: handle diff types of titles ("6.1: " and "Черга 6.1: "). Currently works only "6.1: "
  });

  return schedule;
};

const parseTitleNew = (title: string): Dayjs | null => {
  const titleArray = title.split(" ");
  const day = titleArray[0];
  const month = titleArray[1];

  if (day && month) {
    return dayjs(
      `${day.match(/\d+$/)?.at(0)} ${month}`.toLowerCase(),
      "DD MMMM",
      "uk",
    );
  }

  return null;
};
const parseTitleUpdated = (title: string): Dayjs | null => {
  const titleArray = title.split(" ");
  const day = titleArray[3];
  const month = titleArray[4];

  if (day && month) {
    return dayjs(`${day} ${month}`.toLowerCase(), "DD MMMM", "uk");
  }

  return null;
};

export const parse = (
  data: string,
):
  | { date: Dayjs | null; schedule: Schedule; scheduleType: ScheduleType }
  | undefined => {
  const mainSection = data.split('<main role="main">')[1]; // section with all schedules
  if (!mainSection) return undefined;

  const articles = mainSection.split('<article id="').slice(1); // array of post with schedules
  const lastArticle = articles[0];
  if (!lastArticle) return undefined;

  const lastArticleArray = lastArticle.split("\n"); // last posted schedule
  const lastArticleTitle = lastArticleArray.find((a: string) =>
    a.includes("ПО ЗАПОРІЗЬКІЙ ОБЛАСТІ"),
  );
  if (!lastArticleTitle) return undefined;

  const lastArticleTitleTrimmed = lastArticleTitle.trim();
  const schedule = extractSchedule(lastArticleArray);

  const parsers: Record<
    string,
    () => { date: Dayjs | null; schedule: Schedule; scheduleType: ScheduleType }
  > = {
    // new schedule
    "ДІЯТИМУТЬ ГПВ": () => ({
      date: parseTitleNew(lastArticleTitleTrimmed),
      schedule,
      scheduleType: ScheduleType.New,
    }),
    // updated schedule
    "ОНОВЛЕНО ГПВ": () => ({
      date: parseTitleUpdated(lastArticleTitleTrimmed),
      schedule,
      scheduleType: ScheduleType.Updated,
    }),
  };
  const matchedKey = Object.keys(parsers).find((key) =>
    lastArticleTitleTrimmed.includes(key),
  );
  const parser = matchedKey ? parsers[matchedKey] : undefined;

  return parser ? parser() : undefined;
};
