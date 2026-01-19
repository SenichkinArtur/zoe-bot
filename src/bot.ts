import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import type { Dayjs } from "dayjs";
import type { Schedule } from "./types.js";
import {
  getUserByTgUserId,
  insertUser,
  removeUserByTgUserId,
  setUserGroupNumberById,
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

export type ZoeBot = {
  init: () => void;
  launch: () => void;
  sendMessageNew: (date: Dayjs | null, schedule: Schedule) => void;
  sendMessageUpdated: (date: Dayjs | null, schedule: Schedule) => void;
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
            const groupNumber = GROUP_NUMBERS.find((n) => n === text);

            if (groupNumber) {
              setUserGroupNumberById(user.id, groupNumber);
              ctx.reply(
                `Nice! Group ${groupNumber} it is ⚡\nI'll keep an eye on things for you`,
              );
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

  const sendMessageNew = (date: Dayjs | null, schedule: Schedule) => {
    console.log("sendMessageNew");

    // TODO: get all users and send message to all of them

    // console.log("chatId && date && schedule: ", chatId, date, schedule);
    // if (chatId && date && schedule) {
    // bot.telegram.sendMessage(
    //   chatId,
    //   `${date.locale("en").format("dddd, DD MMMM")} \n\n6.1: ${schedule["6.1"]}`,
    // );
    // }
  };

  const sendMessageUpdated = (date: Dayjs | null, schedule: Schedule) => {
    console.log("sendMessageUpdated");

    // TODO: get users by updated group number and send message to all of them

    // if (chatId && date && schedule) {
    // bot.telegram.sendMessage(
    //   chatId,
    //   `${date.locale("en").format("dddd, DD MMMM")} \n\n6.1: ${schedule["6.1"]}`,
    // );
    // }
  };

  const launch = () => {
    bot.launch(() => console.log("Zoe bot is running"));
  };

  return { init, launch, sendMessageNew, sendMessageUpdated };
};
