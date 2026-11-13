const urlParams = new URLSearchParams(window.location.search);
var wsPort = urlParams.get("wsPort");
if (wsPort === null) {
  wsPort = 8080;
}

var server = urlParams.get("server");
if (!(server === null)) {
  server = `ws://${server}:${wsPort}/`;
} else {
  server = `ws://localhost:${wsPort}/`;
}
var countCommand = urlParams.get("count");
if (countCommand == null) {
  countCommand = "!slap";
}
var countText = urlParams.get("text");
if (countText == null) {
  countText = "Slap Counter:";
}
document.getElementById("counter_text").innerText = countText;
var reset = urlParams.get("reset") != null;
var testing = urlParams.get("testing") != null;
var testMsg = urlParams.get("testing");
var timeout = urlParams.get("timeout");
var countCommandAllowed = true;
const setCountCommand = "!setcount";
var authUsers = ["ozy_viking"];
if (timeout == null) {
  timeout = 0;
} else {
  try {
    timeout = Number(timeout);
    if (Number.isNaN(timeout)) {
      timeout = 0;
    }
  } catch (error) {
    timeout = 0;
  }
}
console.log(timeout);
const storage = localStorage;

if (testing) {
  const testButtons = document.getElementById("testButtons");
  // deepcode ignore DOMXSS: No server connection.
  testButtons.innerHTML = `<button onclick="ws.onmessage(testData('${countCommand}'));">Msg: ${countCommand}</button>
                            <button onclick="ws.onmessage(testData('random'));">Msg: random</button>
                             <button onclick="resetCount()">Reset Count</button>`;
}

// deepcode ignore MissingClose: Intentionally never closed.
const ws = new Streamerbot.Connection(server, {
  password: urlParams.get("wsPassword") || "",
});
const botID = "125";
function connectws() {
  ws.onopen = function () {
    ws.send(
      JSON.stringify({
        request: "Subscribe",
        events: {
          Twitch: ["ChatMessage", "Whisper"],
        },
        id: botID,
      })
    );
    ws.send(
      JSON.stringify({
        request: "GetBroadcaster",
        id: "1",
      })
    );
  };

  ws.onmessage = function (event) {
    let wsdata;
    try {
      wsdata = JSON.parse(event.data);
    } catch (error) {
      return;
    }
    if (!wsdata || typeof wsdata !== "object") {
      return;
    }
    if (wsdata.id === "1" && wsdata.status === "ok") {
      const broadcaster = wsdata.platforms && wsdata.platforms.twitch;
      if (broadcaster) {
        for (const name of [broadcaster.broadcastUser, broadcaster.broadcastUserName]) {
          if (typeof name === "string" && name.length > 0) {
            authUsers.push(name.toLowerCase());
          }
        }
      }
    }
    const message = Streamerbot.normalizeTwitchMessage(wsdata);
    if (!message) {
      return;
    }
    const authorized = authUsers.includes(message.login.toLowerCase()) ||
      (wsdata.event.type === "ChatMessage" && message.role >= 3);
    if (message.text.toLowerCase().startsWith(setCountCommand) && authorized) {
      const newCount = Number(message.text.split(" ")[1]);
      if (Number.isFinite(newCount)) {
        updateCount(newCount, true);
      }
    } else if (countCommandAllowed) {
      validateCountMessage(message.text);
    }
  };
}

function validateCountMessage(msg = "") {
  if (msg.toLowerCase().startsWith(countCommand)) {
    updateCount(1);
    if (timeout > 0) {
      setCommandLockout(timeout);
    }
  }
}

var countTotal;
initCount();

function initCount() {
  let initCount = storage.getItem(countCommand);
  if (reset || initCount == null) {
    console.log("reset || (initCount == null)");
    updateCount(0, (set = true));
  } else if (initCount != null) {
    console.log("initCount != null");
    updateCount(Number(initCount), (set = true));
  }
}

/**
 * Sets a cooldown for the command.
 * @param {number} cooldown - Time in seconds that the count will not increase.
 */
function setCommandLockout(cooldown) {
  console.log("Start Cooldown");
  countCommandAllowed = false;
  setTimeout(() => {
    console.log("End Cooldown");
    countCommandAllowed = true;
  }, cooldown * 1000);
}

function updateCount(count = 0, set = false) {
  if (set) {
    countTotal = count;
  } else {
    countTotal += count;
  }
  storage.setItem(countCommand, countTotal);
  document.getElementById("count").innerText = countTotal.toString();
}

function resetCount() {
  updateCount(0, (set = true));
}
function notify(message) {
  console.log(message);
  ws.send(
    JSON.stringify({
      request: "DoAction",
      action: {
        name: "SubMessage",
      },
      args: {
        rawInput: message,
      },
      id: botID,
    })
  );
}

function testData(message = countCommand) {
  return {
    data: JSON.stringify({
      event: { source: "Twitch", type: "ChatMessage" },
      data: {
        messageId: "a0d32df1-d3ca-4fd7-87fb-6c4e958550f0",
        text: message,
        user: {
          id: "568765",
          login: "test_broadcaster",
          name: "Test Broadcaster",
          role: 4,
        },
      },
    }),
  };
}

function main() {
  connectws();
  if (testing) {
    ws.onmessage(testData(testMsg));
  }
}
main();
