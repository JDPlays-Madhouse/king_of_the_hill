// @ts-nocheck
import { PLATFORM, randomSide, sides } from "../util.js";
import { acceptedJoinCommandsMap, winnerMessage } from "./constants.js";
import { fighterAnimation } from "./playerMotion.js";
import {
  PlatformSide,
  platformBattle,
  riggedUsers,
  joinCommand as jC,
  hillName,
} from "./urlParams.js";
import { usersWeapon, displayName } from "./weapons.js";

class UserListClass {
  constructor() {
    this.users = [];
  }

  addUser(user) {
    this.users.push(user);
  }

  removeUser(user) {
    this.users = this.users.filter((u) => u.ID !== user.ID);
  }

  getUserByID(ID) {
    return this.users[ID];
  }

  getUserByName(username) {
    return this.users.find((u) => u.username === username);
  }
}

export const UserList = new UserListClass();
export let divnumber = 0;

/**
 * Represents a User in the King of the Hill game.
 * @class User
 * @property {string} ID - The ID of the user.
 * @property {string} username - The username of the user.
 * @property {string} weapon - The weapon the user used.
 * @property {string} avatarURL - URL to the user's avatar.
 * @property {string} side - The side of the user (left or right).
 * @param {string} [joinCommand=jC] - The command to join the game.
 * @property {HTMLDivElement} div - The div element representing the user.
 * @property {boolean} rigged - Whether the user is rigged.
 */
export default class User {
  /**
   * Create a User instance.
   * @constructor
   * @param {Number} ID - The ID of the user.
   * @param {string} username - The username of the user.
   * @param {string} lowerMessage - The lowercased message received from the user.
   * @param {string} avatarURL - URL to the user's avatar.
   * @param {platform} [platform=PLATFORM.Twitch] - The platform the user is on.
   * @param {string} [side=""] - The side of the user (left or right). If not provided, a random side will be assigned.
   * @param {boolean} [testing=false] - Set to true when using the weapon testing.
   */
  constructor(
    ID,
    username,
    lowerMessage,
    avatarURL,
    platform = PLATFORM.Twitch,
    side = "",
    testing = false
  ) {
    console.log({ lowerMessage });
    this.ID = ID.toString();
    divnumber++;
    this.username = username;
    this.joinCommand = this.actualJoinCommand(lowerMessage);
    this.weapon = usersWeapon(lowerMessage, testing);
    this.avatarURL = avatarURL;
    this.rigged = riggedUsers.includes(username);
    if (Object.keys(PLATFORM).includes(platform)) {
      this.platform = platform;
    } else {
      console.error(`Invalid platform (${platform}), defaulting to Twitch.`);
      this.platform = PLATFORM.Twitch;
    }

    if (sides.includes(side)) {
      this.side = side.toLowerCase();
    } else {
      this.side = randomSide();
    }
    if (platformBattle) {
      this.side = PlatformSide[this.platform];
    }

    console.log(
      `User ${this.username} joined the game with the command ${this.joinCommand}.`
    );
    this.div = this.initDiv();
    UserList.addUser(this);
  }

  /**
   * Get the HTMLDivElement representing the user.
   * @returns {HTMLDivElement} The div element representing the user.
   */
  initDiv() {
    var Div = document.createElement("div");
    // @ts-ignore
    Div.id = this.ID;
    Div.setAttribute("user", this.username);
    Div.setAttribute("state", "alive");
    Div.style.background = `url(${this.avatarURL})`;
    Div.style.backgroundSize = "100% 100%";

    Div.setAttribute("side", this.side);
    Div.setAttribute("weapon", this.weapon.name);

    Div.innerHTML = `<img style='${
      this.weapon[this.side]
    }' src='static/images/${this.weapon.file}'/>
    <img class='${this.side} ${this.platform}' src='static/images/${
      this.platform
    }.png'/>`;
    fighterAnimation(this.side, Div);

    return Div;
  }

  /**
   * Get the HTMLDivElement representing the user.
   * @returns {HTMLDivElement} The div element representing the user.
   */
  getDiv() {
    let div = document.getElementById(this.ID);
    if (div === null) {
      return this.div;
    } else {
      this.div = div;
    }
    return this.div;
  }

  /**
   * Get the winMessage for the user.
   *
   * ```js
   * '${this.username}${platformAddition} is the new ${this.joinCommand} of the ${hillName}, using ${this.weapon["tense 1"]} ${displayName(this.weapon)}.`
   * ```
   * @returns {string} The message to be sent.
   * @param {string} [winMessage=winnerMessage] - The bulk of the message to be sent.
   */
  winMessage(winMessage = winnerMessage) {
    const platformAddition = platformBattle ? ` of ${this.platform}` : "";
    return `${this.username}${platformAddition} is the new ${
      this.joinCommand
    } of the ${hillName}, using ${this.weapon["tense 1"]} ${displayName(
      this.weapon
    )}.`;
  }

  /**
   * Get the Join Command used by the user.
   * @returns {string} The command used by the user.
   * @param {string} [lowerMessage] - The lowercased message received from the user.
   */
  actualJoinCommand(lowerMessage) {
    for (const [joinCommand, regex] of Object.entries(
      acceptedJoinCommandsMap
    )) {
      if (regex.test(lowerMessage)) {
        return joinCommand;
      }
    }
  }
}
