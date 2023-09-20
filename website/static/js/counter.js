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
var countCommand = urlParams.get('count');
if (countCommand == null) {
    countCommand = "!slap"
};
var countText = urlParams.get('text');
if (countText == null) {
    countText = "Incoming Sassy Slaps:"
};
document.getElementById("counter_text").innerText = countText;

var reset = urlParams.get('reset') != null;
var testing = urlParams.get('testing') != null;
var testMsg = urlParams.get('testing');
const storage = localStorage;

if (testing) {
    const testButtons = document.getElementById('testButtons');
    // deepcode ignore DOMXSS: No server connection.
    testButtons.innerHTML = `<button onclick="ws.onmessage(testData('${countCommand}'));">Msg: ${countCommand}</button>
                            <button onclick="ws.onmessage(testData('random'));">Msg: random</button>
                             <button onclick="resetCount()">Reset Count</button>`
}

// deepcode ignore MissingClose: Intentionally never closed.
const ws = new WebSocket(server);
const botID = "125";
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
                        "ChatMessage"
                    ]
                },
                "id": botID
            }
        ));
    }

    ws.onmessage = function (event) {
        const msg = event.data;
        const wsdata = JSON.parse(msg);

        if (wsdata.event && wsdata.event.source === 'Twitch') {
            validateCountMessage(wsdata.data.message.message)
        }
    }
};

function validateCountMessage(msg = "") {
    if (msg.startsWith(countCommand)) {
        updateCount(1);
    }
}
var countTotal;
initCount();

function initCount() {
    let initCount = storage.getItem(countCommand);
    if (reset || (initCount == null)) {
        console.log("reset || (initCount == null)")
        updateCount(0, set = true);
    } else if (initCount != null) {
        console.log("initCount != null")
        updateCount(Number(initCount), set = true)
    }
}

function updateCount(count = 0, set = false) {
    if (set) {
        countTotal = count
    } else {
        countTotal += count
    }
    storage.setItem(countCommand, countTotal)
    document.getElementById("count").innerText = countTotal.toString();
}

function resetCount() {
    updateCount(0, set = true);
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

function testData(message = countCommand) {
    class TestEvent {
        constructor(data) {
            this.data = JSON.stringify(data);
        }
    }
    return new TestEvent({
        "timeStamp": "2022-01-30T21:32:04.4588947-05:00",
        "event": {
            "source": "Twitch",
            "type": "ChatMessage"
        },
        "data": {
            "message": {
                "msgId": "a0d32df1-d3ca-4fd7-87fb-6c4e958550f0",
                "userId": 568765,
                "username": "<username>",
                "role": 4,
                "subscriber": true,
                "displayName": "<display name>",
                "channel": "<broadcaster's channel name>",
                "message": message,
                "isHighlighted": false,
                "isMe": false,
                "isCustomReward": false,
                "isAnonymous": false,
                "isReply": false,
                "bits": 0,
                "hasBits": false,
                "emotes": [
                    {
                        "id": "300400304",
                        "type": "Twitch",
                        "name": "nate121Raid",
                        "startIndex": 5,
                        "endIndex": 15,
                        "imageUrl": "https://static-cdn.jtvnw.net/emoticons/v2/300400304/default/dark/2.0"
                    }
                ],
                "cheerEmotes": []
            }
        }
    })
}

function main() {
    connectws();
    if (testing) {
        ws.onmessage(testData(testMsg))
    }
}
main()