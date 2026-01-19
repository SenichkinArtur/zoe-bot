export type User = {
  id: number;
  date: string;
  telegram_user_id: number;
  group_number: string;
  locale: string;
}

export enum ScheduleType {
  New = "new",
  Updated = "updated"
}

export type ScheduleRecord = {
  id: number;
  date: string;
  queues: string;
};

export type Schedule = {
  "1.1": string;
  "1.2": string;
  "2.1": string;
  "2.2": string;
  "3.1": string;
  "3.2": string;
  "4.1": string;
  "4.2": string;
  "5.1": string;
  "5.2": string;
  "6.1": string;
  "6.2": string;
}