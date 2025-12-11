import { Injectable } from "@nestjs/common";

@Injectable()
export class BillingService {
  status() {
    // Paywall позже; сейчас free
    return { plan: "free", status: "active" };
  }
}

