// @ts-nocheck
import { SIDE, randomPlatform, randomSide, sides } from "../util.js";
import listActiveWeaponName from "./listWeaponNames.js";
import { weaponCount, weaponNames } from "./weapons.js";

export const urlParams = new URLSearchParams(window.location.search);

const classicNegation = ["false", "no"];

export const reset = checkNegation("reset");
export const testing = checkNegation("testing");
export const massTesting = checkNegation("massTesting");
export const showLastWinner = checkNegation("lastWinner", classicNegation);
export const listWeapons = checkNegation("listWeapons");
export const coiVehicles = checkNegation("coiVehicles", classicNegation); // TODO: Implement and document.

export const botID = urlParams.get("botID") ? urlParams.get("botID") : "12343";
export const championName = urlParams.get("championName")
  ? urlParams.get("championName")
  : "King";
export const gameLength = Number(urlParams.get("gameLength"))
  ? Number(urlParams.get("gameLength"))
  : 60;
export const gstringProb = Number(urlParams.get("gstringProb"))
  ? Number(urlParams.get("gstringProb"))
  : 1000;
export const hillName = urlParams.get("hillName")
  ? urlParams.get("hillName")
  : "Hill";
export const joinCommand = urlParams.get("joinCommand")
  ? urlParams.get("joinCommand").toLowerCase()
  : "king";
export const riggedUsers = [
  "Ozy_Viking",
  "sassysarrah5",
  "gotobedchild",
  ...urlParams.getAll("riggedUser"),
];
export const wsPort = urlParams.get("wsPort")
  ? urlParams.get("wsPort")
  : "8080";
export const server = urlParams.get("server")
  ? `ws://${urlParams.get("server")}:${wsPort}/`
  : `ws://localhost:${wsPort}/`;
export const winStreak = winStreakNumber();
export const winner = urlParams.get("winner")
  ? Number(urlParams.get("winner"))
  : Infinity;
export const winStreakOrder = winStreakOrderCondition(
  urlParams.get("consecutive"),
);
export const platformBattle = checkNegation("platformBattle");
export const platform = urlParams.get("platform")
  ? urlParams.get("platform")
  : randomPlatform();
export const debug = winStreakOrderCondition(urlParams.get("debug"));
export const hillChoice = handleHillChoice(urlParams.get("hillChoice"));
export const PlatformSide = setPlatformSide(urlParams.get("twitchSide"));
export var checkNegationSettings;

/**
 * @param {string} param - Search Parametre.
 * @param {(string | null)[]} negationList - The list to check against. Default: [null, "false", "no"]
 * @returns {boolean} Returns true if not in negationList.
 */
function checkNegation(param, negationList = [null, ...classicNegation]) {
  if (!checkNegationSettings) {
    checkNegationSettings = {};
  }
  const retBool = !negationList.includes(urlParams.get(param));
  checkNegationSettings[param] = retBool;
  return retBool;
}

export default function settings() {
  return {
    botID: botID,
    championName: championName,
    debug: debug,
    gameLength: gameLength,
    gstringProb: gstringProb,
    hillChoice: hillChoice,
    hillName: hillName,
    joinCommand: joinCommand,
    listWeapons: listWeapons,
    platformBattle,
    coiVehicles,
    massTesting: massTesting,
    reset: reset,
    riggedUsers: riggedUsers,
    server: server,
    showLastWinner: showLastWinner,
    testing: testing,
    winner: winner,
    winStreak: winStreak,
    winStreakOrder: winStreakOrder,
    wsPort: wsPort,
  };
}

function winStreakNumber(winStreakParam = null) {
  // @ts-ignore
  winStreakParam = winStreakParam ? winStreakParam : urlParams.get("winStreak");
  // @ts-ignore
  if (["false", "no", "0"].includes(winStreakParam)) {
    return null;
  } else if (Number(winStreakParam) > 0) {
    return Number(winStreakParam);
  } else {
    return 2;
  }
}

function winStreakOrderCondition(value) {
  if (["any", ...classicNegation].includes(value)) {
    return "any";
  } else if (["both", "either", "all"].includes(value)) {
    return "both";
  } else {
    return "consecutive";
  }
}

export var weaponName = urlParams.get("weapon")
  ? urlParams.get("weapon")
  : null;
export var side = randomSide(urlParams.get("side"));

export function testingSettings() {
  return {
    ...settings(),
    weaponName: weaponName,
    side: side,
    platform: platform,
  };
}
/**
 * @param {string | null} hillChoice
 */
function handleHillChoice(hillChoice) {
  switch (hillChoice) {
    case "h1":
      return "King_of_the_hill_barrows_edition";
    case "h2":
      return "King_of_the_hill_barrows_edition_2";
    default:
      return "Grassy_Hill";
  }
}

if (listWeapons) {
  listActiveWeaponName();
}

export function setSearchParam(key, value = "") {
  const original = new URL(window.location.href);
  const url = new URL(window.location.href);
  url.searchParams.set(key, value);
  if (original.href != url.href) {
    window.location.assign(url);
  }
}

export function removeSearchParam(key) {
  const original = new URL(window.location.href);
  const url = new URL(window.location.href);
  if (url.searchParams.has(key)) {
    url.searchParams.delete(key);
    window.location.assign(url);
  }
}

export function setPlatformSide(setting) {
  if (!setting || !sides.includes(setting.toLowerCase())) {
    return {
      Twitch: SIDE.right,
      YouTube: SIDE.left,
    };
  }
  let twitchSide = setting.toLowerCase();

  return {
    Twitch: twitchSide,
    YouTube: twitchSide === SIDE.left ? SIDE.right : SIDE.left,
  };
}
