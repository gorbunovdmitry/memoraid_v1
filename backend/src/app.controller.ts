import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
  @Get()
  root() {
    return {
      message: "Memoraid API",
      version: "1.0.0",
      endpoints: {
        health: "/health",
        ingest: "/ingest",
        memories: "/memories",
        calendar: "/events",
        advice: "/advice",
        audio: "/audio",
        profile: "/profile",
        billing: "/billing"
      },
      docs: "See docs/api.md for API documentation"
    };
  }

  @Get("/health")
  health() {
    return { status: "ok" };
  }
}

