import { expect, test } from "bun:test";
import { surgeReasons, trafficCounts } from "../scripts/monitor-source";

test("firewall blocks are separated from accepted and logged requests", () => {
  expect(
    trafficCounts({
      stats: {
        allow: 40,
        log: 10,
        bypass: 5,
        deny: 8,
        challenge: 2,
        "rate-limit": 20,
      },
    }),
  ).toEqual({ accepted: 55, blocked: 30 });
  expect(trafficCounts({ stats: {} })).toEqual({ accepted: 0, blocked: 0 });
});

test("missing or invalid metrics fail instead of reporting quiet traffic", () => {
  for (const value of [
    null,
    {},
    { stats: [] },
    { stats: { allow: -1 } },
    { stats: { allow: "10" } },
    { stats: { allow: Number.NaN } },
  ])
    expect(() => trafficCounts(value)).toThrow();
});

test("short bursts, blocked floods, and slow daily exhaustion trigger independently", () => {
  expect(
    surgeReasons(
      { accepted: 999, blocked: 99 },
      { accepted: 9999, blocked: 5000 },
    ),
  ).toEqual([]);
  expect(
    surgeReasons(
      { accepted: 1000, blocked: 0 },
      { accepted: 1000, blocked: 0 },
    ),
  ).toHaveLength(1);
  expect(
    surgeReasons({ accepted: 0, blocked: 100 }, { accepted: 0, blocked: 100 }),
  ).toHaveLength(1);
  expect(
    surgeReasons({ accepted: 50, blocked: 0 }, { accepted: 10000, blocked: 0 }),
  ).toHaveLength(1);
});
