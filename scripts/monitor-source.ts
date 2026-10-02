export function trafficCounts(value: unknown) {
  if (!value || typeof value !== "object" || !("stats" in value))
    throw new Error("Missing Vercel traffic stats");
  const stats = value.stats;
  if (!stats || typeof stats !== "object" || Array.isArray(stats))
    throw new Error("Invalid Vercel traffic stats");
  let accepted = 0;
  let blocked = 0;
  for (const [action, count] of Object.entries(stats)) {
    if (typeof count !== "number" || !Number.isFinite(count) || count < 0)
      throw new Error("Invalid Vercel request count");
    if (["deny", "challenge", "rate-limit"].includes(action)) blocked += count;
    else accepted += count;
  }
  return { accepted, blocked };
}

export function surgeReasons(
  recent: ReturnType<typeof trafficCounts>,
  daily: ReturnType<typeof trafficCounts>,
) {
  const reasons: string[] = [];
  if (recent.accepted >= 1000)
    reasons.push(
      `${recent.accepted} accepted requests in 15 minutes (limit 1000)`,
    );
  if (recent.blocked >= 100)
    reasons.push(
      `${recent.blocked} blocked requests in 15 minutes (limit 100)`,
    );
  if (daily.accepted >= 10_000)
    reasons.push(
      `${daily.accepted} accepted requests in 24 hours (limit 10000)`,
    );
  return reasons;
}

if (import.meta.main) {
  const project = process.env.VERCEL_PROJECT_ID;
  if (!project) throw new Error("VERCEL_PROJECT_ID is required");
  async function traffic(since: string) {
    const args = [
      "bunx",
      "vercel@62.1.0",
      "firewall",
      "traffic",
      "list",
      "--project",
      project as string,
      "--scope",
      "commandertvis",
      "--since",
      since,
      "--dimension",
      "action",
      "--json",
    ];
    if (process.env.VERCEL_TOKEN)
      args.push("--token", process.env.VERCEL_TOKEN);
    const command = Bun.spawn(args, { stdout: "pipe", stderr: "pipe" });
    const [output, error, code] = await Promise.all([
      new Response(command.stdout).text(),
      new Response(command.stderr).text(),
      command.exited,
    ]);
    if (code !== 0) throw new Error(`Vercel traffic query failed: ${error}`);
    return trafficCounts(JSON.parse(output));
  }
  const recent = await traffic("15m");
  const daily = await traffic("24h");
  console.log(JSON.stringify({ recent, daily }));
  const reasons = surgeReasons(recent, daily);
  if (reasons.length) {
    console.error(`🤖 Codex: ThinkRail traffic alert: ${reasons.join("; ")}`);
    console.error(
      "Inspect https://vercel.com/commandertvis/winget-thinkrail/firewall",
    );
    process.exitCode = 1;
  }
}
