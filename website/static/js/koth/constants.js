import { PLATFORM, Randomizer, SIDE } from "../util.js";
import { winnerMotionLength } from "./playerMotion.js";
import {
  championName,
  gameLength,
  hillName,
  joinCommand,
  acceptedJoinCommands
} from "./urlParams.js";
import { chooseRandomWeapon, displayName, weaponNames } from "./weapons.js";

var altEndingMessages = [
  // `This Is Your Life, and It's Ending One Minute at a Time`
];

function generateEndingMessage() {
  let endingChoice = Randomizer(
    0,
    weaponNames.length + altEndingMessages.length - 1,
  );
  if (endingChoice < altEndingMessages.length) {
    return altEndingMessages[endingChoice];
  } else {
    let randWeapon = chooseRandomWeapon();
    return `The fight is coming to an end! Get back, Back, no more people. OI! Who threw ${randWeapon["tense 2"]} ${displayName(randWeapon).toLowerCase()}!?!`;
  }
}

export const storage = localStorage;

export const weaponSize = 100;
export const totalYeetTime = 10;
export const delayToCeremony = 2.5;
export const fightDelay = 1;
export const postGameLength =
  fightDelay + totalYeetTime + delayToCeremony + winnerMotionLength;
export const GLPGL = gameLength + postGameLength;
export const hillAnimationCSS = 0.02; // 2%
export const hillAnimationLength =
  (GLPGL / (1 - 2 * hillAnimationCSS) - GLPGL) / 2;
export const totalGameLength =
  hillAnimationLength + gameLength + postGameLength + hillAnimationLength;

export const battleGround = `${championName} of the ${hillName}`;
export const noJoinMessage = `No one joined, so no new ${battleGround}!`;
export const winnerMessage = `is the new ${battleGround}`;
export const updateMessage = `seconds left to join the fight! Type ${joinCommand} to see if you can take the title of ${battleGround}!`;
export const endingMessage = generateEndingMessage();
console.log({ endingMessage });
export const joinCommandRegex = new RegExp(`${acceptedJoinCommands.join("|")}`, "i");
export const acceptedJoinCommandsMap = {};
for (const command of acceptedJoinCommands) {
  acceptedJoinCommandsMap[command] = new RegExp(command, "i");
}

export const updateMessageRegex = new RegExp(
  `${updateMessage.toLowerCase()}|${endingMessage.toLowerCase()}|${noJoinMessage.toLowerCase()}`,
  "i",
);
