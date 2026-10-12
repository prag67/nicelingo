import { describe, expect, it } from "vitest";
import app from "../src/index";

describe("GET /api/progress/all", () => {
  it("401s without a session", async () => {
    const res = await app.request("/api/progress/all");
    expect(res.status).toBe(401);
  });
});
