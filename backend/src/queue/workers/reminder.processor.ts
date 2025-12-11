import { Process, Processor } from "@nestjs/bull";
import { Job } from "bull";
import { NotificationsService } from "../../modules/notifications/notifications.service";

@Processor("reminder")
export class ReminderQueueProcessor {
  constructor(private readonly notifications: NotificationsService) {}

  @Process("dispatch")
  async handle(job: Job<{ limit?: number }>) {
    await this.notifications.dispatchDueReminders(job.data.limit ?? 20);
  }
}

