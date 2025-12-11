import { Process, Processor } from "@nestjs/bull";
import { Job } from "bull";
import { AudioService } from "../../modules/audio/audio.service";

@Processor("audio")
export class AudioQueueProcessor {
  constructor(private readonly audioService: AudioService) {}

  @Process("transcribe")
  async handle(job: Job<{ recordId: string; fileId?: string }>) {
    const recordId = BigInt(job.data.recordId);
    await this.audioService.transcribeAndSummarize(recordId, job.data.fileId);
  }
}

