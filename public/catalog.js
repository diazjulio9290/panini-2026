/* ============================================================================
   catalog.js  —  THE EDITABLE STICKER CHECKLIST
   ----------------------------------------------------------------------------
   This is the ONE place to update when the real Panini 2026 checklist is out.
   Nothing here is stored in the database — the database only stores YOUR
   quantities. So you can change names/teams here anytime without losing counts.

   Total = 9 (Intro) + 11 (Museum) + 48 teams x 20 = 980 stickers.

   To update a team later: change its name, set confirmed: true once it qualifies,
   or replace the whole TEAMS list. Codes are generated automatically (ARG01..ARG20).
   ========================================================================== */

// The 48 national-team slots. confirmed:true removes the "Placeholder" badge.
// Updated to the official qualified teams: 3 hosts + 45 qualified, all confirmed.
// (Hosts first, then alphabetical by name.)
const TEAMS = [
  // Host nations
  { code: 'USA', name: 'United States', flag: '🇺🇸', confirmed: true },
  { code: 'MEX', name: 'Mexico', flag: '🇲🇽', confirmed: true },
  { code: 'CAN', name: 'Canada', flag: '🇨🇦', confirmed: true },
  // Qualified teams (alphabetical)
  { code: 'ALG', name: 'Algeria', flag: '🇩🇿', confirmed: true },
  { code: 'ARG', name: 'Argentina', flag: '🇦🇷', confirmed: true },
  { code: 'AUS', name: 'Australia', flag: '🇦🇺', confirmed: true },
  { code: 'AUT', name: 'Austria', flag: '🇦🇹', confirmed: true },
  { code: 'BEL', name: 'Belgium', flag: '🇧🇪', confirmed: true },
  { code: 'BIH', name: 'Bosnia and Herzegovina', flag: '🇧🇦', confirmed: true },
  { code: 'BRA', name: 'Brazil', flag: '🇧🇷', confirmed: true },
  { code: 'CPV', name: 'Cabo Verde', flag: '🇨🇻', confirmed: true },
  { code: 'COL', name: 'Colombia', flag: '🇨🇴', confirmed: true },
  { code: 'CIV', name: "Côte d'Ivoire", flag: '🇨🇮', confirmed: true },
  { code: 'CRO', name: 'Croatia', flag: '🇭🇷', confirmed: true },
  { code: 'CUW', name: 'Curaçao', flag: '🇨🇼', confirmed: true },
  { code: 'CZE', name: 'Czechia', flag: '🇨🇿', confirmed: true },
  { code: 'COD', name: 'DR Congo', flag: '🇨🇩', confirmed: true },
  { code: 'ECU', name: 'Ecuador', flag: '🇪🇨', confirmed: true },
  { code: 'EGY', name: 'Egypt', flag: '🇪🇬', confirmed: true },
  { code: 'ENG', name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', confirmed: true },
  { code: 'FRA', name: 'France', flag: '🇫🇷', confirmed: true },
  { code: 'GER', name: 'Germany', flag: '🇩🇪', confirmed: true },
  { code: 'GHA', name: 'Ghana', flag: '🇬🇭', confirmed: true },
  { code: 'HAI', name: 'Haiti', flag: '🇭🇹', confirmed: true },
  { code: 'IRN', name: 'Iran', flag: '🇮🇷', confirmed: true },
  { code: 'IRQ', name: 'Iraq', flag: '🇮🇶', confirmed: true },
  { code: 'JPN', name: 'Japan', flag: '🇯🇵', confirmed: true },
  { code: 'JOR', name: 'Jordan', flag: '🇯🇴', confirmed: true },
  { code: 'KOR', name: 'South Korea', flag: '🇰🇷', confirmed: true },
  { code: 'MAR', name: 'Morocco', flag: '🇲🇦', confirmed: true },
  { code: 'NED', name: 'Netherlands', flag: '🇳🇱', confirmed: true },
  { code: 'NZL', name: 'New Zealand', flag: '🇳🇿', confirmed: true },
  { code: 'NOR', name: 'Norway', flag: '🇳🇴', confirmed: true },
  { code: 'PAN', name: 'Panama', flag: '🇵🇦', confirmed: true },
  { code: 'PAR', name: 'Paraguay', flag: '🇵🇾', confirmed: true },
  { code: 'POR', name: 'Portugal', flag: '🇵🇹', confirmed: true },
  { code: 'QAT', name: 'Qatar', flag: '🇶🇦', confirmed: true },
  { code: 'KSA', name: 'Saudi Arabia', flag: '🇸🇦', confirmed: true },
  { code: 'SCO', name: 'Scotland', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', confirmed: true },
  { code: 'SEN', name: 'Senegal', flag: '🇸🇳', confirmed: true },
  { code: 'RSA', name: 'South Africa', flag: '🇿🇦', confirmed: true },
  { code: 'ESP', name: 'Spain', flag: '🇪🇸', confirmed: true },
  { code: 'SWE', name: 'Sweden', flag: '🇸🇪', confirmed: true },
  { code: 'SUI', name: 'Switzerland', flag: '🇨🇭', confirmed: true },
  { code: 'TUN', name: 'Tunisia', flag: '🇹🇳', confirmed: true },
  { code: 'TUR', name: 'Türkiye', flag: '🇹🇷', confirmed: true },
  { code: 'URU', name: 'Uruguay', flag: '🇺🇾', confirmed: true },
  { code: 'UZB', name: 'Uzbekistan', flag: '🇺🇿', confirmed: true },
];

// ISO country codes used to load real flag images (flagcdn.com).
// These render as proper flags on EVERY device (Windows included), unlike
// emoji flags which Windows shows as plain letters.
const ISO = {
  USA: 'us', MEX: 'mx', CAN: 'ca',
  ALG: 'dz', ARG: 'ar', AUS: 'au', AUT: 'at', BEL: 'be', BIH: 'ba', BRA: 'br',
  CPV: 'cv', COL: 'co', CIV: 'ci', CRO: 'hr', CUW: 'cw', CZE: 'cz', COD: 'cd',
  ECU: 'ec', EGY: 'eg', ENG: 'gb-eng', FRA: 'fr', GER: 'de', GHA: 'gh', HAI: 'ht',
  IRN: 'ir', IRQ: 'iq', JPN: 'jp', JOR: 'jo', KOR: 'kr', MAR: 'ma', NED: 'nl',
  NZL: 'nz', NOR: 'no', PAN: 'pa', PAR: 'py', POR: 'pt', QAT: 'qa', KSA: 'sa',
  SCO: 'gb-sct', SEN: 'sn', RSA: 'za', ESP: 'es', SWE: 'se', SUI: 'ch', TUN: 'tn',
  TUR: 'tr', URU: 'uy', UZB: 'uz',
};

// Pad a number to 2 digits: 1 -> "01"
function pad2(n) {
  return String(n).padStart(2, '0');
}

// Build the full list of sections. Each section has an id, a name, an emoji,
// and a list of sticker objects { code, type, special }.
function buildSections() {
  const sections = [];

  // 1) Intro / Trophy / Host / Special  (INTRO01..INTRO09)
  sections.push({
    id: 'INTRO',
    name: 'Intro / Trophy / Host',
    short: 'Intro',
    emoji: '🏆',
    kind: 'special',
    special: true,
    confirmed: true,
    stickers: Array.from({ length: 9 }, (_, i) => ({
      code: 'INTRO' + pad2(i + 1),
      type: 'Special',
      special: true,
    })),
  });

  // 2) FIFA Museum / Past Champions  (MUSEUM01..MUSEUM11)
  sections.push({
    id: 'MUSEUM',
    name: 'FIFA Museum / Past Champions',
    short: 'Museum',
    emoji: '🥇',
    kind: 'special',
    special: true,
    confirmed: true,
    stickers: Array.from({ length: 11 }, (_, i) => ({
      code: 'MUSEUM' + pad2(i + 1),
      type: 'Special',
      special: true,
    })),
  });

  // 3) 48 national teams, 20 stickers each:
  //    01 = crest/badge (special gold), 02 = team photo, 03..20 = players
  for (const team of TEAMS) {
    const stickers = Array.from({ length: 20 }, (_, i) => {
      const n = i + 1;
      let type = 'Player';
      let special = false;
      if (n === 1) {
        type = 'Crest';
        special = true; // crests get the gold border
      } else if (n === 2) {
        type = 'Team Photo';
      }
      return { code: team.code + pad2(n), type, special };
    });
    sections.push({
      id: team.code,
      name: team.name,
      short: team.name,
      emoji: team.flag || '⚽',
      iso: ISO[team.code] || null, // used to load a real flag image
      kind: 'team',
      confirmed: team.confirmed,
      stickers,
    });
  }

  return sections;
}

const SECTIONS = buildSections();

// Flat lookup helpers used by the app.
const ALL_STICKERS = SECTIONS.flatMap((s) =>
  s.stickers.map((st) => ({ ...st, sectionId: s.id, sectionName: s.name }))
);
const TOTAL_STICKERS = ALL_STICKERS.length; // 980
const SECTION_BY_ID = Object.fromEntries(SECTIONS.map((s) => [s.id, s]));

// Make them available to app.js (plain globals — no modules/build step needed).
window.SECTIONS = SECTIONS;
window.ALL_STICKERS = ALL_STICKERS;
window.TOTAL_STICKERS = TOTAL_STICKERS;
window.SECTION_BY_ID = SECTION_BY_ID;
