import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";
import { TelegramService } from "./telegram.service";

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService, private readonly telegram: TelegramService) {}

  async sendReminder(params: { tgUserId: bigint; message: string }) {
    const res = await this.telegram.sendMessage(params.tgUserId.toString(), params.message);
    return { delivered: Boolean(res?.ok), params };
  }

  async dispatchDueReminders(limit = 20) {
    const now = new Date();
    const reminders = await this.prisma.reminder.findMany({
      where: { remindAt: { lte: now }, status: "scheduled" },
      take: limit,
      include: { event: { include: { user: true } } }
    });
    for (const r of reminders) {
      const message = `Напоминание: ${r.event.title} в ${r.event.startsAt.toISOString()}`;
      await this.sendReminder({ tgUserId: r.event.user.tgId, message });
      await this.prisma.reminder.update({ where: { id: r.id }, data: { status: "sent", deliveredAt: new Date() } });
    }
    return { processed: reminders.length };
  }
}

