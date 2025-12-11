import { NestFactory } from "@nestjs/core";
import { QueueModule } from "./queue/queue.module";

async function bootstrap() {
  await NestFactory.createApplicationContext(QueueModule);
  // eslint-disable-next-line no-console
  console.log("Queue workers started");
}

bootstrap();

