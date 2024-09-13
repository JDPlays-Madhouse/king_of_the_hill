import { Randomizer } from "../util.js";
import { coiVehicles, gstringProb } from "./urlParams.js";

// export type WeaponType = {
//     name: string;
//     file: string;
//     tense1: string;
//     tense2: string;
//     left: string;
//     right: string;
//     command: string[];
//     regex: RegExp;
//     takeoverName?: string;
// };

export const weaponObjects = {
  teapot: {
    file: "teapot.png",
    "tense 1": "the",
    "tense 2": "that",
    left: "transform: rotate(45deg) translate(30px,-30px) scaleX(-1)",
    right: "transform: rotate(-45deg) translate(-30px,-30px)",
    command: ["teapot", "tea", "pot"],
  },
  "number 1 fan finger": {
    file: "no1.png",
    "tense 1": "the",
    "tense 2": "that",
    left: "transform: rotate(45deg) translate(35px,-50px)",
    right: "transform: rotate(-45deg) translate(-35px,-50px)",
    command: ["1", "one", "num", "finger"],
  },
  plunger: {
    file: "plunger.png",
    "tense 1": "the",
    "tense 2": "that",
    left: "transform: rotate(10deg) translate(55px,-20px)",
    right: "transform: rotate(-10deg) translate(-55px,-20px) scaleX(-1)",
    command: ["plunger", "dunny", "toilet"],
  },
  doughnut: {
    file: "doughnut.png",
    "tense 1": "the",
    "tense 2": "that",
    left: "transform: rotate(30deg) translate(10px,-60px)",
    right: "transform: rotate(-30deg) translate(-10px,-60px)",
    command: ["doughnut", "donut", "nut"],
  },
  thong: {
    file: "thong.png",
    "tense 1": "the",
    "tense 2": "that",
    left: "transform: rotate(30deg) translate(10px,-60px);",
    right: "transform: rotate(-30deg) translate(-10px,-60px);",
    command: ["thong", "flip flop", "formal thong", "safety boot"],
  },
  "giant match": {
    file: "match.png",
    "tense 1": "the",
    "tense 2": "that",
    left: "transform: rotate(30deg) translate(40px,-20px)",
    right: "transform: rotate(-30deg) translate(-40px,-20px)",
    command: ["fire", "match", "aussie summer"],
  },
  "frying pan": {
    file: "pan.png",
    "tense 1": "the",
    "tense 2": "that",
    left: "transform: rotate(0deg) translate(60px,-10px)",
    right: "transform: rotate(0deg) translate(-60px,-10px) scaleX(-1)",
    command: ["pan", "hot flat", "pancake maker", "skillet", "iron"],
  },
  "butchered name": {
    file: "Name_Butcher_4000.png",
    "tense 1": "a",
    "tense 2": "that",
    left: "transform: rotate(10deg) translate(-30px,30px); width: 50px;",
    right: "transform: rotate(10deg) translate(-30px,30px); width: 50px;",
    command: ["name", "murder", "butcher", "kill"],
  },
  boomerang: {
    file: "Boomerang.png",
    "tense 1": "the",
    "tense 2": "that",
    left: "transform: rotate(-10deg) translate(60px,-10px); width: 60px;",
    right:
      "transform: rotate(-10deg) translate(-40px,-10px) scaleX(-1); width: 60px;",
    command: ["boom", "rang"],
  },
  didgeridoo: {
    file: "didgeridoo.png",
    "tense 1": "the",
    "tense 2": "that",
    left: "transform: rotate(250deg) translate(-25px,35px)",
    right: "transform: rotate(10deg) translate(-35px,25px)",
    command: ["didgeridoo", "pipe", "wind", "doo", "didg"],
  },
  "sausage sanga": {
    file: "sausage_sanga.png",
    "tense 1": "the",
    "tense 2": "that",
    left: "transform: rotate(0deg) translate(50px,20px); width: 50px;",
    right:
      "transform: rotate(0deg) translate(-30px,20px) scaleX(-1); width: 50px;",
    command: ["sausage", "sandwich", "sanga", "snag", "bunning"],
  },
  "goon sack": {
    file: "Goon_Sack.png",
    "tense 1": "the",
    "tense 2": "that",
    left: "transform: rotate(0deg) translate(45px,-20px); width: 75px;",
    right:
      "transform: rotate(0deg) translate(-30px,-20px) scaleX(-1); width: 75px;",
    command: [
      "goon",
      "sack",
      "goon of fortune",
      "fancy",
      "fine dinning",
      "pillow",
    ],
  },
  poop: {
    file: "poop.png",
    "tense 1": "the",
    "tense 2": "that",
    left: "transform: rotate(0deg) translate(55px,0px) scale(1.25); width: 50px;",
    right:
      "transform: rotate(0deg) translate(-30px,0px) scale(1.25); width: 50px;",
    command: ["poo", "catpoo", "cat poo"],
  },
  nuke: {
    file: "Nuke.png",
    "tense 1": "a",
    "tense 2": "that",
    left: "transform: rotate(0deg) translate(10px,-48px) scale(1.25); width: 50px;",
    right:
      "transform: rotate(0deg) translate(10px,-48px) scale(1.25); width: 50px;",
    command: ["nuke", "boom", "explosion", "mushroom"],
  },
  "200 IQ": {
    file: "200IQ.png",
    "tense 1": "their",
    "tense 2": "that",
    left: "transform: rotate(0deg) translate(45px,-20px) scale(1.25); width: 50px;",
    right:
      "transform: rotate(0deg) translate(-20px,-20px) scale(1.25); width: 50px;",
    command: ["big brains", "smart", "smrt", "200", "IQ"],
  },
  "cat combat": {
    file: "Cat_Rocket.png",
    "tense 1": "",
    "tense 2": "that",
    left: "transform: translate(50px,-20px) rotate(50deg) scale(1.25); width: 50px;",
    right:
      "transform: translate(-25px,-20px) rotate(-40deg) scaleX(-1) scale(1.25); width: 50px;",
    command: ["rocket", "bazooka", "rpg", "launcher", "cat rocket"],
  },
  "cat o' 9 tail": {
    file: "Herd.png",
    "tense 1": "a",
    "tense 2": "that",
    left: "transform: translate(50px,-20px) rotate(0deg) scaleX(-1) scale(1.3); width: 50px;",
    right:
      "transform: translate(-25px,-20px) rotate(0deg) scale(1.3); width: 50px;",
    command: ["herd", "9 tail", "whip", "o'", "cat o' 9 tail"],
  },
  love: {
    file: "Holding_Heart_Cat.png",
    "tense 1": "the power of",
    "tense 2": "",
    left: "transform: translate(50px,-20px) rotate(0deg) scaleX(-1) scale(1.25); width: 50px;",
    right:
      "transform: translate(-25px,-20px) rotate(0deg) scale(1.25); width: 50px;",
    command: ["heart", "hug", "love"],
  },
  "cat litter": {
    file: "Litter_badge.png",
    "tense 1": "the",
    "tense 2": "that",
    left: "transform: translate(50px,-20px) rotate(0deg) scaleX(-1) scale(1.3); width: 50px;",
    right:
      "transform: translate(-25px,-20px) rotate(0deg) scale(1.3); width: 50px;",
    command: ["litter"],
  },
  "mad house": {
    file: "Mad_House_2.png",
    "tense 1": "JD's",
    "tense 2": "that",
    left: "transform: translate(50px,-20px) rotate(0deg) scaleX(-1) scale(1.25); width: 50px;",
    right:
      "transform: translate(-25px,-20px) rotate(0deg) scale(1.25); width: 50px;",
    command: ["mad", "house"],
  },

  "90 belt": {
    file: "purple.png",
    "tense 1": "the",
    "tense 2": "that",
    left: "transform: translate(50px,-20px) rotate(0deg) scaleX(-1) scale(1.5); width: 50px;",
    right:
      "transform: translate(-25px,-20px) rotate(0deg) scale(1.5); width: 50px;",
    command: ["purple", "conveyor", "belt"],
  },
  "Sassy's Ring": {
    file: "Ring.png",
    "tense 1": "",
    "tense 2": "",
    left: "transform: translate(50px,-20px) rotate(0deg) scale(1.25); width: 50px;",
    right:
      "transform: translate(-25px,-20px) rotate(0deg) scale(1.25); width: 50px;",
    command: ["ring", "where is it", "sassy"],
  },
  "lazy bot": {
    file: "sleep.png",
    "tense 1": "a",
    "tense 2": "that",
    left: "transform: translate(50px,-20px) rotate(0deg) scale(1.25); width: 50px;",
    right:
      "transform: translate(-25px,-20px) rotate(0deg) scale(1.25); width: 50px;",
    command: ["sleep", "lazy", "bot"],
  },
  spaghetti: {
    file: "Spaghetti.png",
    "tense 1": "JD's",
    "tense 2": "that",
    left: "transform: translate(50px,30px) rotate(0deg) scaleX(-1) scale(1.25); width: 50px;",
    right:
      "transform: translate(-25px,30px) rotate(0deg) scale(1.25); width: 50px;",
    command: ["spag", "conveyor", "belt", "meal"],
  },
  "cat with a bat": {
    file: "Wack.png",
    "tense 1": "",
    "tense 2": "that",
    left: "transform: translate(50px,-20px) rotate(0deg) scale(1.25); width: 50px;",
    right:
      "transform: translate(-25px,-20px) rotate(0deg) scaleX(-1) scale(1.25); width: 50px;",
    command: ["bat", "paddle", "wack", "cat combat"],
  },
  "combat wombat": {
    file: "Wombat.png",
    "tense 1": "the",
    "tense 2": "that",
    left: "transform: translate(50px,-20px) rotate(0deg) scaleX(-1) scale(1.25); width: 50px;",
    right:
      "transform: translate(-25px,-20px) rotate(0deg) scale(1.25); width: 50px;",
    command: ["wombat", "wom", "combat"],
  },
  "seabus club": {
    file: "factorio.png",
    "tense 1": "the",
    "tense 2": "that",
    left: "transform:translate(-10px,-25px) rotate(225deg) scaleY(-1); width: 100px;",
    right: "transform:translate(-10px,-25px) rotate(-45deg); width: 100px;",
    command: ["seabus club", "club"],
  },
  tentacles: {
    file: "tentacles_2_flipped.gif",
    "tense 1": "the",
    "tense 2": "that",
    left: "transform: translate(36px,-56px) rotate(225deg) scaleY(-1); width: 78px;",
    right: "transform: translate(-38px,-56px) rotate(-45deg); width: 78px;",
    command: ["tentacles", "tentacle", "octopus", "squid", "ten"],
  },
  "T3 Dump Truck": {
    file: "TruckT3Loose_Dump.png",
    "tense 1": "the",
    "tense 2": "that",
    left: "transform: translate(50px,-20px) rotate(0deg) scale(1.4); width: 50px;",
    right:
      "transform: translate(-25px,-20px) rotate(0deg) scale(1.4) scaleX(-1); width: 50px;",
    command: ['mega truck'],
  },
  "T3 Fluid Tank Truck": {
    file: "TruckT3Fluid_Tank.png",
    "tense 1": "the",
    "tense 2": "that",
    left: "transform: translate(50px,-20px) rotate(0deg) scale(1.4); width: 50px;",
    right:
      "transform: translate(-25px,-20px) rotate(0deg) scale(1.4) scaleX(-1); width: 50px;",
    command: ["turtle"],
  },
  "T2 Truck": {
    file: "TruckT2.png",
    "tense 1": "the",
    "tense 2": "that",
    left: "transform: translate(50px,-20px) rotate(0deg) scale(1.25); width: 50px;",
    right:
      "transform: translate(-25px,-20px) rotate(0deg) scale(1.25) scaleX(-1); width: 50px;",
    command: [],
  },
  "T2 Dump Truck": {
    file: "TruckT2_Dump.png",
    "tense 1": "the",
    "tense 2": "that",
    left: "transform: translate(50px,-20px) rotate(0deg) scale(1.25); width: 50px;",
    right:
      "transform: translate(-25px,-20px) rotate(0deg) scale(1.25) scaleX(-1); width: 50px;",
    command: [],
  },
  "T2 Fluid Tank Truck": {
    file: "TruckT2_Tank.png",
    "tense 1": "the",
    "tense 2": "that",
    left: "transform: translate(50px,-20px) rotate(0deg) scale(1.25); width: 50px;",
    right:
      "transform: translate(-25px,-20px) rotate(0deg) scale(1.25) scaleX(-1); width: 50px;",
    command: [],
  },
  "T2 Container Truck": {
    file: "TruckT2_Container.png",
    "tense 1": "the",
    "tense 2": "that",
    left: "transform: translate(50px,-20px) rotate(0deg) scale(1.25); width: 50px;",
    right:
      "transform: translate(-25px,-20px) rotate(0deg) scale(1.25) scaleX(-1); width: 50px;",
    command: [],
  },
  "T1 Truck": {
    file: "TruckT1.png",
    "tense 1": "the",
    "tense 2": "that",
    left: "transform: translate(50px,-20px) rotate(0deg) scale(1.1); width: 50px;",
    right:
      "transform: translate(-25px,-20px) rotate(0deg) scale(1.1) scaleX(-1); width: 50px;",
    command: [],
  },
  "T1 Dump Truck": {
    file: "TruckT1_Dump.png",
    "tense 1": "the",
    "tense 2": "that",
    left: "transform: translate(50px,-20px) rotate(0deg) scale(1.1); width: 50px;",
    right:
      "transform: translate(-25px,-20px) rotate(0deg) scale(1.1) scaleX(-1); width: 50px;",
    command: [],
  },
  "T1 Fluid Tank Truck": {
    file: "TruckT1_Tank.png",
    "tense 1": "the",
    "tense 2": "that",
    left: "transform: translate(50px,-20px) rotate(0deg) scale(1.1); width: 50px;",
    right:
      "transform: translate(-25px,-20px) rotate(0deg) scale(1.1) scaleX(-1); width: 50px;",
    command: [],
  },
  "T1 Container Truck": {
    file: "TruckT1_Container.png",
    "tense 1": "the",
    "tense 2": "that",
    left: "transform: translate(50px,-20px) rotate(0deg) scale(1.1); width: 50px;",
    right:
      "transform: translate(-25px,-20px) rotate(0deg) scale(1.1) scaleX(-1); width: 50px;",
    command: [],
  },
  "T1 Excavator": {
    file: "ExcavatorT1.png",
    "tense 1": "the",
    "tense 2": "that",
    left: "transform: translate(50px,-20px) rotate(0deg) scale(1.1); width: 50px;",
    right:
      "transform: translate(-25px,-20px) rotate(0deg) scale(1.1) scaleX(-1); width: 50px;",
    command: [],
  },
  "T2 Excavator": {
    file: "ExcavatorT2.png",
    "tense 1": "the",
    "tense 2": "that",
    left: "transform: translate(50px,-20px) rotate(0deg) scale(1.20); width: 50px;",
    right:
      "transform: translate(-25px,-20px) rotate(0deg) scale(1.20) scaleX(-1); width: 50px;",
    command: [],
  },
  "T3 Excavator": {
    file: "ExcavatorT3.png",
    "tense 1": "the",
    "tense 2": "that",
    left: "transform: translate(50px,-20px) rotate(0deg) scale(1.4); width: 50px;",
    right:
      "transform: translate(-25px,-20px) rotate(0deg) scale(1.4) scaleX(-1); width: 50px;",
    command: [],
  },

  "Tree Harvester": {
    file: "TreeHarvester.png", // TODO: check on background.
    "tense 1": "the",
    "tense 2": "that",
    left: "transform: translate(50px,-20px) rotate(0deg) scale(1.25); width: 50px;",
    right:
      "transform: translate(-25px,-20px) rotate(0deg) scale(1.25) scaleX(-1); width: 50px;",
    command: ["tree", "chopper", "harvester"],
  },

  "abused bot": {
    file: "abused_robot.png",
    "tense 1": "the",
    "tense 2": "that",
    left: "transform: translate(50px,-20px) rotate(0deg) scale(1.25); width: 50px;",
    right:
      "transform: translate(-25px,-20px) rotate(0deg) scaleX(-1) scale(1.25); width: 50px;",
    command: ["abused", "sad", "crying"],
  },
};

export const weaponNames = Object.keys(weaponObjects);

export const weaponCount = weaponNames.length;

export const weaponObjectsTesting = {
  "magic seabus": {
    file: "seaBus.png",
    "tense 1": "the",
    "tense 2": "that",
    left: "transform: translate(50px,-20px) rotate(0deg) scaleX(-1) scale(1.25); width: 50px;",
    right:
      "transform: translate(-25px,-20px) rotate(0deg) scale(1.25); width: 50px;",
    command: ["seabus", "magic"],
  },
  ghost: {
    file: "GhostCat.png",
    "tense 1": "the",
    "tense 2": "that",
    left: "transform: translate(50px,-20px) rotate(0deg) scale(1.25); width: 50px;",
    right:
      "transform: translate(-25px,-20px) rotate(0deg) scaleX(-1) scale(1.25); width: 50px;",
    command: ["ghost", "scare"],
  },
  witch: {
    file: "cat-witch.png",
    "tense 1": "a",
    "tense 2": "that",
    left: "transform: translate(50px,-20px) rotate(0deg) scaleX(-1) scale(1.25); width: 50px;",
    right:
      "transform: translate(-25px,-20px) rotate(0deg) scale(1.25); width: 50px;",
    command: ["witch", "spell"],
  },
  "halloween pumpkin": {
    file: "Pumpkin.png",
    "tense 1": "the",
    "tense 2": "that",
    left: "transform: translate(50px,-20px) rotate(0deg) scaleX(-1) scale(1.25); width: 50px;",
    right:
      "transform: translate(-25px,-20px) rotate(0deg) scale(1.25); width: 50px;",
    command: ["pumpkin"],
  },
  "rocket": {
    file: "testingrockett0transporter.png", // todo: position and orientation of rocket
    "tense 1": "the",
    "tense 2": "that",
    left: "transform: translate(50px,-20px) rotate(0deg) scale(1.25); width: 50px;",
    right:
      "transform: translate(-25px,-20px) rotate(0deg) scale(1.25) scalex(-1); width: 50px;",
    command: [],
  },
  gsting: {
    name: "JD's Sexy Thong",
    takeoverName: "thong",
    file: "secret_thong.png",
    "tense 1": "",
    "tense 2": "",
    left: "transform: rotate(-30deg) translate(60px,20px);",
    right: "transform: rotate(30deg) translate(-35px,10px);",
    command: ["thong", "flip flop", "formal thong", "safety boot"],
  },
};

export const weaponNamesTesting = Object.keys(weaponObjectsTesting);

export const weaponCountTesting = weaponNamesTesting.length;

export const gstring = {
  name: "JD's Sexy Thong",
  takeoverName: "thong",
  file: "secret_thong.png",
  "tense 1": "",
  "tense 2": "",
  left: "transform: rotate(-30deg) translate(60px,20px);",
  right: "transform: rotate(30deg) translate(-35px,10px);",
  command: ["thong", "flip flop", "formal thong", "safety boot"],
};

const tier_regex = {
  T1: { name: "T1", command: ['mini', 'micro', 'tiny', 'tini', 'baby', 'toy', 'puny', 'itsy', 'wee', 'teeny', 'weeny', 'teensy'] },
  T2: { name: "T2", command: ['mid', 'speedy', 'mean', 'moderate'] },
  T3: { name: "T3", command: ['big', 'mega', 'large', 'gigantic', 'huge', 'colossal', 'oversize'] },
}
for (let key of Object.keys(tier_regex)) {
  let tier = tier_regex[key]
  // console.log(key)
  tier_regex[key].regex = new RegExp([key.toLowerCase(), ...tier.command].join("|"), "i")
}
// console.log(weaponNames.join(", "))

const tiered_weapons = {
  Truck: {
    name: 'Truck',
    command: ['truck', 'trucky', 'truk', 'truc'],
    types: [{ name: 'Container ', command: [] }, { name: 'Dump ', command: [] }, { name: 'Empty', command: [] }, { name: 'Tank ', command: ["fluid", 'oil', 'fuel', 'liquid'] },]
  },
  Excavator: {
    name: 'Excavator',
    command: ['excavator', 'excav', 'diggy', 'dig'],
    types: false
  },
}


for (let key of Object.keys(tiered_weapons)) {
  let tier = tiered_weapons[key]
  // console.log(key)
  tiered_weapons[key].regex = new RegExp([key.toLowerCase(), ...tier.command].join("|"), "i")
  if (tier.types) {
    tiered_weapons[key].typeNames = []
    for (let idx in tier.types) {
      let type = tiered_weapons[key].types[idx]
      tiered_weapons[key].typeNames.push(type.name)
      tiered_weapons[key].types[idx].regex = new RegExp([type.name.trim().toLowerCase(), ...type.command].join('|'), 'i')
    }
  }
}


// adds the name of each weapon for code readabilty
for (let i = 0; i < weaponNames.length; i++) {
  let weapon = weaponObjects[weaponNames[i]];
  weapon.name = weaponNames[i];
  weapon.regex = new RegExp([weapon.name, ...weapon.command].join("|"), "i");

}
// adds the name of each weapon for code readabilty
for (let i = 0; i < weaponNamesTesting.length; i++) {
  let weapon = weaponObjectsTesting[weaponNamesTesting[i]];
  weapon.name = weaponNamesTesting[i];
  weapon.regex = new RegExp([weapon.name, ...weapon.command].join("|"), "i");
}

export function userTieredWeapon(lowerMessage, weapon_name) {
  let tier_choice = "T2"
  let type_choice = "Random"
  let typeMatch = false
  let weapon = tiered_weapons[weapon_name]
  for (let tier_name of Object.keys(tier_regex)) {
    let tier = tier_regex[tier_name]
    if (tier.regex.exec(lowerMessage) != null) {
      tier_choice = tier.name
      break
    }
  }
  let weaponChoice = tier_choice + " " + weapon.name

  if (!weapon.types) {
    return weaponChoice
  }
  // console.log({ types: weapon.types, weapon })
  for (let idx in weapon.types) {

    let type = weapon.types[idx]
    if (type.regex.exec(lowerMessage) != null) {
      type_choice = type.name
      typeMatch = true
    }
  }
  if (type_choice === "Random") {
    type_choice = weapon.typeNames[Math.floor(Math.random() * weapon.typeNames.length)]
  }
  type_choice = type_choice === "Empty" ? "" : type_choice;
  type_choice = type_choice === "Tank " ? "Fluid Tank " : type_choice;
  weaponChoice = tier_choice + " " + type_choice + weapon.name;
  if (tier_choice === "T3") {
    if (weaponObjects["T3 Dump Truck"].regex.exec(lowerMessage) != null) {
      return "T3 Dump Truck"
    }
    weaponChoice = weaponChoice === "T3 Container Truck" ? "T2 Container Truck" : weaponChoice;
    weaponChoice = weaponChoice === "T3 Truck" ? "T3 Dump Truck" : weaponChoice;
  }
  // console.log({ weaponChoice })
  return weaponChoice
}

export function weaponRegex() {
  let retRegex = {};
  for (let i in weaponNames) {
    retRegex[weaponNames[i]] = weaponObjects[weaponNames[i]].regex.source;
  }
  for (let i in weaponNamesTesting) {
    retRegex[weaponNamesTesting[i]] =
      weaponObjectsTesting[weaponNamesTesting[i]].regex.source;
  }
  return retRegex;
}

export function chooseRandomWeapon() {
  return weaponObjects[
    weaponNames[Math.floor(Math.random() * weaponNames.length)]
  ];
}
export function usersWeapon(lowerMessage) {
  let weapon;
  let choosenWeapon;
  // if (coiVehicles) {
  for (let weaponName of Object.keys(tiered_weapons)) {
    weapon = tiered_weapons[weaponName]
    if (weapon.regex.exec(lowerMessage) != null) {
      return weaponObjects[userTieredWeapon(lowerMessage, weaponName)]
    }
  }
  // }
  for (let i = 0; i < weaponNames.length; i++) {
    weapon = weaponObjects[weaponNames[i]];
    if (weapon.regex.exec(lowerMessage) != null) {
      choosenWeapon = weapon;
      break
    }
  }
  if (choosenWeapon === undefined) {
    choosenWeapon = chooseRandomWeapon();
  }
  if (choosenWeapon.name === gstring.takeoverName) {
    if (Randomizer(0, gstringProb) == 0) {
      return gstring;
    }
  }
  return choosenWeapon;
}
