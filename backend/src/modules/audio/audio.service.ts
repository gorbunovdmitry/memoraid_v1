import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";
import { TelegramFileService } from "./telegram-file.service";
import { LlmService } from "../../common/llm.service";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";

@Injectable()
export class AudioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tgFile: TelegramFileService,
    private readonly llm: LlmService,
    @InjectQueue("audio") private readonly audioQueue: Queue
  ) {}

  async enqueue(
    userId: bigint,
    body: {
    upload_url?: string;
    duration_sec?: number;
    size_bytes?: number;
      file_id?: string;
    }
  ) {
    const created = await this.prisma.audioRecord.create({
      data: {
        userId,
        storageUrl: body.upload_url ?? "s3://placeholder",
        durationSec: body.duration_sec,
        sizeBytes: body.size_bytes
      }
    });
    await this.audioQueue.add("transcribe", {
      recordId: created.id.toString(),
      fileId: body.file_id
    });
    return { audio_id: created.id.toString(), status: "queued" };
  }

  async get(userId: bigint, id: string) {
    const record = await this.prisma.audioRecord.findFirst({ where: { id: BigInt(id), userId } });
    if (!record) return { id, not_found: true };
    return {
      id,
      transcript: record.transcript,
      summary: record.summary,
      next_steps: record.nextSteps ?? []
    };
  }

  async transcribeAndSummarize(recordId: bigint, fileId?: string) {
    const filePath = fileId ? await this.tgFile.downloadFile(fileId) : null;
    // TODO: send filePath to Gemini for ASR; currently stub
    const transcript = "Транскрипция недоступна (заглушка)";
    const summary = "Краткое содержание (заглушка)";
    const next_steps: string[] = [];
    await this.prisma.audioRecord.update({
      where: { id: recordId },
      data: { transcript, summary, nextSteps: next_steps }
    });
    return { transcript, summary, next_steps, filePath };
  }
}

