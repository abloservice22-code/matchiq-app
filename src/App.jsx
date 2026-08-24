import React, { useState, useEffect } from "react";
import {
  Radio,
  ChevronRight,
  TrendingUp,
  Target,
  BarChart3,
  Zap,
  Clock,
  ArrowLeft,
  Settings,
  Wifi,
  WifiOff,
  History,
  Send,
  Copy,
  CopyCheck,
  Gift,
  ExternalLink,
} from "lucide-react";

// ---------------------------------------------------------------------------
// DEMO DATA — used when no API key is configured (mode "Démo").
// In mode "Direct", data comes from api-football.com (see fetchLive* below).
// ---------------------------------------------------------------------------

const TELEGRAM_URL = "https://t.me/ablo233";
const PROMO_CODE = "N26P";
const BOOKMAKER_NAME = "1xBet";
const BOOKMAKER_URL = "https://reffpa.com/L?tag=d_2589193m_1573c_N26P&site=2589193&ad=1573";

const LEAGUES = {
  l1: { name: "Ligue 1", apiId: 61, country: "France" },
  pl: { name: "Premier League", apiId: 39, country: "Angleterre" },
  liga: { name: "La Liga", apiId: 140, country: "Espagne" },
};

const TEAMS = {
  psg: { name: "Paris SG", short: "PSG", league: "l1", form: ["W", "W", "D", "W", "W"], avgFor: 2.4, avgAgainst: 0.8, possession: 61 },
  marseille: { name: "Marseille", short: "OM", league: "l1", form: ["W", "L", "W", "D", "W"], avgFor: 1.9, avgAgainst: 1.1, possession: 54 },
  lyon: { name: "Lyon", short: "OL", league: "l1", form: ["D", "W", "W", "L", "D"], avgFor: 1.6, avgAgainst: 1.3, possession: 49 },
  monaco: { name: "Monaco", short: "ASM", league: "l1", form: ["W", "D", "L", "W", "W"], avgFor: 1.8, avgAgainst: 1.0, possession: 55 },
  arsenal: { name: "Arsenal", short: "ARS", league: "pl", form: ["W", "W", "W", "D", "W"], avgFor: 2.1, avgAgainst: 0.9, possession: 58 },
  liverpool: { name: "Liverpool", short: "LIV", league: "pl", form: ["W", "D", "W", "W", "L"], avgFor: 2.3, avgAgainst: 1.0, possession: 56 },
  mancity: { name: "Man City", short: "MCI", league: "pl", form: ["W", "W", "L", "W", "D"], avgFor: 2.2, avgAgainst: 0.9, possession: 63 },
  realmadrid: { name: "Real Madrid", short: "RMA", league: "liga", form: ["W", "W", "W", "L", "W"], avgFor: 2.5, avgAgainst: 0.9, possession: 57 },
  barcelona: { name: "Barcelone", short: "BAR", league: "liga", form: ["W", "D", "W", "W", "W"], avgFor: 2.6, avgAgainst: 1.1, possession: 62 },
  atletico: { name: "Atlético Madrid", short: "ATM", league: "liga", form: ["D", "W", "L", "W", "D"], avgFor: 1.7, avgAgainst: 0.8, possession: 51 },
};

const H2H = {
  "psg-marseille": [
    { date: "Fév 2026", result: "PSG 3-1 OM" },
    { date: "Oct 2025", result: "OM 1-1 PSG" },
    { date: "Mar 2025", result: "PSG 2-0 OM" },
    { date: "Nov 2024", result: "PSG 4-1 OM" },
    { date: "Avr 2024", result: "OM 0-2 PSG" },
  ],
  "realmadrid-barcelona": [
    { date: "Jan 2026", result: "Real 2-2 Barça" },
    { date: "Oct 2025", result: "Barça 3-1 Real" },
    { date: "Avr 2025", result: "Real 1-0 Barça" },
    { date: "Nov 2024", result: "Barça 2-1 Real" },
    { date: "Mai 2024", result: "Real 3-2 Barça" },
  ],
  "arsenal-liverpool": [
    { date: "Déc 2025", result: "ARS 1-1 LIV" },
    { date: "Sep 2025", result: "LIV 2-0 ARS" },
    { date: "Fév 2025", result: "ARS 3-1 LIV" },
    { date: "Oct 2024", result: "LIV 1-1 ARS" },
    { date: "Avr 2024", result: "ARS 2-2 LIV" },
  ],
};

const LIVE_MATCHES = [
  { id: "m1", league: "l1", home: "psg", away: "marseille", scoreHome: 2, scoreAway: 1, minute: 63, comp: "Ligue 1 — J7" },
  { id: "m2", league: "pl", home: "arsenal", away: "liverpool", scoreHome: 1, scoreAway: 1, minute: 41, comp: "Premier League — J6" },
];

const UPCOMING_MATCHES = [
  { id: "u1", league: "l1", home: "lyon", away: "monaco", kickoff: "Demain, 21:00", comp: "Ligue 1 — J8" },
  { id: "u2", league: "pl", home: "mancity", away: "arsenal", kickoff: "Samedi, 17:30", comp: "Premier League — J7" },
  { id: "u3", league: "liga", home: "realmadrid", away: "barcelona", kickoff: "Dimanche, 21:00", comp: "El Clásico — J8" },
  { id: "u4", league: "liga", home: "atletico", away: "barcelona", kickoff: "Mercredi, 20:00", comp: "La Liga — J9" },
];

function h2hKey(a, b) {
  return [a, b].sort().join("-");
}

function formDots(form) {
  return form.map((r, i) => <span key={i} className={`dot dot-${r.toLowerCase()}`}>{r}</span>);
}

// ---------------------------------------------------------------------------
// LIVE API CALLS (api-football.com / api-sports.io)
// Base URL: https://v3.football.api-sports.io
// Auth header: x-apisports-key: <your key>
// Docs: https://www.api-football.com/documentation-v3
// NOTE: these calls run directly from the browser with your key visible in
// the request — fine for personal/demo use, not for a public production app
// (there, proxy the calls through your own backend to hide the key).
// ---------------------------------------------------------------------------

async function apiFootballFetch(apiKey, path, params) {
  const url = new URL(`https://v3.football.api-sports.io${path}`);
  Object.entries(params || {}).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: { "x-apisports-key": apiKey },
  });
  if (!res.ok) throw new Error(`Erreur API (${res.status})`);
  const json = await res.json();
  if (json.errors && Object.keys(json.errors).length > 0) {
    throw new Error(typeof json.errors === "string" ? json.errors : JSON.stringify(json.errors));
  }
  return json.response;
}

function mapFixtureToMatch(fx) {
  return {
    id: String(fx.fixture.id),
    comp: fx.league?.name || "",
    homeName: fx.teams?.home?.name,
    awayName: fx.teams?.away?.name,
    scoreHome: fx.goals?.home,
    scoreAway: fx.goals?.away,
    minute: fx.fixture?.status?.elapsed,
    kickoff: fx.fixture?.date ? new Date(fx.fixture.date).toLocaleString("fr-FR") : "",
    homeTeamId: fx.teams?.home?.id,
    awayTeamId: fx.teams?.away?.id,
  };
}

async function fetchLiveFixtures(apiKey) {
  const data = await apiFootballFetch(apiKey, "/fixtures", { live: "all" });
  return data.map(mapFixtureToMatch);
}

async function fetchUpcomingFixtures(apiKey, leagueApiId, season) {
  const today = new Date();
  const from = today.toISOString().slice(0, 10);
  const to = new Date(today.getTime() + 7 * 86400000).toISOString().slice(0, 10);
  const data = await apiFootballFetch(apiKey, "/fixtures", {
    league: leagueApiId,
    season,
    from,
    to,
  });
  return data.map(mapFixtureToMatch);
}

async function fetchH2H(apiKey, homeTeamId, awayTeamId) {
  const data = await apiFootballFetch(apiKey, "/fixtures/headtohead", {
    h2h: `${homeTeamId}-${awayTeamId}`,
    last: 5,
  });
  return data.map((fx) => ({
    date: new Date(fx.fixture.date).toLocaleDateString("fr-FR", { month: "short", year: "numeric" }),
    result: `${fx.teams.home.name} ${fx.goals.home}-${fx.goals.away} ${fx.teams.away.name}`,
  }));
}

function TelegramBanner() {
  return (
    <a className="telegram-banner" href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer">
      <span className="telegram-icon"><Send size={16} strokeWidth={2.5} /></span>
      <span className="telegram-text">
        <span className="telegram-title">Rejoins le canal Telegram</span>
        <span className="telegram-sub">Pronostics & analyses en avant-première</span>
      </span>
      <ChevronRight size={16} className="chev" />
    </a>
  );
}

function PromoCodeCard() {
  const [copied, setCopied] = useState(false);
  const copyCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(PROMO_CODE).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div className="promo-card">
      <div className="promo-top">
        <div className="promo-left">
          <Gift size={16} strokeWidth={2.5} className="promo-gift" />
          <div>
            <div className="promo-title">Code promo {BOOKMAKER_NAME}</div>
            <div className="promo-sub">À utiliser à l'inscription</div>
          </div>
        </div>
        <button className="promo-code-btn" onClick={copyCode}>
          <span>{PROMO_CODE}</span>
          {copied ? <CopyCheck size={13} strokeWidth={2.5} /> : <Copy size={13} strokeWidth={2.5} />}
        </button>
      </div>
      <a className="bookmaker-btn" href={BOOKMAKER_URL} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} strokeWidth={2.5} />
        Ouvrir {BOOKMAKER_NAME}
      </a>
    </div>
  );
}

// ---------------------------------------------------------------------------

function ScoreBug({ match, onSelect }) {
  const home = TEAMS[match.home];
  const away = TEAMS[match.away];
  return (
    <button className="scorebug" onClick={() => onSelect(match)}>
      <div className="scorebug-top">
        <span className="live-pill"><span className="pulse-dot" />DIRECT</span>
        <span className="comp-label">{match.comp}</span>
      </div>
      <div className="scorebug-row">
        <span className="team-name">{home.short}</span>
        <span className="score">{match.scoreHome}</span>
      </div>
      <div className="scorebug-row">
        <span className="team-name">{away.short}</span>
        <span className="score">{match.scoreAway}</span>
      </div>
      <div className="scorebug-foot">
        <Clock size={11} strokeWidth={2.5} />
        <span>{match.minute}&apos;</span>
      </div>
    </button>
  );
}

function UpcomingRow({ match, onSelect }) {
  const home = TEAMS[match.home];
  const away = TEAMS[match.away];
  return (
    <button className="upcoming-row" onClick={() => onSelect(match)}>
      <div className="upcoming-teams">
        <span className="team-name">{home.short}</span>
        <span className="vs">vs</span>
        <span className="team-name">{away.short}</span>
      </div>
      <ChevronRight size={16} className="chev" />
    </button>
  );
}

function ConfidenceTape({ home, draw, away, homeLabel, awayLabel }) {
  return (
    <div className="tape">
      <div className="tape-bar">
        <div className="tape-seg tape-home" style={{ width: `${home}%` }} />
        <div className="tape-seg tape-draw" style={{ width: `${draw}%` }} />
        <div className="tape-seg tape-away" style={{ width: `${away}%` }} />
      </div>
      <div className="tape-ticks">
        <div className="tape-tick-label">
          <span className="tape-pct">{home}%</span>
          <span className="tape-name">{homeLabel}</span>
        </div>
        <div className="tape-tick-label">
          <span className="tape-pct">{draw}%</span>
          <span className="tape-name">Nul</span>
        </div>
        <div className="tape-tick-label">
          <span className="tape-pct">{away}%</span>
          <span className="tape-name">{awayLabel}</span>
        </div>
      </div>
    </div>
  );
}

function StatCompare({ label, homeVal, awayVal }) {
  const max = Math.max(homeVal, awayVal, 1);
  return (
    <div className="stat-compare">
      <div className="stat-compare-vals">
        <span className="stat-val">{homeVal}</span>
        <span className="stat-label">{label}</span>
        <span className="stat-val">{awayVal}</span>
      </div>
      <div className="stat-compare-bars">
        <div className="stat-bar-track stat-bar-track-left">
          <div className="stat-bar-fill stat-bar-home" style={{ width: `${(homeVal / max) * 100}%` }} />
        </div>
        <div className="stat-bar-track stat-bar-track-right">
          <div className="stat-bar-fill stat-bar-away" style={{ width: `${(awayVal / max) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}

function MatchDetail({ match, onBack }) {
  const home = TEAMS[match.home];
  const away = TEAMS[match.away];
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const h2h = H2H[h2hKey(match.home, match.away)] || null;

  const runPrediction = async () => {
    setLoading(true);
    setError(null);
    try {
      const h2hSummary = h2h ? h2h.map((m) => m.result).join(" ; ") : "aucun historique disponible";
      const prompt = `Tu es un analyste sportif spécialisé en football. Analyse ce match à venir et donne un pronostic basé UNIQUEMENT sur les statistiques fournies.

Équipe domicile: ${home.name}
- Forme (5 derniers matchs, plus récent en dernier): ${home.form.join(", ")}
- Buts marqués/match: ${home.avgFor}
- Buts encaissés/match: ${home.avgAgainst}
- Possession moyenne: ${home.possession}%

Équipe extérieur: ${away.name}
- Forme (5 derniers matchs, plus récent en dernier): ${away.form.join(", ")}
- Buts marqués/match: ${away.avgFor}
- Buts encaissés/match: ${away.avgAgainst}
- Possession moyenne: ${away.possession}%

Historique des confrontations directes: ${h2hSummary}

Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans texte autour, au format exact:
{"homeWinPct": <entier 0-100>, "drawPct": <entier 0-100>, "awayWinPct": <entier 0-100>, "analysis": "<2-3 phrases d'analyse en français, ton factuel de commentateur sportif, mentionne l'historique si pertinent>", "scoreline": "<score le plus probable, ex 2-1>"}
Les trois pourcentages doivent totaliser 100.`;

      // En production, on passe par notre propre fonction serveur (/api/predict)
      // qui détient la clé Anthropic — jamais exposée au navigateur.
      const response = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!response.ok) throw new Error(`Erreur serveur (${response.status})`);
      const data = await response.json();
      const text = data.content.map((b) => b.text || "").join("").replace(/```json|```/g, "").trim();
      setPrediction(JSON.parse(text));
    } catch (e) {
      setError("Impossible de générer le pronostic pour le moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="detail">
      <button className="back-btn" onClick={onBack}>
        <ArrowLeft size={16} strokeWidth={2.5} />
        Retour
      </button>

      <div className="detail-header">
        <span className="comp-label">{match.comp}</span>
        <h2 className="detail-title">
          {home.name} <span className="vs-big">—</span> {away.name}
        </h2>
        {"kickoff" in match ? (
          <span className="kickoff-tag">{match.kickoff}</span>
        ) : (
          <span className="live-pill"><span className="pulse-dot" />EN DIRECT · {match.minute}&apos;</span>
        )}
      </div>

      <section className="panel">
        <h3 className="panel-title"><BarChart3 size={14} strokeWidth={2.5} /> Comparatif statistique</h3>
        <StatCompare label="Forme (pts/5)" homeVal={home.form.filter((r) => r === "W").length * 3 + home.form.filter((r) => r === "D").length} awayVal={away.form.filter((r) => r === "W").length * 3 + away.form.filter((r) => r === "D").length} />
        <StatCompare label="Buts marqués / match" homeVal={home.avgFor} awayVal={away.avgFor} />
        <StatCompare label="Buts encaissés / match" homeVal={home.avgAgainst} awayVal={away.avgAgainst} />
        <StatCompare label="Possession moy. %" homeVal={home.possession} awayVal={away.possession} />
        <div className="form-row">
          <div className="form-team">
            <span className="form-team-name">{home.short}</span>
            <div className="form-dots">{formDots(home.form)}</div>
          </div>
          <div className="form-team">
            <span className="form-team-name">{away.short}</span>
            <div className="form-dots">{formDots(away.form)}</div>
          </div>
        </div>
      </section>

      {h2h && (
        <section className="panel">
          <h3 className="panel-title"><History size={14} strokeWidth={2.5} /> Confrontations directes</h3>
          <div className="h2h-list">
            {h2h.map((m, i) => (
              <div key={i} className="h2h-row">
                <span className="h2h-date">{m.date}</span>
                <span className="h2h-result">{m.result}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="panel">
        <h3 className="panel-title"><Target size={14} strokeWidth={2.5} /> Pronostic IA</h3>
        {!prediction && !loading && (
          <button className="predict-btn" onClick={runPrediction}>
            <Zap size={15} strokeWidth={2.5} />
            Générer le pronostic
          </button>
        )}
        {loading && <div className="loading-state">Analyse des statistiques en cours…</div>}
        {error && <div className="error-state">{error}</div>}
        {prediction && (
          <><ConfidenceTape home={prediction.homeWinPct} draw={prediction.drawPct} away={prediction.awayWinPct} homeLabel={home.short} awayLabel={away.short} />
            <div className="scoreline-tag">Score probable&nbsp;: <strong>{prediction.scoreline}</strong></div>
            <p className="analysis-text">{prediction.analysis}</p>
            <button className="predict-btn predict-btn-ghost" onClick={runPrediction}>Régénérer</button>
          </>
        )}
      </section>

      <PromoCodeCard />
      <TelegramBanner />

      <p className="disclaimer">
        Pronostic généré à partir de statistiques {H2H[h2hKey(match.home, match.away)] ? "et d'un historique " : ""}d'exemple, à titre indicatif uniquement. Ne constitue pas un conseil de pari.
      </p>
    </div>
  );
}

function SettingsPanel({ apiKey, setApiKey, mode, setMode, onClose }) {
  const [draft, setDraft] = useState(apiKey);
  return (
    <div className="detail">
      <button className="back-btn" onClick={onClose}>
        <ArrowLeft size={16} strokeWidth={2.5} />
        Retour
      </button>
      <h2 className="detail-title" style={{ marginBottom: 16 }}>Réglages</h2>

      <section className="panel">
        <h3 className="panel-title"><Wifi size={14} strokeWidth={2.5} /> Source de données</h3>
        <p className="settings-copy">
          Colle une clé API-Football (api-football.com / api-sports.io, offre gratuite disponible) pour passer en mode direct.
        </p>
        <input
          className="key-input"
          type="text"
          placeholder="Ta clé API-Football"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button
          className="predict-btn"
          style={{ marginTop: 10 }}
          onClick={() => {
            setApiKey(draft.trim());
            setMode(draft.trim() ? "live" : "demo");
          }}
        >
          Enregistrer
        </button>
        <div className="mode-status">
          {mode === "live" ? (
            <span className="mode-tag mode-live"><Wifi size={12} /> Mode Direct actif</span>
          ) : (
            <span className="mode-tag mode-demo"><WifiOff size={12} /> Mode Démo (données d'exemple)</span>
          )}
        </div>
      </section>

      <section className="panel">
        <h3 className="panel-title">Comment obtenir une clé</h3>
        <ol className="how-to-list">
          <li>Crée un compte gratuit sur api-football.com.</li>
          <li>Récupère ta clé dans le tableau de bord (offre gratuite ≈ 100 requêtes/jour).</li>
          <li>Colle-la ci-dessus — elle reste uniquement dans cette session, en mémoire.</li>
        </ol>
        <p className="disclaimer" style={{ marginTop: 10 }}>
          La clé est envoyée directement depuis ton navigateur : pratique pour un usage perso, mais à ne pas exposer publiquement. Pour une appli en production, fais transiter ces appels par ton propre serveur.
        </p>
      </section>
    </div>
  );
}

export default function MatchIQ() {
  const [tab, setTab] = useState("live");
  const [selected, setSelected] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [mode, setMode] = useState("demo");

  const [liveData, setLiveData] = useState(null);
  const [liveError, setLiveError] = useState(null);
  const [liveLoading, setLiveLoading] = useState(false);

  useEffect(() => {
    if (mode !== "live" || !apiKey) return;
    let cancelled = false;
    setLiveLoading(true);
    setLiveError(null);
    fetchLiveFixtures(apiKey)
      .then((matches) => { if (!cancelled) setLiveData(matches); })
      .catch((e) => { if (!cancelled) setLiveError(e.message); })
      .finally(() => { if (!cancelled) setLiveLoading(false); });
    return () => { cancelled = true; };
  }, [mode, apiKey, tab]);

  const displayLive = mode === "live" ? (liveData || []) : LIVE_MATCHES;

  return (
    <div className="app-shell">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;600&display=swap');

        :root {
          --bg: #0B0E14;
          --surface: #141A24;
          --surface-2: #1B2230;
          --line: #262E3D;
          --text: #E8EAED;
          --text-muted: #8B93A7;
          --amber: #FFB020;
          --teal: #2DD4BF;
          --win: #34D399;
          --loss: #F87171;
          --draw: #94A3B8;
        }
        * { box-sizing: border-box; }
        .app-shell { background: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; width: 100%; max-width: 480px; margin: 0 auto; min-height: 100vh; padding: 0 0 24px 0; }
        .top-bar { display: flex; align-items: center; justify-content: space-between; padding: 18px 18px 14px 18px; border-bottom: 1px solid var(--line); }
        .brand { font-family: 'Oswald', sans-serif; font-weight: 700; font-size: 20px; letter-spacing: 0.5px; display: flex; align-items: center; gap: 8px; }
        .brand-mark { width: 8px; height: 8px; border-radius: 2px; background: var(--amber); transform: rotate(45deg); }
        .top-right { display: flex; align-items: center; gap: 10px; }
        .brand-sub { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--text-muted); letter-spacing: 1px; }
        .settings-btn { background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; }
        .tabs { display: flex; gap: 4px; padding: 12px 18px 0 18px; }
        .tab-btn { flex: 1; background: transparent; border: none; color: var(--text-muted); font-family: 'Inter', sans-serif; font-weight: 600; font-size: 13px; padding: 10px 0; border-bottom: 2px solid transparent; cursor: pointer; }
        .tab-btn.active { color: var(--text); border-bottom: 2px solid var(--amber); }
        .section { padding: 18px; }
        .section-title { font-family: 'Oswald', sans-serif; font-size: 13px; font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase; color: var(--text-muted); margin: 4px 0 12px 0; display: flex; align-items: center; justify-content: space-between; gap: 6px; }
        .section-title-left { display: flex; align-items: center; gap: 6px; }
        .league-group { margin-bottom: 18px; }
        .league-heading { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--teal); letter-spacing: 1px; margin: 0 0 8px 4px; text-transform: uppercase; }
        .live-grid { display: flex; flex-direction: column; gap: 10px; }
        .scorebug { background: linear-gradient(180deg, var(--surface-2) 0%, var(--surface) 100%); border: 1px solid var(--line); border-radius: 10px; padding: 12px 14px; text-align: left; cursor: pointer; color: var(--text); width: 100%; font-family: 'Inter', sans-serif; }
        .scorebug-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .live-pill { display: inline-flex; align-items: center; gap: 5px; background: rgba(248,113,113,0.12); color: var(--loss); font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 600; letter-spacing: 0.5px; padding: 3px 7px; border-radius: 20px; }
        .pulse-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--loss); animation: pulse 1.4s infinite; }
        @keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.3); } 100% { opacity: 1; transform: scale(1); } }
        .comp-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--text-muted); }
        .scorebug-row { display: flex; justify-content: space-between; align-items: baseline; padding: 2px 0; }
        .team-name { font-family: 'Oswald', sans-serif; font-weight: 600; font-size: 15px; }
        .score { font-family: 'JetBrains Mono', monospace; font-weight: 600; font-size: 17px; color: var(--amber); }
        .scorebug-foot { display: flex; align-items: center; gap: 4px; margin-top: 8px; color: var(--text-muted); font-family: 'JetBrains Mono', monospace; font-size: 11px; }
        .upcoming-list { display: flex; flex-direction: column; gap: 8px; }
        .upcoming-row { display: flex; align-items: center; justify-content: space-between; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 12px 14px; cursor: pointer; color: var(--text); width: 100%; text-align: left; }
        .upcoming-teams { display: flex; align-items: center; gap: 8px; font-family: 'Oswald', sans-serif; font-weight: 600; font-size: 14px; }
        .vs { color: var(--text-muted); font-size: 11px; font-weight: 400; font-family: 'Inter', sans-serif; }
        .chev { color: var(--text-muted); flex-shrink: 0; }
        .detail { padding: 18px; }
        .back-btn { display: flex; align-items: center; gap: 6px; background: transparent; border: none; color: var(--text-muted); font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; padding: 0 0 16px 0; }
        .detail-header { margin-bottom: 18px; }
        .detail-title { font-family: 'Oswald', sans-serif; font-size: 20px; font-weight: 600; margin: 6px 0 10px 0; }
        .vs-big { color: var(--amber); }
        .kickoff-tag { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--teal); background: rgba(45,212,191,0.1); padding: 3px 8px; border-radius: 20px; }
        .panel { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 16px; margin-bottom: 14px; }
        .panel-title { font-family: 'Oswald', sans-serif; font-size: 12px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: var(--text-muted); display: flex; align-items: center; gap: 6px; margin: 0 0 14px 0; }
        .stat-compare { margin-bottom: 14px; }
        .stat-compare-vals { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
        .stat-val { font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 600; width: 40px; }
        .stat-val:last-child { text-align: right; }
        .stat-label { font-size: 11px; color: var(--text-muted); flex: 1; text-align: center; }
        .stat-compare-bars { display: flex; gap: 2px; height: 5px; }
        .stat-bar-track { flex: 1; background: var(--line); border-radius: 4px; overflow: hidden; display: flex; }
        .stat-bar-track-left { justify-content: flex-end; }
        .stat-bar-fill { height: 100%; }
        .stat-bar-home { background: var(--amber); }
        .stat-bar-away { background: var(--teal); }
        .form-row { display: flex; justify-content: space-between; margin-top: 10px; padding-top: 12px; border-top: 1px solid var(--line); }
        .form-team { display: flex; flex-direction: column; gap: 6px; }
        .form-team:last-child { align-items: flex-end; }
        .form-team-name { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--text-muted); }
        .form-dots { display: flex; gap: 3px; }
        .dot { width: 18px; height: 18px; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
        .dot-w { background: rgba(52,211,153,0.18); color: var(--win); }
        .dot-d { background: rgba(148,163,184,0.18); color: var(--draw); }
        .dot-l { background: rgba(248,113,113,0.18); color: var(--loss); }
        .h2h-list { display: flex; flex-direction: column; gap: 8px; }
        .h2h-row { display: flex; justify-content: space-between; align-items: center; font-size: 12px; padding: 6px 0; border-bottom: 1px solid var(--line); }
        .h2h-row:last-child { border-bottom: none; padding-bottom: 0; }
        .h2h-date { font-family: 'JetBrains Mono', monospace; color: var(--text-muted); font-size: 10px; }
        .h2h-result { font-weight: 600; }
        .predict-btn { width: 100%; background: var(--amber); color: #171008; border: none; border-radius: 8px; padding: 12px; font-family: 'Inter', sans-serif; font-weight: 600; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 7px; cursor: pointer; }
        .predict-btn-ghost { background: transparent; border: 1px solid var(--line); color: var(--text-muted); margin-top: 12px; }
        .loading-state, .error-state { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--text-muted); padding: 10px 0; }
        .error-state { color: var(--loss); }
        .tape { margin-bottom: 12px; }
        .tape-bar { display: flex; height: 10px; border-radius: 6px; overflow: hidden; margin-bottom: 8px; }
        .tape-home { background: var(--amber); }
        .tape-draw { background: var(--draw); }
.tape-away { background: var(--teal); }
        .tape-ticks { display: flex; justify-content: space-between; }
        .tape-tick-label { display: flex; flex-direction: column; align-items: center; }
        .tape-tick-label:first-child { align-items: flex-start; }
        .tape-tick-label:last-child { align-items: flex-end; }
        .tape-pct { font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 15px; }
        .tape-name { font-size: 10px; color: var(--text-muted); }
        .scoreline-tag { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--text-muted); margin-bottom: 10px; }
        .scoreline-tag strong { color: var(--text); }
        .analysis-text { font-size: 13px; line-height: 1.6; color: var(--text); margin: 0; }
        .disclaimer { font-size: 11px; color: var(--text-muted); line-height: 1.5; padding: 0 4px; }
        .settings-copy { font-size: 12px; color: var(--text-muted); line-height: 1.5; margin: 0 0 12px 0; }
        .key-input { width: 100%; background: var(--surface-2); border: 1px solid var(--line); color: var(--text); border-radius: 8px; padding: 11px 12px; font-family: 'JetBrains Mono', monospace; font-size: 12px; }
        .key-input:focus { outline: none; border-color: var(--amber); }
        .mode-status { margin-top: 12px; }
        .mode-tag { display: inline-flex; align-items: center; gap: 6px; font-family: 'JetBrains Mono', monospace; font-size: 11px; padding: 5px 10px; border-radius: 20px; }
        .mode-live { background: rgba(45,212,191,0.12); color: var(--teal); }
        .mode-demo { background: rgba(139,147,167,0.12); color: var(--text-muted); }
        .how-to-list { margin: 0; padding-left: 18px; font-size: 12px; line-height: 1.8; color: var(--text); }
        .empty-state { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--text-muted); padding: 20px 0; text-align: center; }

        .home-promos { display: flex; flex-direction: column; gap: 10px; padding: 14px 18px 0 18px; }
        .telegram-banner { display: flex; align-items: center; gap: 10px; background: linear-gradient(90deg, rgba(45,212,191,0.12), rgba(45,212,191,0.04)); border: 1px solid rgba(45,212,191,0.25); border-radius: 10px; padding: 11px 12px; text-decoration: none; color: var(--text); }
        .telegram-icon { width: 30px; height: 30px; border-radius: 50%; background: var(--teal); color: #0B0E14; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .telegram-text { display: flex; flex-direction: column; flex: 1; }
        .telegram-title { font-family: 'Inter', sans-serif; font-weight: 600; font-size: 13px; }
        .telegram-sub { font-size: 11px; color: var(--text-muted); }
        .promo-card { display: flex; flex-direction: column; gap: 10px; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 11px 12px; }
        .promo-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .promo-left { display: flex; align-items: center; gap: 10px; }
        .promo-gift { color: var(--amber); flex-shrink: 0; }
        .promo-title { font-family: 'Inter', sans-serif; font-weight: 600; font-size: 13px; }
        .promo-sub { font-size: 11px; color: var(--text-muted); }
        .promo-code-btn { display: flex; align-items: center; gap: 6px; background: var(--amber); color: #171008; border: none; border-radius: 8px; padding: 8px 12px; font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 13px; letter-spacing: 0.5px; cursor: pointer; flex-shrink: 0; }
        .bookmaker-btn { display: flex; align-items: center; justify-content: center; gap: 7px; background: var(--surface-2); border: 1px solid var(--line); color: var(--text); border-radius: 8px; padding: 10px; text-decoration: none; font-family: 'Inter', sans-serif; font-weight: 600; font-size: 13px; }
      `}</style>

      <div className="top-bar">
        <div className="brand"><span className="brand-mark" />MATCHIQ</div>
        <div className="top-right">
          {mode === "live" ? (
            <span className="mode-tag mode-live"><Wifi size={11} /> Direct</span>
          ) : (
            <span className="mode-tag mode-demo"><WifiOff size={11} /> Démo</span>
          )}
          <button className="settings-btn" onClick={() => setShowSettings(true)}>
            <Settings size={18} />
          </button>
        </div>
      </div>

      {showSettings ? (
        <SettingsPanel apiKey={apiKey} setApiKey={setApiKey} mode={mode} setMode={setMode} onClose={() => setShowSettings(false)} />
      ) : selected ? (
        <MatchDetail match={selected} onBack={() => setSelected(null)} />
      ) : (
        <>
          <div className="tabs">
            <button className={`tab-btn ${tab === "live" ? "active" : ""}`} onClick={() => setTab("live")}>En direct</button>
            <button className={`tab-btn ${tab === "upcoming" ? "active" : ""}`} onClick={() => setTab("upcoming")}>À venir</button>
          </div>

          <div className="home-promos">
            <TelegramBanner />
            <PromoCodeCard />
          </div>

          {tab === "live" && (
            <div className="section">
              <div className="section-title">
                <span className="section-title-left"><Radio size={13} strokeWidth={2.5} /> Matchs en cours</span>
              </div>
              {mode === "live" && liveLoading && <div className="empty-state">Chargement des scores en direct…</div>}
              {mode === "live" && liveError && <div className="error-state">Erreur : {liveError}</div>}
              {mode === "demo" && (
                <div className="live-grid">
                  {LIVE_MATCHES.map((m) => <ScoreBug key={m.id} match={m} onSelect={setSelected} />)}
                </div>
              )}
              {mode === "live" && !liveLoading && !liveError && liveData && liveData.length === 0 && (
                <div className="empty-state">Aucun match en direct actuellement.</div>
              )}
            </div>
          )}

          {tab === "upcoming" && (
            <div className="section">
              <div className="section-title">
                <span className="section-title-left"><TrendingUp size={13} strokeWidth={2.5} /> Prochains matchs</span>
              </div>
              {Object.entries(LEAGUES).map(([lk, league]) => {
                const matches = UPCOMING_MATCHES.filter((m) => m.league === lk);
                if (matches.length === 0) return null;
                return (
                  <div className="league-group" key={lk}>
                    <div className="league-heading">{league.name}</div>
                    <div className="upcoming-list">
                      {matches.map((m) => <UpcomingRow key={m.id} match={m} onSelect={setSelected} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
