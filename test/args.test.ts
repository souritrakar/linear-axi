import { describe, expect, it } from "vitest";
import { extractGlobalArgs, parseFlags } from "../src/args.js";

describe("argument parsing", () => {
  it("extracts global flags before or after a command", () => {
    expect(extractGlobalArgs(["--workspace", "acme", "issues", "--json", "--full"]))
      .toEqual({ argv: ["issues"], workspace: "acme", json: true, full: true });
    expect(extractGlobalArgs(["issues", "--workspace=personal"]))
      .toEqual({ argv: ["issues"], workspace: "personal", json: false, full: false });
  });

  it("collects repeatable flags and rejects unknown flags", () => {
    expect(parseFlags(["--label", "Bug", "--label=Feature"], ["label"], [], ["label"]).flags.label)
      .toEqual(["Bug", "Feature"]);
    expect(() => parseFlags(["--invented"], [])).toThrow("Unknown flag");
  });
});
