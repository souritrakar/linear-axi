import { describe, expect, it, vi } from "vitest";
import { printOutput } from "../src/output.js";

describe("output", () => {
  it("prints TOON by default with contextual help", () => {
    const write = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    printOutput({ count: 0, issues: [] }, { json: false, full: false }, ["Run `linear issues`"]);
    expect(String(write.mock.calls[0]?.[0])).toContain("count: 0");
    expect(String(write.mock.calls[0]?.[0])).toContain("help[1]");
    write.mockRestore();
  });

  it("prints JSON when requested", () => {
    const write = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    printOutput({ count: 0 }, { json: true, full: false });
    expect(JSON.parse(String(write.mock.calls[0]?.[0]))).toEqual({ count: 0 });
    write.mockRestore();
  });
});
