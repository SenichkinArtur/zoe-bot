import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import "dayjs/locale/uk.js";

dayjs.extend(customParseFormat);

// TODO: probably extract all of the schedules (e.g. 1.1, 1.2, 2.1 etc)
const extractSchedule = (articleArray: string[]): string => {
  const schedule = articleArray.find((a: string) => a.includes("6.1"));
  if (!schedule) return "";

  return schedule.split("<").slice(0, -1)[0] || "";
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
): { date: Dayjs | null; schedule: string } | undefined => {
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
    () => { date: Dayjs | null; schedule: string }
  > = {
    "ДІЯТИМУТЬ ГПВ": () => ({ // new schedule 
      date: parseTitleNew(lastArticleTitleTrimmed),
      schedule,
    }),
    "ОНОВЛЕНО ГПВ": () => ({ // updated schedule
      date: parseTitleUpdated(lastArticleTitleTrimmed),
      schedule,
    }),
  };
  const matchedKey = Object.keys(parsers).find((key) =>
    lastArticleTitleTrimmed.includes(key),
  );
  const parser = matchedKey ? parsers[matchedKey] : undefined;

  return parser ? parser() : undefined;
};
