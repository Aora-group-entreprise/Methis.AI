const logo = "./FB_IMG_17913227239346345.jpg";
const state = { screen: "home", lastRun: null };

const tests = [
  ["Inscription / Connexion", "Création et session du compte de test"],
  ["Navigation principale", "Accueil, recherche, profil et notifications"],
  ["Publication", "Création et vérification d'un post"],
  ["Interactions", "Like, commentaire, partage et sauvegarde"],
  ["Messages", "Conversation et envoi d'un message"],
  ["Stories", "Création, vue et interaction"],
  ["Recherche / Suivi", "Recherche d'utilisateur et suivi"],
  ["Déconnexion / Reconnexion", "Session et retour sécurisé"]
];

function nav(label, icon, screen) {
  return `<button class="nav ${state.screen === screen ? "active" : ""}" onclick="go('${screen}')"><b>${icon}</b>${label}</button>`;
}

function shell(content) {
  return `
    <div class="app">
      <header class="topbar">
        <div class="brand">
          <img src="${logo}" alt="Methis.AI">
          <div>
            <strong>Methis<span style="color:#c73cff">.AI</span></strong>
            <span>Autonomous Testing Agent</span>
          </div>
        </div>
        <button class="icon-btn" onclick="toast('Moteur Cloudflare actif')">●</button>
      </header>
      <main>${content}</main>
      <nav class="bottom">
        ${nav("Accueil", "⌂", "home")}
        ${nav("Tests", "◉", "tests")}
        ${nav("Rapports", "▣", "reports")}
        ${nav("Comptes", "♙", "accounts")}
        ${nav("Plus", "☰", "more")}
      </nav>
    </div>
  `;
}

function home() {
  return shell(`
    <section class="hero">
      <div class="eyebrow">Agent Methis • prêt</div>
      <h1>Prêt à tester.</h1>
      <p>Methis ouvre un vrai navigateur Cloudflare, navigue dans Yuniko et vérifie les résultats.</p>
      <button class="primary" onclick="go('create')">▶ Lancer un test réel</button>
    </section>

    <div class="section-title">
      <h2>Moteur</h2>
      <button onclick="checkHealth()">Vérifier</button>
    </div>

    <article class="card">
      <div class="run">
        <span style="font-size:28px">☁️</span>
        <div class="run-info">
          <b>Cloudflare Browser Run</b>
          <small id="engine-status">État inconnu</small>
        </div>
        <span class="pill ok">READY</span>
      </div>
    </article>

    <div class="section-title"><h2>Dernière session</h2></div>

    <article class="card">
      <div class="run">
        <span style="font-size:28px">🤖</span>
        <div class="run-info">
          <b>${state.lastRun ? "Dernière mission disponible" : "Aucun test exécuté"}</b>
          <small>${state.lastRun ? "Ouvre Tests ou Rapports pour voir le résultat." : "Lance une mission pour obtenir un vrai rapport."}</small>
        </div>
      </div>
    </article>
  `);
}

function create() {
  return shell(`
    <div class="screen-title">
      <button class="back" onclick="go('home')">‹</button>
      <h1>Créer un test</h1>
    </div>

    <div class="field">
      <label>APPLICATION À TESTER</label>
      <input id="target" value="https://yuniko-api.lafatriniainaallane.workers.dev" placeholder="https://...">
    </div>

    <div class="section-title">
      <h2>Scénario V1</h2>
      <span style="color:#8794bb;font-size:11px">moteur réel</span>
    </div>

    <div>
      ${tests.map((test, index) => `
        <div class="check">
          <span class="num">${index + 1}</span>
          <div><b>${test[0]}</b><small>${test[1]}</small></div>
          <span class="mark">○</span>
        </div>
      `).join("")}
    </div>

    <button class="primary" style="margin-top:16px" onclick="startTest()">Démarrer le test réel</button>
  `);
}

function running() {
  const result = state.lastRun;

  if (!result) {
    return shell(`
      <div class="screen-title">
        <button class="back" onclick="go('tests')">‹</button>
        <h1>Résultat</h1>
      </div>
      <div class="card"><div class="empty">Methis travaille…</div></div>
    `);
  }

  const passed = result.steps.filter((item) => item.status === "passed").length;
  const errors = result.consoleErrors.concat(result.pageErrors);

  return shell(`
    <div class="screen-title">
      <button class="back" onclick="go('tests')">‹</button>
      <h1>Résultat</h1>
    </div>

    <div class="card">
      <div class="run">
        <span style="font-size:28px">🤖</span>
        <div class="run-info">
          <b>Mission ${String(result.id).slice(0, 8)}</b>
          <small>${result.target}</small>
        </div>
        <span class="pill ${result.status === "passed" ? "ok" : "fail"}">${result.status.toUpperCase()}</span>
      </div>
    </div>

    <div class="section-title">
      <h2>Étapes</h2>
      <span style="color:#8794bb;font-size:11px">${passed}/${result.steps.length}</span>
    </div>

    ${result.steps.map((item) => `
      <div class="check ${item.status === "passed" ? "done" : ""}">
        <span class="num">${item.status === "passed" ? "✓" : "!"}</span>
        <div><b>${item.name}</b><small>${item.detail}</small></div>
        <span class="mark">${item.durationMs}ms</span>
      </div>
    `).join("")}

    ${errors.length ? `
      <div class="card">
        <b>Erreurs navigateur</b>
        <small style="display:block;color:#ff829f;margin-top:8px">${errors.join("<br>")}</small>
      </div>
    ` : ""}
  `);
}

function reports() {
  const result = state.lastRun;
  const percentage = result
    ? Math.round(result.steps.filter((item) => item.status === "passed").length / Math.max(result.steps.length, 1) * 100)
    : null;

  return shell(`
    <div class="screen-title"><h1>Rapports</h1></div>
    <div class="card" style="text-align:center">
      <div class="result-circle">
        <strong>${percentage === null ? "--" : percentage}%</strong>
        <small>Réussi</small>
      </div>
      <b>${result ? "Dernière mission" : "Aucun rapport"}</b>
      <p style="color:var(--muted);font-size:12px">
        ${result ? result.steps.length + " étapes exécutées" : "Les résultats réels apparaîtront ici."}
      </p>
    </div>
  `);
}

function accounts() {
  return shell(`
    <div class="screen-title"><h1>Comptes de test</h1></div>
    <div class="card">
      <div class="empty">Les comptes seront créés et isolés automatiquement par Methis pendant les scénarios d'authentification.</div>
    </div>
  `);
}

function testsPage() {
  return shell(`
    <div class="screen-title"><h1>Tests</h1></div>
    <div class="card">
      <div class="run">
        <span style="font-size:28px">🧪</span>
        <div class="run-info">
          <b>Yuniko · Test réel</b>
          <small>Cloudflare Browser Run + Playwright</small>
        </div>
        <span class="pill ok">LIVE</span>
      </div>
    </div>
    <button class="primary" onclick="go('create')">＋ Nouvelle mission</button>
  `);
}

function more() {
  const items = ["🐞 Bugs détectés", "⚙ Paramètres", "◎ À propos de Methis.AI"];

  return shell(`
    <div class="screen-title"><h1>Plus</h1></div>
    ${items.map((item) => `
      <button class="card" style="width:100%;text-align:left;cursor:pointer" onclick="toast('${item}')">
        <b>${item}</b>
        <span style="float:right;color:#8490b5">›</span>
      </button>
    `).join("")}
  `);
}

async function checkHealth() {
  try {
    const response = await fetch("/api/health");
    const data = await response.json();
    const element = document.getElementById("engine-status");

    if (element) element.textContent = data.engine || "Moteur disponible";
    toast(data.status === "ready" ? "Moteur Cloudflare prêt" : "Moteur indisponible");
  } catch {
    toast("Moteur non disponible");
  }
}

async function startTest() {
  const target = document.getElementById("target")?.value?.trim();

  if (!target) {
    toast("URL Yuniko manquante");
    return;
  }

  state.screen = "running";
  state.lastRun = null;
  render();
  toast("Methis démarre le navigateur réel…");

  try {
    const response = await fetch("/api/test/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ target })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Échec du moteur");
    }

    state.lastRun = result;
    render();
  } catch (error) {
    state.lastRun = {
      id: "error",
      target,
      status: "failed",
      steps: [{
        name: "Démarrage du moteur",
        status: "failed",
        detail: String(error),
        durationMs: 0
      }],
      consoleErrors: [],
      pageErrors: []
    };
    render();
  }
}

function render() {
  const pages = {
    home,
    create,
    running,
    reports,
    accounts,
    tests: testsPage,
    more
  };

  const page = pages[state.screen] || home;
  document.getElementById("app").innerHTML = page();
}

function go(screen) {
  state.screen = screen;
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function toast(message) {
  let element = document.getElementById("toast");

  if (!element) {
    element = document.createElement("div");
    element.id = "toast";
    element.style.cssText = "position:fixed;left:16px;right:16px;bottom:92px;padding:13px 16px;background:#111a38;border:1px solid #693cff;border-radius:14px;text-align:center;z-index:50;box-shadow:0 15px 35px #0008;font-size:12px";
    document.body.appendChild(element);
  }

  element.textContent = message;
  element.style.display = "block";
  clearTimeout(window.__toast);
  window.__toast = setTimeout(() => {
    element.style.display = "none";
  }, 2200);
}

render();
