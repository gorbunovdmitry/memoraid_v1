import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: bigint) {
    const user = await this.prisma.user.findFirst({ where: { id: userId } });
    return {
      locale: user?.locale ?? "ru",
      tz: user?.tz ?? "Europe/Moscow",
      notifications: { enabled: true }
    };
  }

  async update(userId: bigint, body: { tz?: string; notifications?: { enabled?: boolean } }) {
    await this.prisma.user.upsert({
      where: { id: userId },
      create: { id: userId, tgId: 0n, locale: "ru", tz: body.tz ?? "Europe/Moscow" },
      update: { tz: body.tz ?? undefined }
    });
    return { updated: true, ...body };
  }
}

