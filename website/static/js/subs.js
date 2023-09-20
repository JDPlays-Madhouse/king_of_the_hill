function modifyStyleSheet(element, selector, value) {
    // Getting the stylesheet
    const stylesheet = document.styleSheets[0];
    let elementRules;

    // looping through all its rules and getting your rule
    for (let i = 0; i < stylesheet.cssRules.length; i++) {
        if (stylesheet.cssRules[i].selectorText === element) {
            elementRules = stylesheet.cssRules[i];
        }
    }
    // modifying the rule in the stylesheet
    elementRules.style.setProperty(selector, value);
}

function rgba(r, g, b, a = 1) {
    return `rgba(${r}, ${g}, ${b}, ${a})`
}

const shadowColour = rgba(0, 0, 0, 1);
const fontColour = rgba(255, 255, 255, 1);

modifyStyleSheet(":root", "--font-colour", fontColour)
modifyStyleSheet(":root", "--shadow-colour", shadowColour)


const urlParams = new URLSearchParams(window.location.search);
var wsPort = urlParams.get('wsPort');
if (wsPort === null) {
    wsPort = 8080;
};

var server = urlParams.get('server');
if (!(server === null)) {
    server = `ws://${server}:${wsPort}/`;
} else {
    server = `ws://localhost:${wsPort}/`;
};

var reset = urlParams.get('reset') != null;
var testing = urlParams.get('testing') != null;
const storage = localStorage;
const setSubCount = "!setsubcount"
var authUser = ['ozy_viking',];
const tier = {
    1: 0,
    2: 0,
    3: 0
};

const tierValue = {
    1: 1,
    2: 2,
    3: 6
}

const tierName = {
    1: "tier1",
    2: "tier2",
    3: "tier3"
};

updateScore(1, initScore(1), true);
updateScore(2, initScore(2), true);
updateScore(3, initScore(3), true);

if (testing) {
    const testButtons = document.getElementById('testButtons');
    testButtons.innerHTML = `<button onclick="ws.onmessage(testData('Sub', 1));">Tier 1 Sub (1)</button>
                            <button onclick="ws.onmessage(testData('ReSub', 2));">Tier 2 ReSub (2)</button>
                            <button onclick="ws.onmessage(testData('GiftSub', 3));">Tier 3 Gift Sub (6)</button>
                            <button onclick="ws.onmessage(testData('GiftBomb', 1));">GiftBomb 10 Tier 1 (10)</button>
                            <button onclick="resetSubCount()">Reset Count</button>`
}

function initScore(tierInt) {
    let initTierScore = storage.getItem(tierName[tierInt]);
    if (reset) {
        initTierScore = 0
    }
    if (initTierScore != null) {
        return Number(initTierScore)
    }
    storage.setItem(tierName[tierInt], 0)
    return 0
}

function updateScore(tierInt, subs, set = false) {
    if (set) {
        tier[tierInt] = subs
    } else {
        tier[tierInt] += subs
    }
    storage.setItem(tierName[tierInt], tier[tierInt])
    // const tierElement = document.getElementById(`t${tierInt}`);
    // tierElement.innerHTML = tier[tierInt].toString();
    const total = document.getElementById("total");
    total.innerHTML = totalScore(tier[1], tier[2], tier[3]).toLocaleString('en');
}
function resetSubCount() {
    updateScore(1, 0, true);
    updateScore(2, 0, true);
    updateScore(3, 0, true);
}
function totalScore(t1, t2, t3) {
    return tierValue[1] * t1 + tierValue[2] * t2 + tierValue[3] * t3
}

function testButtons(tier) {
    ws.onmessage(testData("Sub", tier))
}

function subSwitch(subTier, subs = 1) {
    console.log(subTier)
    switch (subTier) {
        case 2:
            updateScore(2, subs)
            break;
        case 3:
            updateScore(3, subs)
            break;
        default: // tier 1 or prime (0)
            updateScore(1, subs)
    }
}
// file deepcode ignore MissingClose: Not relevent.
const ws = new WebSocket(server);
const botID = "124";
function connectws() {
    ws.onclose = function () {
        setTimeout(connectws, 10000);
    };

    ws.onopen = function () {
        ws.send(JSON.stringify(
            {
                "request": "Subscribe",
                "events": {
                    "Twitch": [
                        "Sub",
                        "ReSub",
                        "GiftSub",
                        "GiftBomb",
                        "ChatMessage",
                        "Whisper"
                    ]
                },
                "id": botID
            }
        ));
        ws.send(JSON.stringify(
            {
                "request": "GetBroadcaster",
                "id": "1"
            }));


    }

    ws.onmessage = function (event) {
        // console.log(event)
        const msg = event.data;
        // console.log(event.data)
        const wsdata = JSON.parse(msg);
        // console.log(wsdata.event && wsdata.event.source === 'Twitch')
        if (wsdata.id == "1") {
            authUser = [...authUser, wsdata.platforms.twitch.broadcastUserName]
        }
        if (wsdata.event && wsdata.event.source === 'Twitch') {
            // console.log(wsdata.data.message.username)
            // console.log(wsdata.event.type, wsdata.data.subTier)
            if (["Sub", "ReSub", "GiftSub"].includes(wsdata.event.type)) {
                subSwitch(wsdata.data.subTier)
            } else if (wsdata.event.type == "GiftBomb") {
                subSwitch(wsdata.data.subTier, wsdata.data.gifts)
            } else if (["Whisper", "ChatMessage"].includes(wsdata.event.type) && authUser.includes(wsdata.data.message.username)) {
                if (wsdata.data.message.message.toLowerCase().startsWith(setSubCount)) {
                    console.log(wsdata.data.message.message)
                    let newCount = wsdata.data.message.message.split(" ").slice(1);
                    for (let i = 0; i < newCount.length; i++) {
                        newCount[i] = Number(newCount[i])
                        if (Number.isNaN(newCount[i])) {
                            newCount[i] = 0
                        }
                    }
                    if (newCount.length == 1) {
                        updateScore(1, newCount[0], set = true)
                        updateScore(2, 0, set = true)
                        updateScore(3, 0, set = true)
                    } else if (newCount.length == 3) {
                        updateScore(1, newCount[0], set = true)
                        updateScore(2, newCount[1], set = true)
                        updateScore(3, newCount[2], set = true)
                    }

                }

            }
        }
    }
}

function notify(message) {
    console.log(message);
    ws.send(JSON.stringify(
        {
            "request": "DoAction",
            "action": {
                "name": "SubMessage"
            },
            "args": {
                "rawInput": message
            },
            "id": botID
        }));
};



function testData(subType = "Sub", subTier = 3) {
    class TestEvent {
        constructor(data) {
            this.data = JSON.stringify(data);
        }
    }
    return new TestEvent({
        "timeStamp": "2022-01-30T21:32:04.4588947-05:00",
        "event": {
            "source": "Twitch",
            "type": subType
        },
        "data": {
            "subTier": subTier, /* 0 - Prime, 1 - Tier 1, 2 - Tier 2, 3 - Tier 3 */
            ...testSubSwitch(subType)
        },
    })
}


const sub = {
    "color": "#008D99",
    "emotes": [],
    "message": "",
    "userId": 34567898765,
    "userName": "<username>",
    "displayName": "<display name>",
    "role": 1 /* 1 - Viewer, 2 - VIP, 3 - Moderator, 4 - Broadcaster  */
};
const resub = {
    "cumulativeMonths": 25,
    "shareStreak": true,
    "streakMonths": 1,
    "color": "#FF4500",
    "emotes": [],
    "message": "",
    "userId": 162909743,
    "userName": "admiralai",
    "displayName": "AdmiralAI",
    "role": 1 /* 1 - Viewer, 2 - VIP, 3 - Moderator, 4 - Broadcaster  */
};
const giftsub = {
    "isAnonymous": false,
    "totalSubsGifted": 1,
    "cumulativeMonths": 4,
    "monthsGifted": 1,
    "fromSubBomb": false,
    "subBombCount": 1,
    "recipientUserId": 9876567,
    "recipientUsername": "<username of recipient>",
    "recipientDisplayName": "<display name of recipient>",
    "userId": 3987654567,
    "userName": "<username of gifter>",
    "displayName": "<displayname of gifter>",
    "role": 1 /* 1 - Viewer, 2 - VIP, 3 - Moderator, 4 - Broadcaster  */
};
const giftbomb = {
    "isAnonymous": false,
    "gifts": 10,
    "totalGifts": 0,
    "userId": 45678,
    "userName": "<username of gifter>",
    "displayName": "<displayname of gifter>",
    "role": 1 /* 1 - Viewer, 2 - VIP, 3 - Moderator, 4 - Broadcaster  */
};
function testSubSwitch(subType) {
    switch (subType) {
        case "Sub":
            return sub;
        case "ReSub":
            return resub
        case "GiftBomb":
            return giftbomb
        case "GiftSub":
            return giftsub
    }
}

function main() {
    connectws();
    // if (testing) {
    //     // file deepcode ignore CodeInjection: Code injection is not possible.
    //     setTimeout(ws.onmessage, 500, testData("GiftBomb", 1));
    // }
}
main();
