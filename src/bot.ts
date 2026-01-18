import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import type { Dayjs } from "dayjs";

export const createBot = (token: string) => {
  const bot = new Telegraf(token);

  let currentDate: Dayjs | null = null;
  let currentSchedule = "";

  const init = () => {
    bot.start((ctx) => {
      console.log("start ctx: ", ctx.from.id);
      ctx.reply("Welcome to Zoe bot");
    });
    bot.on(message(), (ctx) => {
      console.log("hello command", ctx.from.id);
      ctx.from.id; // user who sent the command
      ctx.chat.id; // chat in which the command was sent

      if (!currentDate || !currentSchedule) return;
      ctx.reply(
        `${currentDate.locale("en").format("dddd, DD MMMM")} \n\n${currentSchedule}`,
      );
    });
  };

  const updateData = (date: Dayjs | null, schedule: string) => {
    currentDate = date;
    currentSchedule = schedule;
  }

  const launch = () => {
    bot.launch(() => console.log("Zoe bot is running"));
  };

  return { init, launch, updateData };
};
