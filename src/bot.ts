import { Telegraf, Context } from "telegraf";
import { message } from "telegraf/filters";
import type { Dayjs } from "dayjs";
import type { Schedule, User } from "./types.js";
import {
  getAllUsers,
  getScheduleByDate,
  getUserByTgUserId,
  getUsersByGroupNumbers,
  insertUser,
  removeUserByTgUserId,
  setUserGroupNumberById,
} from "./db.js";
import dayjs from "dayjs";

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
      console.log("bot.start");
      const user = getUserByTgUserId(ctx.from.id);
      if (user) {
        removeUserByTgUserId(ctx.from.id);
      }
      insertUser(ctx.from.id);
      await ctx.reply(`
        Hey, I'm Zoe 😊 \n\nI'll keep you updated on power outage schedules\n\nTo get started, just send me your outage group number (for example: 1.1, 1.2)
      `);
    });

    bot.on(message(), async (ctx) => {
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
    });
  };

  const setUsersGroup = async (
    ctx: Context,
    user: User | null,
    groupNumber: keyof Schedule,
  ): Promise<void> => {
    if (groupNumber && user) {
      setUserGroupNumberById(user.id, groupNumber);
      await ctx.reply(
        `Nice! Group ${groupNumber} it is ⚡ \nI'll keep an eye on things for you 👀`,
      );
      const todaysDate = dayjs.tz();
      const currentSchedule: Schedule | null = getScheduleByDate(todaysDate);

      if (!currentSchedule) return;

      await bot.telegram
        .sendMessage(
          user.telegram_user_id,
          `${todaysDate.locale("en").format("dddd, DD MMMM")} \n\n${groupNumber}: ${currentSchedule[groupNumber]}`,
        )
        .catch((e) => {
          console.error(
            `Failed to send to user ${user.telegram_user_id}:`,
            e.message,
          );
        });
    } else {
      await ctx.reply(
        `That one confused me a bit 😅 \nTry sending just the group number - 1.1, 1.2, and so on`,
      );
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
              `${date.locale("en").format("dddd, DD MMMM")} \n\n${groupKey}: ${schedule[groupKey]}`,
            )
            .catch((e) => {
              console.error(
                `Failed to send to user ${user.telegram_user_id}:`,
                e.message,
              );
            });
        }),
      );
    } catch (e) {
      console.error(e);
    }
  };

  const sendMessageUpdated = async (
    date: Dayjs | null,
    updatedSchedule: Partial<Schedule>,
  ): Promise<void> => {
    if (!date) return;

    const updatedGroups = Object.keys(updatedSchedule);
    const usersToSend = getUsersByGroupNumbers(updatedGroups);

    await Promise.all(
      usersToSend.map(async (user) => {
        const groupKey = user.group_number as keyof Schedule;
        return bot.telegram
          .sendMessage(
            user.telegram_user_id,
            `Updated for: ${date.locale("en").format("dddd, DD MMMM")} \n\n${groupKey}: ${updatedSchedule[groupKey]}`,
          )
          .catch((e) => {
            console.error(
              `Failed to send to user ${user.telegram_user_id}:`,
              e.message,
            );
          });
      }),
    );
  };

  const sendPersonalScheduleCommand = async (
    ctx: Context,
    date: Dayjs,
    fallbackMsg: string,
  ): Promise<void> => {
    if (!ctx.from) return;

    const schedule = getScheduleByDate(date);
    const user = getUserByTgUserId(ctx.from.id);

    if (schedule && user) {
      const groupNumber = user.group_number as keyof Schedule;

      await ctx.reply(
        `${date.locale("en").format("dddd, DD MMMM")} \n\n${groupNumber}: ${schedule[groupNumber]}`,
      );
    } else {
      await ctx.reply(fallbackMsg);
    }
  };

  const sendAllScheduleCommand = async (
    ctx: Context,
    date: Dayjs,
    fallbackMsg: string,
  ): Promise<void> => {
    if (!ctx.from) return;

    const schedule = getScheduleByDate(date);

    if (schedule) {
      let scheduleStr = "";
      for (let k in schedule) {
        let groupNumber = k as keyof Schedule;
        scheduleStr += `${groupNumber}: ${schedule[groupNumber]} \n`;
      }
      await ctx.reply(
        `${date.locale("en").format("dddd, DD MMMM")} \n\n${scheduleStr}`,
      );
    } else {
      await ctx.reply(fallbackMsg);
    }
  };

  bot.command("group", async (ctx) => {
    const user: User | null = getUserByTgUserId(ctx.from.id);
    const args = ctx.message.text.split(" ").slice(1);
    const commandValue = args.join("");
    const groupNumber = GROUP_NUMBERS.find(
      (n) => n === commandValue,
    ) as keyof Schedule;

    await setUsersGroup(ctx, user, groupNumber);
  });

  bot.command("today", async (ctx) => {
    await sendPersonalScheduleCommand(ctx, dayjs.tz(), "Something went wrong 😔");
  });

  bot.command("tomorrow", async (ctx) => {
    await sendPersonalScheduleCommand(
      ctx,
      dayjs.tz().add(1, "day"),
      `Looks like tomorrow's outage schedule hasn't been published yet.\nI'll notify you when it's published 👀`,
    );
  });

  bot.command("today_all", async (ctx) => {
    await sendAllScheduleCommand(ctx, dayjs.tz(), "Something went wrong 😔");
  });

  bot.command("tomorrow_all", async (ctx) => {
    await sendAllScheduleCommand(
      ctx,
      dayjs.tz().add(1, "day"),
      `Looks like tomorrow's outage schedule hasn't been published yet.\nI'll notify you when it's published 👀`,
    );
  });

  bot.command("help", async (ctx) => {
    ctx.reply(`
- /start - Starts the bot
- /group <number> - Change your group number (e.g. /group 1.2);
    `);
  });

  const launch = () => {
    bot.launch(() => console.log("Zoe bot is running"));

    bot.telegram.setMyCommands([
      {
        command: "today",
        description: "Today for your group",
      },
      {
        command: "tomorrow",
        description: "Tomorrow for your group",
      },
      {
        command: "today_all",
        description: "Today for all groups",
      },
      {
        command: "tomorrow_all",
        description: "Tomorrow for all groups",
      },
      {
        command: "help",
        description: "Shows help information",
      },
    ]);
  };

  return { init, launch, sendMessagesNew, sendMessageUpdated };
};
