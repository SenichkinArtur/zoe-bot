import { Telegraf, Context } from "telegraf";
import { message } from "telegraf/filters";
import dayjs, { type Dayjs } from "dayjs";
import "dayjs/locale/ru.js";
import "dayjs/locale/uk.js";
import i18n from "i18n";
import type { Schedule, User } from "./types.js";
import {
  getAllUsers,
  getScheduleByDate,
  getUserByTgUserId,
  getUsersByGroupNumbers,
  insertUser,
  removeUserByTgUserId,
  setUserGroupNumberById,
  setUsersLocaleById,
} from "./db.js";

const GROUP_NUMBERS = [
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
const SUPPORTED_LOCALES: [string, string, string] = ["en", "ru", "uk"];

export type ZoeBot = {
  init: () => void;
  launch: () => void;
  sendMessagesNew: (date: Dayjs | null, schedule: Schedule) => Promise<void>;
  sendMessageUpdated: (
    date: Dayjs | null,
    updatedSchedule: Partial<Schedule>,
  ) => Promise<void>;
};

export const createBot = (token: string): ZoeBot => {
  const bot: Telegraf = new Telegraf(token);

  const init = () => {
    bot.start(async (ctx) => {
      try {
        console.log("bot.start");
        const user = getUserByTgUserId(ctx.from.id);
        if (user) {
          removeUserByTgUserId(ctx.from.id);
        }
        const languageCode = ctx.from.language_code;
        const locale: string =
          languageCode && SUPPORTED_LOCALES.includes(languageCode)
            ? languageCode
            : "en";
        insertUser(ctx.from.id, locale);
        await ctx.reply(i18n.__({ phrase: "greeting", locale }));
      } catch (error) {
        console.error("Bot.start error: ", error);
      }
    });

    bot.on(message(), async (ctx) => {
      try {
        const user = getUserByTgUserId(ctx.from.id);
        if (user) {
          if (!user.group_number) {
            if ("text" in ctx.update.message) {
              const text = ctx.update.message.text;
              const groupNumber = GROUP_NUMBERS.find(
                (n) => n === text,
              ) as keyof Schedule;

              await setUsersGroup(ctx, user, groupNumber);
            }
          }
        }
      } catch (error) {
        console.error("Bot.on error: ", error);
      }
    });
  };

  const setUsersGroup = async (
    ctx: Context,
    user: User,
    groupNumber: keyof Schedule,
  ): Promise<void> => {
    try {
      if (groupNumber && user) {
        setUserGroupNumberById(user.id, groupNumber);
        await ctx.reply(
          i18n.__({ phrase: "groupSet", locale: user.locale }, { groupNumber }),
        );
        const todaysDate = dayjs.tz();
        const currentSchedule: Schedule | null = getScheduleByDate(todaysDate);

        if (!currentSchedule) return;

        await bot.telegram
          .sendMessage(
            user.telegram_user_id,
            `${todaysDate.locale(user.locale).format("dddd, DD MMMM")} \n\n${groupNumber}: ${currentSchedule[groupNumber]}`,
          )
          .catch((e) => {
            console.error(
              `Failed to send to user ${user.telegram_user_id}:`,
              e.message,
            );
          });
      } else {
        await ctx.reply(i18n.__({ phrase: "wrongGroup", locale: user.locale }));
      }
    } catch (error) {
      console.error("setUsersGroup error: ", error);
    }
  };

  const sendMessagesNew = async (
    date: Dayjs | null,
    schedule: Schedule,
  ): Promise<void> => {
    console.log("sendMessagesNew");
    try {
      if (!date) return undefined;
      const users = getAllUsers();

      await Promise.all(
        users.map(async (user) => {
          const groupKey = user.group_number as keyof Schedule;
          return bot.telegram
            .sendMessage(
              user.telegram_user_id,
              `${date.locale(user.locale).format("dddd, DD MMMM")} \n\n${groupKey}: ${schedule[groupKey]}`,
            )
            .catch((e) => {
              console.error(
                `Failed to send to user a new message ${user.telegram_user_id}:`,
                e.message,
              );
            });
        }),
      );
    } catch (error) {
      console.error("sendMessagesNew error: ", error);
    }
  };

  const sendMessageUpdated = async (
    date: Dayjs | null,
    updatedSchedule: Partial<Schedule>,
  ): Promise<void> => {
    try {
      if (!date) return;

      const updatedGroups = Object.keys(updatedSchedule);
      const usersToSend = getUsersByGroupNumbers(updatedGroups);

      await Promise.all(
        usersToSend.map(async (user) => {
          const groupKey = user.group_number as keyof Schedule;
          return bot.telegram
            .sendMessage(
              user.telegram_user_id,
              `${i18n.__({ phrase: "updated", locale: user.locale })}: ${date.locale(user.locale).format("dddd, DD MMMM")} \n\n${groupKey}: ${updatedSchedule[groupKey]}`,
            )
            .catch((e) => {
              console.error(
                `Failed to send to user an updated message ${user.telegram_user_id}:`,
                e.message,
              );
            });
        }),
      );
    } catch (error) {
      console.error("sendMessageUpdated error: ", error);
    }
  };

  const sendPersonalScheduleCommand = async (
    ctx: Context,
    date: Dayjs,
    fallbackMsg: string,
  ): Promise<void> => {
    try {
      if (!ctx.from) return;

      const schedule = getScheduleByDate(date);
      const user = getUserByTgUserId(ctx.from.id);
      if (!user) return;

      if (schedule) {
        const groupNumber = user.group_number as keyof Schedule;

        await ctx.reply(
          `${date.locale(user.locale).format("dddd, DD MMMM")} \n\n${groupNumber}: ${schedule[groupNumber]}`,
        );
      } else {
        await ctx.reply(i18n.__({ phrase: fallbackMsg, locale: user.locale }));
      }
    } catch (error) {
      console.error("sendPersonalScheduleCommand error: ", error);
    }
  };

  const sendAllScheduleCommand = async (
    ctx: Context,
    date: Dayjs,
    fallbackMsg: string,
  ): Promise<void> => {
    try {
      if (!ctx.from) return;

      const schedule = getScheduleByDate(date);
      const user = getUserByTgUserId(ctx.from.id);
      if (!user) return;

      if (schedule) {
        let scheduleStr = "";
        for (let k in schedule) {
          let groupNumber = k as keyof Schedule;
          scheduleStr += `${groupNumber}: ${schedule[groupNumber]} \n`;
        }
        await ctx.reply(
          `${date.locale(user.locale).format("dddd, DD MMMM")} \n\n${scheduleStr}`,
        );
      } else {
        await ctx.reply(i18n.__({ phrase: fallbackMsg, locale: user.locale }));
      }
    } catch (error) {
      console.error("sendAllScheduleCommand error: ", error);
    }
  };

  bot.command("group", async (ctx) => {
    try {
      const user: User | null = getUserByTgUserId(ctx.from.id);
      if (!user) return;
      const args = ctx.message.text.split(" ").slice(1);
      const commandValue = args.join("");
      const groupNumber = GROUP_NUMBERS.find(
        (n) => n === commandValue,
      ) as keyof Schedule;

      if (groupNumber) {
        await setUsersGroup(ctx, user, groupNumber);
      } else {
        await ctx.reply(
          i18n.__({ phrase: "wrongGroupCommand", locale: user.locale }),
        );
      }
    } catch (error) {
      console.error("bot.command /group error: ", error);
    }
  });

  bot.command("locale", async (ctx) => {
    try {
      const user: User | null = getUserByTgUserId(ctx.from.id);
      if (!user) return;

      const args = ctx.message.text.split(" ").slice(1);
      const commandValue = args[0]?.toLocaleLowerCase();
      const isValid = commandValue && SUPPORTED_LOCALES.includes(commandValue);

      if (isValid) {
        setUsersLocaleById(user.id, commandValue);
        await ctx.reply(i18n.__({ phrase: "localeSet", locale: commandValue }));
      } else {
        await ctx.reply(
          i18n.__({ phrase: "wrongLocale", locale: user.locale }),
        );
      }
    } catch (error) {
      console.error("bot.command /locale error: ", error);
    }
  });

  bot.command("today", async (ctx) => {
    await sendPersonalScheduleCommand(ctx, dayjs.tz(), "somethingWentWrong");
  });

  bot.command("tomorrow", async (ctx) => {
    await sendPersonalScheduleCommand(
      ctx,
      dayjs.tz().add(1, "day"),
      "tomorrowMissing",
    );
  });

  bot.command("today_all", async (ctx) => {
    await sendAllScheduleCommand(ctx, dayjs.tz(), "somethingWentWrong");
  });

  bot.command("tomorrow_all", async (ctx) => {
    await sendAllScheduleCommand(
      ctx,
      dayjs.tz().add(1, "day"),
      "tomorrowMissing",
    );
  });

  bot.command("help", async (ctx) => {
    try {
      const user: User | null = getUserByTgUserId(ctx.from.id);
      if (!user) return;

      const locale = user.locale;

      await ctx.reply(
        [
          i18n.__({ phrase: "helpStart", locale }),
          i18n.__({ phrase: "helpGroup", locale }),
          i18n.__({ phrase: "helpLocale", locale }),
        ].join("\n\n"),
      );
    } catch (error) {
      console.error("bot.command /help error: ", error);
    }
  });

  const launch = () => {
    try {
      bot.launch(() => console.log("Zoe bot is running"));

      bot.telegram.setMyCommands(
        [
          { command: "today", description: "Today - your group" },
          { command: "tomorrow", description: "Tomorrow - your group" },
          { command: "today_all", description: "Today - all groups" },
          { command: "tomorrow_all", description: "Tomorrow - all groups" },
          { command: "help", description: "Shows help information" },
        ],
        { language_code: "en" },
      );
      bot.telegram.setMyCommands(
        [
          { command: "today", description: "Сегодня - ваша группа" },
          { command: "tomorrow", description: "Завтра - ваша группа" },
          { command: "today_all", description: "Сегодня - все группы" },
          { command: "tomorrow_all", description: "Завтра - все группы" },
          { command: "help", description: "Показывает справочную информацию" },
        ],
        { language_code: "ru" },
      );
      bot.telegram.setMyCommands(
        [
          { command: "today", description: "Сьогодні - ваша група" },
          { command: "tomorrow", description: "Завтра - ваша група" },
          { command: "today_all", description: "Сьогодні - всі групи" },
          { command: "tomorrow_all", description: "Завтра - всі групи" },
          { command: "help", description: "Показує довідкову інформацію" },
        ],
        { language_code: "uk" },
      );
    } catch (error) {
      console.error("launch error: ", error);
    }
  };

  return { init, launch, sendMessagesNew, sendMessageUpdated };
};
