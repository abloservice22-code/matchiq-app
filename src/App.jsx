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
      <a className="bookmaker-btn" href={BOOKMAKER_URL} target="_blank" rel="noopener noreferrer">
