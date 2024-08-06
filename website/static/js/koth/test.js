import { PLATFORM } from "../util.js";

const testPeople = {
  Naval_Warlord: {
    user: "Naval_Warlord",
    platform: PLATFORM.Twitch,
    profileImageUrl: "",
  },
  Ozy_Viking: {
    user: "Ozy_Viking",
    platform: PLATFORM.Twitch,
    profileImageUrl: "",
  },
  JDPlays: { user: "JDPlays", platform: PLATFORM.Twitch, profileImageUrl: "" },
  the_rubble: {
    user: "the_rubble",
    platform: PLATFORM.Twitch,
    profileImageUrl: "",
  },
  steveo0938: {
    user: "steveo0938",
    platform: PLATFORM.Twitch,
    profileImageUrl: "",
  },
  "Zack Hankin": {
    user: "Zack Hankin",
    platform: PLATFORM.YouTube,
    profileImageUrl:
      "https://yt3.ggpht.com/ytc/AIdro_nLnT3RLH1n_44BYrD9PaESIplJofIASyfypZMuDA=s88-c-k-c0x00ffffff-no-rj",
  },
};

export const testingPeople = Object.keys(testPeople);

export function randomPlayer(player = null) {
  if (player) {
    return player;
  }
  return testingPeople[Math.floor(Math.random() * testingPeople.length)];
}

export function kothTestEvent(
  ws,
  joinCommand,
  username = "ozy_viking",
  weapon = ""
) {
  class TestEvent {
    constructor(data) {
      this.data = JSON.stringify(data);
    }
  }
  const { user, platform, profileImageUrl } = testPeople[username];
  console.log({ user, platform, profileImageUrl, weapon });
  if (platform === PLATFORM.Twitch) {
    ws.onmessage(
      new TestEvent({
        timeStamp: "2022-01-30T21:32:04.4588947-05:00",
        event: {
          source: "Twitch",
          type: "ChatMessage",
        },
        data: {
          message: {
            msgId: "a0d32df1-d3ca-4fd7-87fb-6c4e958550f0",
            userId: 1231453,
            username: user,
            role: 1,
            subscriber: true,
            displayName: user,
            channel: "<broadcaster's channel name>",
            message: `${joinCommand} ${weapon}` /* The message the user sent */,
            isHighlighted: false,
            isMe: false,
            isCustomReward: false,
            isAnonymous: false,
            isReply: false,
            bits: 0,
            hasBits: false,
            emotes: [
              {
                id: "300400304",
                type: "Twitch",
                name: "nate121Raid",
                startIndex: 5,
                endIndex: 15,
                imageUrl:
                  "https://static-cdn.jtvnw.net/emoticons/v2/300400304/default/dark/2.0",
              },
            ],
            cheerEmotes: [],
          },
        },
      })
    );
  } else if (platform === PLATFORM.YouTube) {
    ws.onmessage(
      new TestEvent({
        timeStamp: "2024-03-31T11:16:52.5261243+11:00",
        event: {
          source: "YouTube",
          type: "Message",
        },
        data: {
          message: `${joinCommand} ${weapon}` /* The message the user sent */,
          eventId: "LCC.EhwKGkNKTEU4ZENjbllVREZhN0R3Z1Fka2NZTVhB",
          user: {
            id: "UC-N0XbvGyBfqmJh7ZFQe00A",
            url: "http://www.youtube.com/channel/UC-N0XbvGyBfqmJh7ZFQe00A",
            name: user,
            profileImageUrl: profileImageUrl,
            isOwner: true,
            isModerator: false,
            isSponsor: false,
            isVerified: false,
          },
          publishedAt: "2024-03-31T11:16:51.066908+11:00",
        },
      })
    );
  }
}
