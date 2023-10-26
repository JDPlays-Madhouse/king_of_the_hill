const weaponSize = 100;

export const weaponObjects = {
  "teapot": {
    "file": "teapot.png",
    "tense 1": "the",
    "tense 2": "that",
    "left": "transform: rotate(45deg) translate(30px,-30px) scaleX(-1)",
    "right": "transform: rotate(-45deg) translate(-30px,-30px)",
    "command": ["teapot", "tea", "pot"]
  },
  "number 1 fan finger": {
    "file": "no1.png",
    "tense 1": "the",
    "tense 2": "that",
    "left": "transform: rotate(45deg) translate(35px,-50px)",
    "right": "transform: rotate(-45deg) translate(-35px,-50px)",
    "command": ["1", "one", "num", "finger"]
  },
  "plunger": {
    "file": "plunger.png",
    "tense 1": "the",
    "tense 2": "that",
    "left": "transform: rotate(10deg) translate(55px,-20px)",
    "right": "transform: rotate(-10deg) translate(-55px,-20px) scaleX(-1)",
    "command": ["plunger", "dunny", "toilet"]
  },
  "doughnut": {
    "file": "doughnut.png",
    "tense 1": "the",
    "tense 2": "that",
    "left": "transform: rotate(30deg) translate(10px,-60px)",
    "right": "transform: rotate(-30deg) translate(-10px,-60px)",
    "command": ["doughnut", "donut", "nut"]
  },
  "thong": {
    "file": "thong.png",
    "tense 1": "the",
    "tense 2": "that",
    "left": "transform: rotate(30deg) translate(10px,-60px);",
    "right": "transform: rotate(-30deg) translate(-10px,-60px);",
    "command": ["thong", "flip flop", "formal thong", "safety boot"]
  },
  "giant match": {
    "file": "match.png",
    "tense 1": "the",
    "tense 2": "that",
    "left": "transform: rotate(30deg) translate(40px,-20px)",
    "right": "transform: rotate(-30deg) translate(-40px,-20px)",
    "command": ["fire", "match", "aussie summer"]
  },
  "frying pan": {
    "file": "pan.png",
    "tense 1": "the",
    "tense 2": "that",
    "left": "transform: rotate(0deg) translate(60px,-10px)",
    "right": "transform: rotate(0deg) translate(-60px,-10px) scaleX(-1)",
    "command": ["pan", "hot flat", "pancake maker", "skillet", "iron"]
  },
  "butchered name": {
    "file": "Name_Butcher_4000.png",
    "tense 1": "a",
    "tense 2": "that",
    "left": "transform: rotate(10deg) translate(-30px,30px); width: 50px;",
    "right": "transform: rotate(10deg) translate(-30px,30px); width: 50px;",
    "command": ["name", "murder", "butcher", "kill"]
  },
  "boomerang": {
    "file": "Boomerang.png",
    "tense 1": "the",
    "tense 2": "that",
    "left": "transform: rotate(-10deg) translate(60px,-10px); width: 50px;",
    "right": "transform: rotate(-10deg) translate(-40px,-10px) scaleX(-1); width: 50px;",
    "command": ["boom", "rang"]
  },
  "didgeridoo": {
    "file": "didgeridoo.png",
    "tense 1": "the",
    "tense 2": "that",
    "left": "transform: rotate(250deg) translate(-25px,35px)",
    "right": "transform: rotate(10deg) translate(-35px,25px)",
    "command": ["didgeridoo", "pipe", "wind", "doo", "didg"]
  },
  "sausage sanga": {
    "file": "sausage_sanga.png",
    "tense 1": "the",
    "tense 2": "that",
    "left": "transform: rotate(0deg) translate(50px,20px); width: 50px;",
    "right": "transform: rotate(0deg) translate(-30px,20px) scaleX(-1); width: 50px;",
    "command": ["sausage", "sandwich", "sanga", "snag", "bunning"]
  },
  "goon sack": {
    "file": "Goon_Sack.png",
    "tense 1": "the",
    "tense 2": "that",
    "left": "transform: rotate(0deg) translate(55px,-20px) scaleX(-1); width: 50px;",
    "right": "transform: rotate(0deg) translate(-30px,-20px); width: 50px;",
    "command": [
      "goon",
      "sack",
      "goon of fortune",
      "fancy",
      "fine dinning",
      "pillow"
    ]
  },
  "poop": {
    "file": "poop.png",
    "tense 1": "the",
    "tense 2": "that",
    "left": "transform: rotate(0deg) translate(55px,0px); width: 50px;",
    "right": "transform: rotate(0deg) translate(-30px,0px); width: 50px;",
    "command": ["poo", "catpoo", "cat poo"]
  },
  "nuke": {
    "file": "Nuke.png",
    "tense 1": "the",
    "tense 2": "that",
    "left": "transform: rotate(0deg) translate(10px,-48px); width: 50px;",
    "right": "transform: rotate(0deg) translate(10px,-48px); width: 50px;",
    "command": ["nuke", "boom", "explosion", "mushroom"]
  },
  "200 IQ": {
    "file": "200IQ.png",
    "tense 1": "the",
    "tense 2": "that",
    "left": "transform: rotate(0deg) translate(45px,-20px); width: 50px;",
    "right": "transform: rotate(0deg) translate(-20px,-20px); width: 50px;",
    "command": ["big brains", "smart", "smrt", "200", "IQ"]
  },
  "cat rocket": {
    "file": "Cat_Rocket.png",
    "tense 1": "the",
    "tense 2": "that",
    "left": "transform: translate(50px,-20px) rotate(50deg); width: 50px;",
    "right": "transform: translate(-25px,-20px) rotate(-40deg)  scaleX(-1); width: 50px;",
    "command": ["rocket", "bazooka", "rpg"]
  },
  "cat witch": {
    "file": "cat-witch.png",
    "tense 1": "the",
    "tense 2": "that",
    "left": "transform: translate(50px,-20px) rotate(0deg) scaleX(-1); width: 50px;",
    "right": "transform: translate(-25px,-20px) rotate(0deg); width: 50px;",
    "command": ["witch", "spell"]
  },
  "ghost cat": {
    "file": "GhostCat.png",
    "tense 1": "the",
    "tense 2": "that",
    "left": "transform: translate(50px,-20px) rotate(0deg); width: 50px;",
    "right": "transform: translate(-25px,-20px) rotate(0deg) scaleX(-1); width: 50px;",
    "command": ["ghost", "scare"]
  },
  "herd": {
    "file": "Herd.png",
    "tense 1": "the",
    "tense 2": "that",
    "left": "transform: translate(50px,-20px) rotate(0deg) scaleX(-1); width: 50px;",
    "right": "transform: translate(-25px,-20px) rotate(0deg); width: 50px;",
    "command": ["herd", "9 tails", "whip"]
  },
  "cat holding a heart": {
    "file": "Holding_Heart_Cat.png",
    "tense 1": "the",
    "tense 2": "that",
    "left": "transform: translate(50px,-20px) rotate(0deg) scaleX(-1); width: 50px;",
    "right": "transform: translate(-25px,-20px) rotate(0deg); width: 50px;",
    "command": ["heart", "hug"]
  },
  "cat litter": {
    "file": "Litter_badge.png",
    "tense 1": "the",
    "tense 2": "that",
    "left": "transform: translate(50px,-20px) rotate(0deg) scaleX(-1); width: 50px;",
    "right": "transform: translate(-25px,-20px) rotate(0deg); width: 50px;",
    "command": ["litter"]
  },
  "mad house": {
    "file": "Mad_House_2.png",
    "tense 1": "JD's",
    "tense 2": "that",
    "left": "transform: translate(50px,-20px) rotate(0deg) scaleX(-1); width: 50px;",
    "right": "transform: translate(-25px,-20px) rotate(0deg); width: 50px;",
    "command": ["mad", "house"]
  },
  "pumpkin": {
    "file": "Pumpkin.png",
    "tense 1": "the",
    "tense 2": "that",
    "left": "transform: translate(50px,-20px) rotate(0deg) scaleX(-1); width: 50px;",
    "right": "transform: translate(-25px,-20px) rotate(0deg); width: 50px;",
    "command": ["pumpkin"]
  },
  "purple conveyor belt": {
    "file": "purple.png",
    "tense 1": "the",
    "tense 2": "that",
    "left": "transform: translate(50px,-20px) rotate(0deg) scaleX(-1); width: 50px;",
    "right": "transform: translate(-25px,-20px) rotate(0deg); width: 50px;",
    "command": ["purple", "conveyor", "belt"]
  },
  "sassy's wedding ring": {
    "file": "Ring.png",
    "tense 1": "Sassy's",
    "tense 2": "that",
    "left": "transform: translate(50px,-20px) rotate(0deg); width: 50px;",
    "right": "transform: translate(-25px,-20px) rotate(0deg); width: 50px;",
    "command": ["ring", "where is it"]
  },
  "sleeping bot": {
    "file": "sleep.png",
    "tense 1": "the",
    "tense 2": "that",
    "left": "transform: translate(50px,-20px) rotate(0deg); width: 50px;",
    "right": "transform: translate(-25px,-20px) rotate(0deg); width: 50px;",
    "command": ["sleep"]
  },
  "spagehtti": {
    "file": "Spaghetti.png",
    "tense 1": "JD's",
    "tense 2": "that",
    "left": "transform: translate(50px,30px) rotate(0deg) scaleX(-1); width: 50px;",
    "right": "transform: translate(-25px,30px) rotate(0deg); width: 50px;",
    "command": ["spag", "conveyor", "belt"]
  },
  "wack from a cat with a bat": {
    "file": "Wack.png",
    "tense 1": "the",
    "tense 2": "that",
    "left": "transform: translate(50px,-20px) rotate(0deg); width: 50px;",
    "right": "transform: translate(-25px,-20px) rotate(0deg) scaleX(-1); width: 50px;",
    "command": ["bat", "paddle"]
  },
  "combat wombat": {
    "file": "Wombat.png",
    "tense 1": "the",
    "tense 2": "that",
    "left": "transform: translate(50px,-20px) rotate(0deg) scaleX(-1); width: 50px;",
    "right": "transform: translate(-25px,-20px) rotate(0deg); width: 50px;",
    "command": ["wombat"]
  },
}

export const weaponNames = Object.keys(weaponObjects)

export const weaponCount = weaponNames.length
