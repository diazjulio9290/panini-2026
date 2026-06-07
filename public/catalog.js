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
// The three hosts (USA, Mexico, Canada) are confirmed; the rest are placeholders
// until qualification finishes.
const TEAMS = [
  { code: 'USA', name: 'United States', flag: '🇺🇸', confirmed: true },
  { code: 'MEX', name: 'Mexico', flag: '🇲🇽', confirmed: true },
  { code: 'CAN', name: 'Canada', flag: '🇨🇦', confirmed: true },
  { code: 'ARG', name: 'Argentina', flag: '🇦🇷', confirmed: false },
  { code: 'BRA', name: 'Brazil', flag: '🇧🇷', confirmed: false },
  { code: 'GER', name: 'Germany', flag: '🇩🇪', confirmed: false },
  { code: 'FRA', name: 'France', flag: '🇫🇷', confirmed: false },
  { code: 'ESP', name: 'Spain', flag: '🇪🇸', confirmed: false },
  { code: 'ENG', name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', confirmed: false },
  { code: 'POR', name: 'Portugal', flag: '🇵🇹', confirmed: false },
  { code: 'ITA', name: 'Italy', flag: '🇮🇹', confirmed: false },
  { code: 'NED', name: 'Netherlands', flag: '🇳🇱', confirmed: false },
  { code: 'BEL', name: 'Belgium', flag: '🇧🇪', confirmed: false },
  { code: 'CRO', name: 'Croatia', flag: '🇭🇷', confirmed: false },
  { code: 'URU', name: 'Uruguay', flag: '🇺🇾', confirmed: false },
  { code: 'COL', name: 'Colombia', flag: '🇨🇴', confirmed: false },
  { code: 'JPN', name: 'Japan', flag: '🇯🇵', confirmed: false },
  { code: 'KOR', name: 'South Korea', flag: '🇰🇷', confirmed: false },
  { code: 'AUS', name: 'Australia', flag: '🇦🇺', confirmed: false },
  { code: 'MAR', name: 'Morocco', flag: '🇲🇦', confirmed: false },
  { code: 'SEN', name: 'Senegal', flag: '🇸🇳', confirmed: false },
  { code: 'GHA', name: 'Ghana', flag: '🇬🇭', confirmed: false },
  { code: 'CMR', name: 'Cameroon', flag: '🇨🇲', confirmed: false },
  { code: 'NGR', name: 'Nigeria', flag: '🇳🇬', confirmed: false },
  { code: 'RSA', name: 'South Africa', flag: '🇿🇦', confirmed: false },
  { code: 'EGY', name: 'Egypt', flag: '🇪🇬', confirmed: false },
  { code: 'KSA', name: 'Saudi Arabia', flag: '🇸🇦', confirmed: false },
  { code: 'IRN', name: 'Iran', flag: '🇮🇷', confirmed: false },
  { code: 'QAT', name: 'Qatar', flag: '🇶🇦', confirmed: false },
  { code: 'CHI', name: 'Chile', flag: '🇨🇱', confirmed: false },
  { code: 'ECU', name: 'Ecuador', flag: '🇪🇨', confirmed: false },
  { code: 'PAR', name: 'Paraguay', flag: '🇵🇾', confirmed: false },
  { code: 'PER', name: 'Peru', flag: '🇵🇪', confirmed: false },
  { code: 'BOL', name: 'Bolivia', flag: '🇧🇴', confirmed: false },
  { code: 'VEN', name: 'Venezuela', flag: '🇻🇪', confirmed: false },
  { code: 'CRC', name: 'Costa Rica', flag: '🇨🇷', confirmed: false },
  { code: 'PAN', name: 'Panama', flag: '🇵🇦', confirmed: false },
  { code: 'JAM', name: 'Jamaica', flag: '🇯🇲', confirmed: false },
  { code: 'HON', name: 'Honduras', flag: '🇭🇳', confirmed: false },
  { code: 'SLV', name: 'El Salvador', flag: '🇸🇻', confirmed: false },
  { code: 'NZL', name: 'New Zealand', flag: '🇳🇿', confirmed: false },
  { code: 'UKR', name: 'Ukraine', flag: '🇺🇦', confirmed: false },
  { code: 'POL', name: 'Poland', flag: '🇵🇱', confirmed: false },
  { code: 'SUI', name: 'Switzerland', flag: '🇨🇭', confirmed: false },
  { code: 'DEN', name: 'Denmark', flag: '🇩🇰', confirmed: false },
  { code: 'SWE', name: 'Sweden', flag: '🇸🇪', confirmed: false },
  { code: 'NOR', name: 'Norway', flag: '🇳🇴', confirmed: false },
  { code: 'TUR', name: 'Turkey', flag: '🇹🇷', confirmed: false },
];

// ISO country codes used to load real flag images (flagcdn.com).
// These render as proper flags on EVERY device (Windows included), unlike
// emoji flags which Windows shows as plain letters.
const ISO = {
  USA: 'us', MEX: 'mx', CAN: 'ca', ARG: 'ar', BRA: 'br', GER: 'de', FRA: 'fr',
  ESP: 'es', ENG: 'gb-eng', POR: 'pt', ITA: 'it', NED: 'nl', BEL: 'be', CRO: 'hr',
  URU: 'uy', COL: 'co', JPN: 'jp', KOR: 'kr', AUS: 'au', MAR: 'ma', SEN: 'sn',
  GHA: 'gh', CMR: 'cm', NGR: 'ng', RSA: 'za', EGY: 'eg', KSA: 'sa', IRN: 'ir',
  QAT: 'qa', CHI: 'cl', ECU: 'ec', PAR: 'py', PER: 'pe', BOL: 'bo', VEN: 've',
  CRC: 'cr', PAN: 'pa', JAM: 'jm', HON: 'hn', SLV: 'sv', NZL: 'nz', UKR: 'ua',
  POL: 'pl', SUI: 'ch', DEN: 'dk', SWE: 'se', NOR: 'no', TUR: 'tr',
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
