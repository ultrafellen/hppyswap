// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";
import { truncateAddress } from "../src/lib/address";

describe("truncateAddress", () => {
  it("truncates a full-length address to 0x12…ab34 form", () => {
    expect(truncateAddress("0x1234567890abcdef1234567890abcdef12ab34")).toBe("0x12…ab34");
  });

  it("returns short strings unchanged", () => {
    expect(truncateAddress("0x1234")).toBe("0x1234");
  });
});
