import { launch } from "@cloudflare/playwright";

interface Env {
  ASSETS: Fetcher;
  BROWSER: unknown;
  METHIS_ALLOWED_HOSTS?: string;
}

type Step = {
  name: string;
  status: "passed" | "failed" | "warning";
  detail: string;
  durationMs: number;
};

type RunResult = {
  id: string;
  target: string;
  startedAt: string;
  finishedAt: string;
  status: "passed" | "failed" | "blocked";
  account?: {
    username: string;
    email: string;
  };
  steps: Step[];
  consoleErrors: string[];
  pageErrors: string[];
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

function allowedTarget(raw: string, env: Env) {
  const url = new URL(raw);
  if (url.protocol !== "https:") throw new Error("La cible doit utiliser HTTPS.");

  const hosts = (env.METHIS_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);

  if (hosts.length === 0) throw new Error("METHIS_ALLOWED_HOSTS n'est pas configuré.");

  const hostname = url.hostname.toLowerCase();
  if (!hosts.some((host) => hostname === host || hostname.endsWith("." + host))) {
    throw new Error("Hôte non autorisé par Methis.");
  }

  return url;
}

async function runYunikoTest(target: string, env: Env): Promise<RunResult> {
  const startedAt = new Date().toISOString();
  const id = crypto.randomUUID();
  const steps: Step[] = [];
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  const browser = await launch(env.BROWSER as never);
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "fr-FR",
  });
  const page = await context.newPage();

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text().slice(0, 500));
  });
  page.on("pageerror", (error) => {
    pageErrors.push(String(error).slice(0, 500));
  });

  const step = async (
    name: string,
    action: () => Promise<string>,
    warning = false,
  ) => {
    const started = Date.now();
    try {
      const detail = await action();
      steps.push({
        name,
        status: warning ? "warning" : "passed",
        detail,
        durationMs: Date.now() - started,
      });
      return true;
    } catch (error) {
      steps.push({
        name,
        status: "failed",
        detail: String(error).slice(0, 500),
        durationMs: Date.now() - started,
      });
      return false;
    }
  };

  let account: RunResult["account"];

  try {
    await step("Ouverture de Yuniko", async () => {
      await page.goto(target, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
      return (await page.title()) || "Page chargée";
    });

    const registrationWorked = await step("Détection inscription", async () => {
      const candidates = [
        page.getByRole("link", { name: /créer un compte|inscription|sign up|register/i }).first(),
        page.getByRole("button", { name: /créer un compte|inscription|sign up|register/i }).first(),
      ];

      for (const candidate of candidates) {
        if (await candidate.count()) {
          await candidate.click();
          await page.waitForTimeout(700);
          return "Écran d'inscription trouvé";
        }
      }
      throw new Error("Aucun bouton/lien d'inscription détecté.");
    }, true);

    if (registrationWorked) {
      const stamp = Date.now().toString(36);
      const username = `methis_${stamp}`;
      const email = `${username}@example.invalid`;

      const fields = page.locator("input");
      const count = await fields.count();

      for (let i = 0; i < count; i++) {
        const input = fields.nth(i);
        const type = (await input.getAttribute("type")) ?? "text";
        const name = ((await input.getAttribute("name")) ?? "").toLowerCase();
        const placeholder = ((await input.getAttribute("placeholder")) ?? "").toLowerCase();
        const hint = name + " " + placeholder;

        if (type === "email" || /email|mail/.test(hint)) {
          await input.fill(email);
        } else if (/password|mot de passe/.test(hint)) {
          await input.fill(`Mth!_${stamp}_Y`);
        } else if (/pseudo|username|nom d'utilisateur|nickname/.test(hint)) {
          await input.fill(username);
        }
      }

      account = { username, email };

      await step("Préparation du compte de test", async () => {
        const buttons = page.getByRole("button", { name: /créer|s'inscrire|inscription|sign up|register|continuer/i });
        if (await buttons.count()) {
          await buttons.first().click();
          await page.waitForTimeout(1_000);
          return "Formulaire rempli avec un compte isolé.";
        }
        throw new Error("Bouton de validation du formulaire non détecté.");
      }, true);
    }

    await step("Navigation principale", async () => {
      const body = (await page.locator("body").innerText()).slice(0, 8_000);
      if (!body.trim()) throw new Error("La page ne contient aucun texte visible.");
      return `DOM visible: ${body.length} caractères`;
    });

    await step("Détection des contrôles interactifs", async () => {
      const buttons = await page.getByRole("button").count();
      const links = await page.getByRole("link").count();
      if (buttons + links === 0) throw new Error("Aucun contrôle interactif détecté.");
      return `${buttons} boutons, ${links} liens`;
    });

    await step("Capture de l'état visuel", async () => {
      const screenshot = await page.screenshot({ type: "png" });
      return `Screenshot capturé: ${screenshot.byteLength} octets`;
    }, true);
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }

  const finishedAt = new Date().toISOString();
  const failed = steps.some((item) => item.status === "failed");

  return {
    id,
    target,
    startedAt,
    finishedAt,
    status: failed ? "failed" : "passed",
    account,
    steps,
    consoleErrors,
    pageErrors,
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return json({
        agent: "Methis.AI",
        engine: "Cloudflare Browser Run + Playwright",
        status: "ready",
      });
    }

    if (url.pathname === "/api/test/run") {
      if (request.method !== "POST") {
        return json({ error: "Method not allowed" }, 405);
      }

      try {
        const body = (await request.json()) as { target?: string };
        if (!body.target) return json({ error: "target is required" }, 400);

        const target = allowedTarget(body.target, env);
        const result = await runYunikoTest(target.toString(), env);
        return json(result);
      } catch (error) {
        return json({ error: String(error).slice(0, 800) }, 400);
      }
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
