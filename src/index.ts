import { launch } from "@cloudflare/playwright";

interface Env {
  ASSETS: Fetcher;
  BROWSER: unknown;
  METHIS_ALLOWED_HOSTS?: string;
  METHIS_TEST_USERNAME?: string;
  METHIS_TEST_SECRET?: string;
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

    let registrationWorked = true;

    if (env.METHIS_TEST_USERNAME?.trim() && env.METHIS_TEST_SECRET) {
      const loginWorked = await step("Connexion du compte de test", async () => {
        await page.goto(new URL("/login", target).toString(), {
          waitUntil: "domcontentloaded",
          timeout: 30_000,
        });

        const inputs = page.locator("input");
        const visible = [];
        const count = await inputs.count();
        for (let i = 0; i < count; i++) {
          if (await inputs.nth(i).isVisible().catch(() => false)) visible.push(inputs.nth(i));
        }
        if (visible.length < 2) throw new Error("Champs de connexion non détectés.");

        await visible[0].fill(env.METHIS_TEST_USERNAME!.trim().toLowerCase());
        await visible[1].fill(env.METHIS_TEST_SECRET!);

        const signIn = page.getByRole("button", { name: /^sign in$/i }).first();
        if (!(await signIn.count())) throw new Error("Bouton Sign In non détecté.");
        await signIn.click();
        await page.waitForTimeout(1_000);

        const cookies = await context.cookies();
        const session = cookies.find((cookie) => cookie.name === "yuniko_session");
        if (!session) throw new Error("Compte de test non connecté.");

        const apiHost = session.domain.replace(/^\\./, "");
        const response = await context.request.get(`https://${apiHost}/api/auth/me`);
        if (!response.ok()) {
          const body = (await response.text()).slice(0, 300);
          throw new Error(`Session non authentifiée: HTTP ${response.status()} ${body}`);
        }

        return "Compte existant connecté et session vérifiée.";
      }, true);

      if (loginWorked) {
        account = { username: env.METHIS_TEST_USERNAME.trim().toLowerCase() };
        registrationWorked = false;
      }
    }

    if (registrationWorked) {
      const stamp = Date.now().toString(36);
      const username = (env.METHIS_TEST_USERNAME?.trim() || `methis_${stamp}`).toLowerCase();
      const password = env.METHIS_TEST_SECRET || `Mth!_${stamp}_Y`;
      account = { username };

      const registrationScreen = await step("Détection inscription", async () => {
        if (!/\/login(?:[/?#]|$)/i.test(page.url())) {
          await page.goto(new URL("/login", target).toString(), {
            waitUntil: "domcontentloaded",
            timeout: 30_000,
          });
        }

        const candidates = [
          page.getByRole("button", { name: /créer un compte|inscription|sign up|register/i }).first(),
          page.getByRole("link", { name: /créer un compte|inscription|sign up|register/i }).first(),
        ];

        for (const candidate of candidates) {
          if (await candidate.count()) {
            await candidate.click();
            await page.waitForTimeout(500);
            return "Écran d'inscription trouvé";
          }
        }
        throw new Error("Aucun bouton/lien d'inscription détecté.");
      }, true);

      if (registrationScreen) {
        await step("Inscription · étape 1", async () => {
          const inputs = page.locator("input");
          const count = await inputs.count();
          const visible = [];
          for (let i = 0; i < count; i++) {
            if (await inputs.nth(i).isVisible().catch(() => false)) visible.push(inputs.nth(i));
          }
          if (visible.length < 3) throw new Error("Les champs username/password/confirmation ne sont pas tous visibles.");

          await visible[0].fill(username);
          await visible[1].fill(password);
          await visible[2].fill(password);

          const button = page.getByRole("button", { name: /^continue$/i }).first();
          if (!(await button.count())) throw new Error("Bouton Continue de l'étape 1 non détecté.");
          await button.click();
          await page.waitForTimeout(500);
          return "Identifiant et mot de passe remplis.";
        });

        await step("Inscription · étape 2", async () => {
          const inputs = page.locator("input");
          const count = await inputs.count();
          let displayNameInput = null;
          let ageInput = null;

          for (let i = 0; i < count; i++) {
            const input = inputs.nth(i);
            if (!(await input.isVisible().catch(() => false))) continue;
            const type = (await input.getAttribute("type")) ?? "text";
            const placeholder = ((await input.getAttribute("placeholder")) ?? "").toLowerCase();
            if (type === "number" || /age/.test(placeholder)) ageInput = input;
            else if (/display name|name/.test(placeholder)) displayNameInput = input;
          }

          if (!displayNameInput || !ageInput) throw new Error("Les champs nom et âge de l'étape 2 ne sont pas détectés.");
          await displayNameInput.fill(`Methis Test ${stamp}`);

          const country = page.locator("select").first();
          if (await country.count()) {
            const options = country.locator("option");
            const optionCount = await options.count();
            if (optionCount === 0) throw new Error("Le sélecteur de pays est vide.");

            const index = optionCount > 1 ? 1 : 0;
            await country.selectOption({ index });
          } else {
            throw new Error("Le sélecteur de pays n'est pas détecté.");
          }

          await ageInput.fill("17");

          const button = page.getByRole("button", { name: /^continue$/i }).first();
          if (!(await button.count())) throw new Error("Bouton Continue de l'étape 2 non détecté.");
          await button.click();
          await page.waitForTimeout(500);
          return "Nom, pays et âge de test remplis.";
        });

        await step("Inscription · étape 3", async () => {
          const skip = page.getByRole("button", { name: /skip for now/i }).first();
          if (await skip.count()) {
            await skip.click();
            await page.waitForTimeout(1_000);
            return "Photo ignorée, comme autorisé par Yuniko.";
          }

          const create = page.getByRole("button", { name: /create account/i }).first();
          if (!(await create.count())) throw new Error("Bouton Create Account non détecté.");
          await create.click();
          await page.waitForTimeout(1_000);
          return "Compte de test créé.";
        });

        await step("Vérification de session", async () => {
          const cookies = await context.cookies();
          const session = cookies.find((cookie) => cookie.name === "yuniko_session");
          if (!session) throw new Error("Cookie yuniko_session absent après inscription.");

          const apiHost = session.domain.replace(/^\\./, "");
          const response = await context.request.get(`https://${apiHost}/api/auth/me`);
          if (!response.ok()) {
            const body = (await response.text()).slice(0, 300);
            throw new Error(`Session non authentifiée: HTTP ${response.status()} ${body}`);
          }
          return `Session Yuniko active via ${apiHost}.`;
        });
      }
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
