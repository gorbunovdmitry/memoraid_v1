import { Controller, Post, Query } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";

@Controller("reminders")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post("dispatch")
  async dispatch(@Query("limit") limit?: string) {
    const lim = limit ? parseInt(limit, 10) : 20;
    return this.notifications.dispatchDueReminders(lim);
  }
}

