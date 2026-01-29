import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import type { Dayjs } from "dayjs";
import type { Schedule } from "./types.js";
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
  sendMessagesNew: (date: Dayjs | null, schedule: Schedule) => void;
  sendMessageUpdated: (
    date: Dayjs | null,
    updatedSchedule: Partial<Schedule>,
  ) => void;
};

export const createBot = (token: string): ZoeBot => {
  const bot: Telegraf = new Telegraf(token);

  let currentDate: Dayjs | null = null;
  let currentSchedule: Schedule = {
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

  const init = () => {
    bot.start((ctx) => {
      console.log("bot.start");
      const user = getUserByTgUserId(ctx.from.id);
      if (user) {
        removeUserByTgUserId(ctx.from.id);
      }
      insertUser(ctx.from.id);
      ctx.reply(`
        Hey, I'm Zoe 😊 \n\nI'll keep you updated on power outage schedules\n\nTo get started, just send me your outage group number (for example: 1.1, 1.2)
      `);
    });

    bot.on(message(), (ctx) => {
      const user = getUserByTgUserId(ctx.from.id);
      if (user) {
        if (!user.group_number) {
          if ("text" in ctx.update.message) {
            const text = ctx.update.message.text;
            const groupNumber = GROUP_NUMBERS.find(
              (n) => n === text,
            ) as keyof Schedule;

            if (groupNumber) {
              setUserGroupNumberById(user.id, groupNumber);
              ctx.reply(
                `Nice! Group ${groupNumber} it is \nI'll keep an eye on things for you`,
              );
              const todaysDate = dayjs();
              const currentSchedule: Schedule | null =
                getScheduleByDate(todaysDate);

              if (currentSchedule) {
                bot.telegram
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
              }
            } else {
              ctx.reply(
                `That one confused me a bit 😅 \nTry sending just the group number - 1.1, 1.2, and so on`,
              );
            }
          }
        }
      }

      if (!currentDate || !currentSchedule) return;
      // ctx.reply(
      //   `${currentDate.locale("en").format("dddd, DD MMMM")} \n\n6.1: ${currentSchedule["6.1"]}`,
      // );
    });
  };

  const sendMessagesNew = (date: Dayjs | null, schedule: Schedule) => {
    console.log("sendMessagesNew");
    try {
      if (!date) return undefined;
      const users = getAllUsers();

      users.forEach((user) => {
        const groupKey = user.group_number as keyof Schedule;
        bot.telegram
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
      });
    } catch (e) {
      console.error(e);
    }
  };

  const sendMessageUpdated = (
    date: Dayjs | null,
    updatedSchedule: Partial<Schedule>,
  ) => {
    if (!date) return undefined;
    const updatedGroups = Object.keys(updatedSchedule);
    const usersToSend = getUsersByGroupNumbers(updatedGroups);

    usersToSend.forEach((user) => {
      const groupKey = user.group_number as keyof Schedule;
      bot.telegram
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
    });
  };

  const launch = () => {
    bot.launch(() => console.log("Zoe bot is running"));
  };

  return { init, launch, sendMessagesNew, sendMessageUpdated };
};
