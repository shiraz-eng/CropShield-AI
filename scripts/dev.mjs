#!/usr/bin/env node
// Start the Next.js frontend and FastAPI backend together for local development.
// Both bind to 127.0.0.1, keep their own processes and log files, and stop together.
import { spawn, spawnSync } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync, readFileSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const frontend = join(root, "frontend");
const backend = join(root, "backend");
const windows = process.platform === "win32";
const python = join(backend, ".venv", windows ? "Scripts/python.exe" : "bin/python");
const host = "127.0.0.1";

function option(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  const value = index >= 0 ? process.argv[index + 1] : process.env[`CROPSHIELD_${name.replace("-", "_").toUpperCase()}`];
  return value ?? fallback;
}

function port(name, fallback) {
  const value = Number(option(name, fallback));
  if (!Number.isInteger(value) || value < 1024 || value > 65535) fail(`--${name} must be a port from 1024 to 65535.`);
  return value;
}

function fail(message) {
  console.error(`\n[dev] ${message}`);
  process.exit(1);
}

/** Read KEY=VALUE names from an env file without printing any values. */
function envKeys(path) {
  if (!existsSync(path)) return null;
  const keys = new Set();
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (match && match[2].replace(/^["']|["']$/g, "").trim()) keys.add(match[1]);
  }
  return keys;
}

function checkConfig() {
  const problems = [];
  const warnings = [];
  if (!existsSync(join(frontend, "node_modules", "next")))
    problems.push("Frontend dependencies are missing. Run `npm install` in frontend/.");
  if (!existsSync(python))
    problems.push("The backend virtual environment is missing. See README › Backend setup (python -m venv .venv, then pip install -r requirements.txt).");
  const web = envKeys(join(frontend, ".env.local"));
  const api = envKeys(join(backend, ".env"));
  const has = (keys, name) => Boolean(process.env[name]?.trim()) || Boolean(keys?.has(name));
  for (const name of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"])
    if (!has(web, name)) problems.push(`${name} is not set. Copy frontend/.env.example to frontend/.env.local and fill it in.`);
  for (const name of ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"])
    if (!has(api, name)) problems.push(`${name} is not set. Copy backend/.env.example to backend/.env and fill it in.`);
  // Next.js allows one dev server per project directory and records it in this lock file.
  try {
    const lock = JSON.parse(readFileSync(join(frontend, ".next", "dev", "lock"), "utf8"));
    if (Number.isInteger(lock.pid) && process.kill(lock.pid, 0))
      problems.push(`A Next.js dev server for frontend/ is already running at ${lock.appUrl} (PID ${lock.pid}). Use it, or stop it before starting both services.`);
  } catch { /* no lock, or its process has exited */ }
  if (!has(api, "GEMINI_API_KEY"))
    warnings.push("GEMINI_API_KEY is not set in backend/.env. AI analysis, comparison, RustWatch image review and the Assistant will report that AI is unavailable.");
  for (const warning of warnings) console.warn(`[dev] Warning: ${warning}`);
  if (problems.length) fail(`Cannot start:\n  - ${problems.join("\n  - ")}`);
}

/** A port is free only if it can be bound on both IPv4 and IPv6 wildcard and loopback addresses. */
async function portFree(value) {
  for (const address of [host, "0.0.0.0", "::"]) {
    const free = await new Promise((resolve) => {
      const server = createServer();
      server.once("error", (error) => resolve(error.code === "EAFNOSUPPORT" || error.code === "EADDRNOTAVAIL"));
      server.listen({ port: value, host: address, exclusive: true }, () => server.close(() => resolve(true)));
    });
    if (!free) return false;
  }
  return true;
}

const colors = { web: "\x1b[36m", api: "\x1b[35m" };
const children = new Map();
let stopping = false;

function run(name, command, args, options) {
  const log = createWriteStream(join(root, "logs", `${name}.log`), { flags: "a" });
  log.write(`\n=== ${new Date().toISOString()} ${name} start ===\n`);
  const child = spawn(command, args, {
    ...options, stdio: ["ignore", "pipe", "pipe"], detached: !windows, windowsHide: true,
  });
  const prefix = process.stdout.isTTY ? `${colors[name]}[${name}]\x1b[0m ` : `[${name}] `;
  for (const stream of [child.stdout, child.stderr]) {
    let pending = "";
    stream.on("data", (chunk) => {
      log.write(chunk);
      const lines = (pending + chunk.toString()).split(/\r?\n/);
      pending = lines.pop();
      for (const line of lines) process.stdout.write(prefix + line + "\n");
    });
  }
  child.on("exit", (code, signal) => {
    log.end(`=== ${name} exited (${signal ?? code}) ===\n`);
    children.delete(name);
    if (!stopping) {
      console.error(`[dev] ${name} stopped unexpectedly (${signal ?? `exit ${code}`}). Stopping the other service. See logs/${name}.log.`);
      stop(1);
    } else if (!children.size) process.exit(process.exitCode ?? 0);
  });
  children.set(name, child);
}

function kill(child) {
  if (windows) spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  else try { process.kill(-child.pid, "SIGTERM"); } catch { /* already gone */ }
}

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  console.log("[dev] Stopping frontend and backend…");
  for (const child of children.values()) kill(child);
  if (!children.size) process.exit(code);
  setTimeout(() => process.exit(code), 5000).unref();
}

async function waitFor(url, seconds) {
  const deadline = Date.now() + seconds * 1000;
  while (Date.now() < deadline && !stopping) {
    try {
      const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(5000) });
      if (response.status < 500) return true;
    } catch { /* not listening yet */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

const webPort = port("web-port", 3000);
const apiPort = port("api-port", 8000);
if (webPort === apiPort) fail("The frontend and backend need different ports.");
checkConfig();
for (const [name, value] of [["web-port", webPort], ["api-port", apiPort]])
  if (!(await portFree(value))) fail(`Port ${value} is already in use. Stop that process or choose another with --${name} <port>.`);
if (process.argv.includes("--check")) {
  console.log(`[dev] Configuration OK. Ports ${webPort} (web) and ${apiPort} (api) are free.`);
  process.exit(0);
}

mkdirSync(join(root, "logs"), { recursive: true });
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
if (windows) process.on("SIGHUP", () => stop(0));

run("api", python, ["-m", "uvicorn", "main:app", "--reload", "--host", host, "--port", String(apiPort)], {
  cwd: backend, env: { ...process.env, PYTHONUNBUFFERED: "1" },
});
// Reuse the frontend's own `npm run dev` script so both workflows stay identical.
// On Windows npm is a .cmd shim that needs a shell; the line holds only validated constants.
const webArgs = ["run", "dev", "--", "--hostname", host, "--port", String(webPort)];
run("web", windows ? `npm ${webArgs.join(" ")}` : "npm", windows ? [] : webArgs, {
  cwd: frontend, shell: windows,
  env: { ...process.env, CROP_ANALYSIS_API_URL: `http://${host}:${apiPort}`, FORCE_COLOR: "1" },
});

const [apiReady, webReady] = await Promise.all([
  waitFor(`http://${host}:${apiPort}/health`, 90),
  waitFor(`http://${host}:${webPort}/`, 180),
]);
if (!stopping) {
  if (apiReady && webReady)
    console.log(`\n[dev] Ready. App: http://${host}:${webPort}  API health: http://${host}:${apiPort}/health  Logs: logs/web.log, logs/api.log  Stop: Ctrl+C\n`);
  else console.warn(`[dev] Still waiting for ${[!apiReady && "api", !webReady && "web"].filter(Boolean).join(" and ")}. Check logs/.`);
}
