const logo="./FB_IMG_17913227239346345.jpg";
const state={screen:"home",running:false,started:false};

const tests=[
 ["Inscription / Connexion","Création et session du compte de test"],
 ["Navigation principale","Accueil, recherche, profil et notifications"],
 ["Publication","Création et vérification d'un post"],
 ["Interactions","Like, commentaire, partage et sauvegarde"],
 ["Messages","Conversation et envoi d'un message"],
 ["Stories","Création, vue et interaction"],
 ["Recherche / Suivi","Recherche d'utilisateur et suivi"],
 ["Déconnexion / Reconnexion","Session et retour sécurisé"]
];

function nav(label,icon,screen){return '<button class="nav '+(state.screen===screen?'active':'')+'" onclick="go(\''+screen+'\')"><b>'+icon+'</b>'+label+'</button>'}
function shell(content){
 return '<div class="app"><header class="topbar"><div class="brand"><img src="'+logo+'"><div><strong>Methis<span style="color:#c73cff">.AI</span></strong><span>Autonomous Testing Agent</span></div></div><button class="icon-btn" onclick="toast(\'Notifications prêtes\')">♧</button></header><main>'+content+'</main><nav class="bottom">'+nav("Accueil","⌂","home")+nav("Tests","◉","tests")+nav("Rapports","▣","reports")+nav("Comptes","♙","accounts")+nav("Plus","☰","more")+'</nav></div>'
}
function home(){
return shell('<section class="hero"><div class="eyebrow">Agent Methis • En ligne</div><h1>Prêt à tester.</h1><p>Methis observe, navigue et vérifie ton application comme un vrai utilisateur.</p><button class="primary" onclick="go(\'create\')">▶ Lancer un test</button></section>'+
'<div class="section-title"><h2>Vue d’ensemble</h2><button onclick="go(\'reports\')">Voir tout</button></div>'+
'<div class="stats"><div class="stat"><b>24</b><small>Tests totaux</small></div><div class="stat"><b class="ok">22</b><small>Réussis</small></div><div class="stat"><b class="bad">2</b><small>Échecs</small></div></div>'+
'<div class="section-title"><h2>Dernière session</h2></div>'+
'<article class="card"><div class="run"><img class="run-logo" src="'+logo+'"><div class="run-info"><b>Yuniko · Test complet</b><small>Aujourd’hui · 14:32</small></div><span class="pill ok">Réussi</span></div><div class="progress"><i></i></div></article>'+
'<article class="card"><div class="run"><span style="font-size:28px">🤖</span><div class="run-info"><b>Methis est prêt</b><small>Choisis une cible pour commencer.</small></div></div></article>');
}
function create(){
return shell('<div class="screen-title"><button class="back" onclick="go(\'home\')">‹</button><h1>Créer un test</h1></div>'+
'<div class="field"><label>APPLICATION À TESTER</label><input id="target" value="https://yuniko.app" placeholder="https://..."></div>'+
'<div class="section-title"><h2>Scénario</h2><span style="color:#8794bb;font-size:11px">8 étapes</span></div>'+
'<div>'+tests.map((t,i)=>'<div class="check '+(i<3?'done':'')+'"><span class="num">'+(i+1)+'</span><div><b>'+t[0]+'</b><small>'+t[1]+'</small></div><span class="mark">'+(i<3?'✓':'○')+'</span></div>').join("")+'</div>'+
'<button class="primary" style="margin-top:16px" onclick="startTest()">Démarrer le test</button>');
}
function running(){
return shell('<div class="screen-title"><button class="back" onclick="go(\'tests\')">‹</button><h1>Test en cours</h1><span class="pill ok" style="margin-left:auto">● En cours</span></div>'+
'<div class="card"><b>Yuniko · Test complet</b><small style="display:block;color:#38b8ff;margin-top:5px">https://yuniko.app</small>'+
'<div style="margin-top:16px">'+tests.map((t,i)=>'<div class="check '+(i<3?'done':'')+'"><span class="num">'+(i+1)+'</span><div><b>'+t[0]+'</b></div><span class="mark">'+(i<3?'✓':'○')+'</span></div>').join("")+'</div>'+
'<div class="live"><div class="browserbar"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="url">https://yuniko.app</span></div><div class="yuniko"><div class="yuniko-head">Yuniko</div><div class="fake-post"><b>Quoi de neuf ?</b><div class="fake-photo"></div></div></div></div>'+
'<div class="section-title"><h2>Journal des actions</h2></div><div class="card log">'+
['Ouverture du site Yuniko','Création du compte de test','Connexion réussie','Accès au feed','Publication du post'].map((x,i)=>'<div class="log-row"><span>14:'+(32+i*2)+'</span><b>'+x+'</b><i>✓</i></div>').join("")+'</div></div>');
}
function reports(){
return shell('<div class="screen-title"><h1>Rapports</h1></div>'+
'<div class="card" style="text-align:center"><div class="result-circle"><strong>92%</strong><small>Réussi</small></div><b>Yuniko · Test complet</b><p style="color:var(--muted);font-size:12px">24 tests · 22 réussis · 2 échecs</p></div>'+
['Yuniko · Test complet','Yuniko · Messages','Yuniko · Stories','Yuniko · Recherche'].map((x,i)=>'<article class="card"><div class="run"><img class="run-logo" src="'+logo+'"><div class="run-info"><b>'+x+'</b><small>'+(['Aujourd’hui','Hier','Hier','06/10'])[i]+'</small></div><span class="pill '+(i===2?'fail':'ok')+'">'+(i===2?'Échec':'Réussi')+'</span></div><div class="progress"><i style="width:'+(i===2?67:92-i*4)+'%"></i></div></article>').join(""));
}
function accounts(){
return shell('<div class="screen-title"><h1>Comptes de test</h1></div><div class="card">'+
['methis_test_01','methis_test_02','methis_test_03'].map(x=>'<div class="list-item"><img class="avatar" src="'+logo+'"><main><b>'+x+'</b><small>Actif · Yuniko</small></main><span>●</span></div>').join("")+
'<button class="primary" style="margin-top:15px" onclick="toast(\'Création automatique bientôt disponible\')">＋ Nouveau compte</button></div>'+
'<div class="card"><b>Isolation des comptes</b><p style="color:var(--muted);font-size:12px;line-height:1.5">Methis gardera les comptes de test séparés des utilisateurs réels et pourra nettoyer les données après une session.</p></div>');
}
function testsPage(){
return shell('<div class="screen-title"><h1>Tests</h1></div><div class="card"><div class="run"><span style="font-size:28px">🧪</span><div class="run-info"><b>Yuniko · Test complet</b><small>8 étapes · dernière exécution aujourd’hui</small></div><span class="pill ok">92%</span></div></div><button class="primary" onclick="go(\'create\')">＋ Nouvelle mission</button>');
}
function more(){return shell('<div class="screen-title"><h1>Plus</h1></div>'+['🐞 Bugs détectés','⚙ Paramètres','◎ À propos de Methis.AI'].map(x=>'<button class="card" style="width:100%;text-align:left;cursor:pointer" onclick="toast(\''+x+'\')"><b>'+x+'</b><span style="float:right;color:#8490b5">›</span></button>').join(""));}

function render(){
 const pages={home,create,running,reports,accounts,tests:testsPage,more};
 document.getElementById("app").innerHTML=pages[state.screen]?pages[state.screen]():home();
}
function go(screen){state.screen=screen;render();window.scrollTo({top:0,behavior:"smooth"})}
function startTest(){state.running=true;state.screen="running";render();toast("Mission lancée");}
function toast(message){let t=document.getElementById("toast");if(!t){t=document.createElement("div");t.id="toast";t.style.cssText="position:fixed;left:16px;right:16px;bottom:92px;padding:13px 16px;background:#111a38;border:1px solid #693cff;border-radius:14px;text-align:center;z-index:50;box-shadow:0 15px 35px #0008;font-size:12px";document.body.appendChild(t)}t.textContent=message;t.style.display="block";clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.style.display="none",2200)}
render();