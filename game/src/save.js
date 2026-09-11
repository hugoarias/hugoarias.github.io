// Persistent cross-run progress, backed by localStorage. Defensive by design —
// private browsing / disabled storage just means progress doesn't persist,
// never a crash.

const SAVE_KEY = 'convoyEscortSave';
const DEFAULT_SKIN_KEY = 'ship-awing';
const DEFAULT_CONVOY_SKIN_KEY = 'convoy-hauler';
// Kept as a plain list here (not imported from config.js) to keep save.js
// decoupled from game content — see the SKINS/CONVOY_SKINS default-key
// constants above for the same convention.
const SHIP_KEYS = ['ship-xwing', 'ship-ywing', 'ship-awing'];
const DEFAULT_LEVEL_KEY = 'level-1';

function defaultShipUpgradeBag() {
  return { startWeaponLevel: 0, missile: 0, laser: 0, lives: 0, dodge: 0, shield: 0, droids: 0 };
}

function defaultSave() {
  const shipUpgrades = {};
  SHIP_KEYS.forEach((key) => {
    shipUpgrades[key] = defaultShipUpgradeBag();
  });

  return {
    currency: 0,
    upgrades: { convoyHp: 0, convoyWeapon: 0, convoyShield: 0, convoyDroids: 0 },
    shipUpgrades,
    skins: { owned: [DEFAULT_SKIN_KEY], selected: DEFAULT_SKIN_KEY },
    convoySkins: { owned: [DEFAULT_CONVOY_SKIN_KEY], selected: DEFAULT_CONVOY_SKIN_KEY },
    levels: { unlocked: [DEFAULT_LEVEL_KEY] },
  };
}

// Same defensive-merge idea as parseSkinBag below, but for the simpler
// { unlocked: [...] } shape — always keeps the default level unlocked.
function parseLevelsBag(rawBag) {
  const unlocked = Array.isArray(rawBag?.unlocked) ? [...rawBag.unlocked] : [];
  if (!unlocked.includes(DEFAULT_LEVEL_KEY)) unlocked.push(DEFAULT_LEVEL_KEY);
  return { unlocked };
}

// Shared defensive-merge for a { owned, selected } skin bag — always keeps the
// given default key in `owned` and falls back `selected` to it if missing/bad.
function parseSkinBag(rawBag, defaultKey) {
  const owned = Array.isArray(rawBag?.owned) ? [...rawBag.owned] : [];
  if (!owned.includes(defaultKey)) owned.push(defaultKey);
  const selected = typeof rawBag?.selected === 'string' ? rawBag.selected : defaultKey;
  return { owned, selected };
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw);

    const shipUpgrades = {};
    SHIP_KEYS.forEach((key) => {
      shipUpgrades[key] = { ...defaultShipUpgradeBag(), ...((parsed.shipUpgrades || {})[key] || {}) };
    });

    return {
      currency: Number(parsed.currency) || 0,
      upgrades: { ...defaultSave().upgrades, ...(parsed.upgrades || {}) },
      shipUpgrades,
      skins: parseSkinBag(parsed.skins, DEFAULT_SKIN_KEY),
      convoySkins: parseSkinBag(parsed.convoySkins, DEFAULT_CONVOY_SKIN_KEY),
      levels: parseLevelsBag(parsed.levels),
    };
  } catch {
    return defaultSave();
  }
}

export function writeSave(save) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // ignore — progress just won't persist this session
  }
}
