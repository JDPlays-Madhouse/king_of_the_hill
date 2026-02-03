import { PLATFORM, Randomizer, removeElement, sides } from "../util.js";
import { storage } from "./constants.js";
import {
    motionDown,
    riggedMotion,
    winnerMotion,
    winnerMotionExit,
} from "./playerMotion.js";
import { notify } from "./streamerBot.js";
import {
    winStreak,
    winner,
    winStreakOrder,
    botID,
    championName,
} from "./urlParams.js";
import {
    weaponObjects,
    weaponObjectsTesting,
    weaponNames,
    weaponNamesTesting,
} from "./weapons.js";

const scaleLastWinner = 2;
const winStreakNumber = winStreak;

export var winnerHistory = getWinnerHistory();

var currentWinStreakWinners = [];

export class LastWinner {
    static key = "lastWinner";
    static divID = "lastWinner";
    constructor(
        username,
        weapon,
        side,
        rigged = false,
        platform = PLATFORM.Twitch,
        ImageURL = "",
        joinTitle = "",
    ) {
        this.username = username;
        this.weapon = weapon;
        this.side = side;
        this.rigged = rigged;
        this.platform = platform;
        this.ImageURL = ImageURL;
        this.joinTitle = joinTitle;
        addToWinnerHistory(username); // BUG: Fix the multi-platform username issue.
    }
    get obj() {
        return {
            username: this.username,
            weapon: this.weapon,
            side: this.side,
            rigged: this.rigged,
            platform: this.platform,
            ImageURL: this.ImageURL,
            joinTitle: this.joinTitle,
        };
    }
    get json() {
        console.log(JSON.stringify(this.obj));
        return JSON.stringify(this.obj);
    }
    save() {
        storage.setItem(LastWinner.key, this.json);
    }
    static exists() {
        return storage.getItem(LastWinner.key) ? true : false;
    }
    static fetch() {
        if (!storage.getItem(LastWinner.key)) {
            return undefined;
        }
        // @ts-ignore
        let lw = JSON.parse(storage.getItem(LastWinner.key));
        return new LastWinner(
            lw.username,
            lw.weapon,
            lw.side,
            lw.rigged,
            lw.platform,
            lw.ImageURL,
            lw.joinTitle,
        );
    }
}

export var lastWinner;
const lastWinnerKey = LastWinner.key;

class WinCounter {
    static key = "winCounter";
    #username;
    #wins;
    #history;
    constructor() { }

    static init() {
        if (storage.koth) {
            return new WinCounter();
        }
    }
}
const winStreakKey = WinCounter.key;

class ConsecutiveCounter {
    static key = "consecutiveWinnerHistory";
    #username;
    #wins;
    #previousWinners;
    #history; // Todo: Have a running history.
    #limit = winStreakNumber;

    constructor(
        username = undefined,
        wins = 0,
        previousWinners = [],
        history = [],
    ) {
        this.#username = username;
        this.#wins = wins;
        this.#previousWinners = previousWinners;
        this.#history = history;
    }
    set wins(value) {
        console.log(value);
        this.#wins = value;
    }
    set username(value) {
        this.#username = value;
    }
    get wins() {
        return this.#wins;
    }
    get username() {
        return this.#username;
    }
    get previousWinners() {
        return this.#previousWinners;
    }
    get message() {
        return `OMG @${this.username}, You have won ${this.#limit
            } times in a row and now you get a free game!`;
    }
    get previousWinnersTotal() {
        return this.#previousWinners.length;
    }
    get toJSON() {
        let obj = {
            username: this.#username,
            wins: this.#wins,
            prevWinner: this.#previousWinners,
        };
        return JSON.stringify(obj);
    }
    notifyWinner() {
        notify(this.message);
    }
    save(key = ConsecutiveCounter.key) {
        storage.setItem(key, this.toJSON);
    }
    equal(username) {
        return username === this.#username;
    }
    increase(username = this.#username) {
        if (this.equal(username)) {
            this.#wins += 1;
        } else {
            this.#username = username;
            this.#wins = 1;
        }
        this.save();
    }
    checkIfWon(username) {
        if (this.#wins >= this.#limit) {
            console.warn("Above win limit, setting win counter to 0!");
            this.#wins = 0;
        }
        this.increase(username);
        if (!(winStreakNumber > 0)) {
            // console.warn("winStreakNumber > 0:", winStreakNumber > 0)
            return false;
        }
        if (!(winStreakNumber === this.#wins)) {
            // console.warn("winStreakNumber === this.#wins:", winStreakNumber === this.#wins)
            return false;
        }
        if (this.previousWinnersTotal >= winner) {
            // console.warn("this.previousWinnersTotal >= winner:", this.previousWinnersTotal >= winner, this.previousWinnersTotal)
            return false;
        }
        this.winner();
        return true;
    }
    winner() {
        this.notifyWinner();
        this.#previousWinners.push(this.#username);
        this.#wins = 0;
        this.save();
    }
    previousWinnersCount() {
        var array = this.#previousWinners;
        var obj = {};
        for (var i = 0; i < array.length; i++) {
            obj[array[i]] = (obj[array[i]] || 0) + 1;
        }
        return obj;
    }
    static fromJSON(jsonString) {
        let jsonObj = JSON.parse(jsonString);
        let tempUser = jsonObj.username;
        let tempWins = jsonObj.wins ? jsonObj.wins : 0;
        let tempPrevWinner = jsonObj.prevWinner ? jsonObj.prevWinner : [];
        return new ConsecutiveCounter(tempUser, tempWins, tempPrevWinner);
    }
    static init(key = ConsecutiveCounter.key) {
        if (storage.getItem(key)) {
            return ConsecutiveCounter.fromJSON(storage.getItem(key));
        }
        return new ConsecutiveCounter();
    }
}

const consecutiveCounter = ConsecutiveCounter.init();

function userWinCount(username) {
    return currentWinStreakWinners.filter((x) => x == username).length;
}

function addToWinnerHistory(username) {
    if (winnerHistory[username]) {
        winnerHistory[username] += 1;
    } else {
        winnerHistory[username] = 1;
    }
    saveWinnerHistory();
}

function saveWinnerHistory(key = "winnerHistory") {
    if (!Object.keys(winnerHistory).includes(winStreakKey)) {
        winnerHistory[winStreakKey] = currentWinStreakWinners;
    }
    storage.setItem(key, JSON.stringify(winnerHistory));
}

function getWinnerHistory(key = "winnerHistory") {
    let tempWinnerHistory = JSON.parse(storage.getItem(key));
    return tempWinnerHistory
        ? tempWinnerHistory
        : { winStreakKey: currentWinStreakWinners };
}

export function lastWinnerDiv() {
    // TODO: Refactor this function to use the User class.
    lastWinner = LastWinner.fetch();
    if (lastWinner == undefined) {
        return;
    }
    let weapon;
    if (weaponNames.includes(lastWinner.weapon)) {
        weapon = weaponObjects[lastWinner.weapon];
    } else if (weaponNamesTesting.includes(lastWinner.weapon)) {
        weapon = weaponObjectsTesting[lastWinner.weapon];
    }
    let platform = lastWinner.platform;
    var winnerSide = lastWinner.side;
    var username = lastWinner.username.toLowerCase();
    let side = lastWinner.side;
    if (platform == PLATFORM.Twitch) {
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                // get display image for the user
                // console.log("got a response back");
                //save this to cache between sessions too.
                //check for user being added already (or if already dead and ignore)
                if (document.getElementById("lastWinner")) {
                    try {
                        removeElement("lastWinner");
                    } catch (error) { }
                }
                var warp = document.getElementById("lastWinnerDiv"),
                    innerWidth = window.innerWidth,
                    innerHeight = window.innerHeight;
                // Load into page
                var lastWinnerDiv = document.createElement("div");
                lastWinnerDiv.id = "lastWinner";
                lastWinnerDiv.setAttribute("user", lastWinner.username);
                lastWinnerDiv.style.background = `url(${xhttp.responseText})`;
                lastWinnerDiv.style.backgroundSize = "100% 100%";
                lastWinnerDiv.setAttribute("weapon", `${weapon.name}`);
                // deepcode ignore DOMXSS: Only ran clientside.
                lastWinnerDiv.innerHTML = `<img style='${weapon[winnerSide]}' src='static/images/${weapon.file}'/><img class='${side} ${platform}' src='static/images/${platform}.png'/>`;
                TweenLite.set(lastWinnerDiv, {
                    className: "falling-element",
                    x: innerWidth / 2 - 45,
                    y: innerHeight - 150,
                    z: 0,
                    scale: 1.5,
                });
                warp.appendChild(lastWinnerDiv);

                let lastWinnerNameDiv = document.createElement("div");
                lastWinnerNameDiv.id = "lastWinnerName";
                lastWinnerNameDiv.innerHTML = `Defending ${lastWinner.joinTitle}:<br>${lastWinner.username}`;
                lastWinnerDiv.appendChild(crown(winnerSide, lastWinner.username));
                lastWinnerDiv.appendChild(lastWinnerNameDiv);
                if (lastWinner.rigged) {
                    winnerMotion(lastWinnerDiv, true, scaleLastWinner + 0.25, true);
                } else {
                    winnerMotion(lastWinnerDiv, true, scaleLastWinner, false);
                }
            }
        };
        xhttp.open("GET", "https://decapi.me/twitch/avatar/" + username, true);
        xhttp.send();
    } else if (lastWinner.platform == PLATFORM.YouTube) {
        if (document.getElementById("lastWinner")) {
            try {
                removeElement("lastWinner");
            } catch (error) { }
        }
        var warp = document.getElementById("lastWinnerDiv"),
            innerWidth = window.innerWidth,
            innerHeight = window.innerHeight;
        // Load into page
        var lastWinnerDiv = document.createElement("div");
        lastWinnerDiv.id = "lastWinner";
        lastWinnerDiv.setAttribute("user", lastWinner.username);
        lastWinnerDiv.setAttribute("weapon", `${weapon.name}`);
        lastWinnerDiv.style.background = `url('${lastWinner.ImageURL}')`;
        lastWinnerDiv.style.backgroundSize = "100% 100%";
        lastWinnerDiv.innerHTML = `<img style='${weapon[winnerSide]}' src='static/images/${weapon.file}'/> <img class='${side} ${platform}' src='static/images/${platform}.png'/>`;
        TweenLite.set(lastWinnerDiv, {
            className: "falling-element",
            x: innerWidth / 2 - 45,
            y: innerHeight - 150,
            z: 0,
            scale: 1.5,
        });
        warp.appendChild(lastWinnerDiv);

        let lastWinnerNameDiv = document.createElement("div");
        lastWinnerNameDiv.id = "lastWinnerName";
        lastWinnerNameDiv.innerHTML = `Defending ${championName}:<br>${lastWinner.username}`;
        lastWinnerDiv.appendChild(crown(winnerSide, lastWinner.username));
        lastWinnerDiv.appendChild(lastWinnerNameDiv);
        if (lastWinner.rigged) {
            winnerMotion(lastWinnerDiv, true, scaleLastWinner + 0.25, true);
        } else {
            winnerMotion(lastWinnerDiv, true, scaleLastWinner, false);
        }
    }
}

export function removeLastWinner(id = LastWinner.divID) {
    try {
        if (document.getElementById(id)) {
            let element = document.getElementById(id);
            winnerMotionExit(element, true);
        }
    } catch (error) {
        console.error(error);
    }
}

export function clearWinnerHistory() {
    storage.removeItem(LastWinner.key);
    storage.removeItem("winnerHistory");
    storage.removeItem(winStreakKey);
    storage.removeItem(ConsecutiveCounter.key);
    winnerHistory = {};
}

function winStreakCondition(win) {
    if (win < winStreakNumber) {
        return false;
    } else if (win % winStreakNumber === 0) {
        return true;
    } else {
        return false;
    }
}

export function winStreakHandler(username) {
    let wins = winnerHistory[username];
    if (["any", "both"].includes(winStreakOrder) && winStreakCondition(wins)) {
        let winStreakMessage = `WOW @${username}, You have won ${wins} times this stream!`;
        currentWinStreakWinners.push(username);
        notify(winStreakMessage);
    }
    if (["consecutive", "both"].includes(winStreakOrder)) {
        consecutiveCounter.checkIfWon(username);
    }
}

function crown(side, user) {
    let element = document.createElement("img");
    element.src = "/static/images/crown.png";
    element.id = "lastWinnerCrown";
    if (user == "Ozy_Viking") {
        let op = Randomizer(0, 5);
        element.className = op == 4 ? "crownOzyViking" : `${side} op${op}`;
    } else if (user == "Naval_Warlord") {
        element.className = "crownNavalWarlord";
    } else {
        element.className = `${side} op${Randomizer(0, 4)}`;
    }
    return element;
}
