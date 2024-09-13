import { PLATFORM, SIDE } from "../util.js";
import { storage } from "./constants.js";
import { hillName, PlatformSide } from "./urlParams.js";

const SCOREBOARD_NAME = "platformBattleScoreboard";

export function updateScoreboard() {
  const scoreboardElement = document.getElementById(SCOREBOARD_NAME);
  scoreboardElement.innerHTML = `${scoreboard.twitch} - ${scoreboard.youtube}`;
}

function twitchScoreboard(logoFunction) {
  let score = document.createElement("div");
  score.id = "twitch_score";
  score.innerHTML = scoreboard.twitch;
  score.className = "Twitch score textMoveUp";

  let twitch = document.createElement("div");
  twitch.className = "Twitch logo_score";
  twitch.appendChild(score);
  twitch = logoFunction(twitch, "Twitch", "Twitch score_logo logo_score");
  return twitch;
}
function youtubeScoreboard(logoFunction) {
  let score = document.createElement("div");
  score.id = "youtube_score";
  score.innerHTML = scoreboard.youtube;
  score.className = "YouTube score textMoveUp";

  let youtube = document.createElement("div");
  youtube.className = "YouTube logo_score";
  youtube.appendChild(score);
  youtube = logoFunction(youtube, "YouTube", "YouTube score_logo logo_score");
  return youtube;
}

export function resetScoreboard() {
  scoreboard.twitch = 0;
  scoreboard.youtube = 0;
  updateScoreboard();
}

function logoPath(platform) {
  return `/static/images/${platform}.png`;
}

export function twitchTitle(withLogo = true) {
  let twitch = document.createElement("div");
  twitch.id = "twitch_title";
  twitch.innerHTML = "Twitch";
  twitch.className = "Twitch platform_title textMoveUp";
  twitch = withLogo ? prependLogo(twitch, "Twitch", "titlelogo") : twitch;
  return twitch;
}

export function youtubeTitle(withLogo = true) {
  let youtube = document.createElement("div");
  youtube.id = "youtube_title";
  youtube.innerHTML = "YouTube";
  youtube.className = "YouTube platform_title textMoveUp";
  youtube = withLogo ? prependLogo(youtube, "YouTube", "titlelogo") : youtube;
  return youtube;
}

export function prependLogo(title, platform, className = " platform_logo") {
  const logo = document.createElement("img");
  logo.src = logoPath(platform);
  logo.alt = platform + " logo";
  logo.className += `${platform} ${className}`;
  const logoDiv = document.createElement("div");
  logoDiv.className = "logoWrapper";
  logoDiv.appendChild(logo);

  let titleDiv = document.createElement("div");
  titleDiv.className += "platform_logo " + className;
  titleDiv.appendChild(logoDiv);
  titleDiv.appendChild(title);
  return titleDiv;
}
export function appendLogo(title, platform, className = " platform_logo") {
  const logo = document.createElement("img");
  logo.src = logoPath(platform);
  logo.alt = platform + " logo";
  logo.className = `${platform} ${className}`;
  const logoDiv = document.createElement("div");
  logoDiv.className = "logoWrapper";
  logoDiv.appendChild(logo);

  let titleDiv = document.createElement("div");
  titleDiv.className += className;
  titleDiv.appendChild(title);
  titleDiv.appendChild(logoDiv);

  return titleDiv;
}

function bottomMessage(message) {
  let bottom = document.createElement("div");
  bottom.id = "bottom_message";
  bottom.innerHTML = message;
  return bottom;
}

export function firstClaimMessage(hillName = "Hill") {
  return bottomMessage(`First to claim the ${hillName}!`);
}
export function reclaimMessage(hillName = "Hill") {
  return bottomMessage(`Reclaims the ${hillName}!`);
}

export function holdsMessage(hillName = "Hill") {
  return bottomMessage(`Holds the ${hillName}!`);
}

export function scoreboardMotion(
  entry = true,
  element = null,
  motionDuration = 0.75,
  delay = 0,
) {
  if (entry) {
    TweenLite.set({ opacity: 0 });
    TweenMax.to(element, motionDuration, {
      opacity: 1,
      delay: delay,
    });
  } else {
    TweenMax.to(element, motionDuration, { opacity: 0, delay: delay });
  }
  return element;
}

class PlatformState {
  static TYING_WON = 0;
  static TYING_LOSE = 1;
  static WINNING_WON = 2;
  static WINNING_LOSE = 3;
  static LOSING_WON = 4;
  static LOSING_LOSE = 5;
}
class PlatformScoreState {
  static TYING = 0;
  static WINNING = 1;
  static LOSING = 2;
}

export class Scoreboard {
  key = SCOREBOARD_NAME;
  id = "platformBattleDisplay";
  outerDiv = "platformBattle";
  motionDuration = 0.5;
  platformBattleDisplayDiv;

  constructor() {
    if (!this.hasKey()) {
      this.store(this.reset());
    }
    const sb = this.getFromStorage() || this.reset();
    this.twitchSide = PlatformSide.Twitch;
    this.history = sb.history;
  }

  get score() {
    return {
      Twitch: this.twitch,
      YouTube: this.youtube,
    };
  }

  get twitch() {
    return this.getScore(PLATFORM.Twitch);
  }

  get youtube() {
    return this.getScore(PLATFORM.YouTube);
  }

  get lastWinner() {
    if (this.history.length > 0) {
      return this.history[this.history.length - 1];
    }
    return null;
  }

  getScore(platform) {
    return this.history.filter((winner) => winner === platform).length;
  }
  hasKey() {
    return storage.getItem(this.key) !== null;
  }

  getFromStorage() {
    return JSON.parse(storage.getItem(this.key));
  }

  reset() {
    this.history = [];
    this.store();
    return this;
  }

  store(data = this) {
    storage.setItem(this.key, JSON.stringify(data.obj));
  }

  get obj() {
    return {
      history: this.history,
    };
  }

  get isReclaiming() {
    return (
      this.history.length > 1 &&
      this.history[this.history.length - 1] !==
        this.history[this.history.length - 2]
    );
  }

  displayScoreboard() {
    const scoreboardDiv = document.createElement("div");
    scoreboardDiv.id = "platformBattleScoreboard";
    scoreboardDiv.className = "scoreboard platformBattleScoreboard";
    let separator = document.createElement("div");
    separator.className = "separator textMoveUp";
    separator.innerHTML = "-";

    if (this.twitchSide === SIDE.left) {
      let twitch = twitchScoreboard(prependLogo, "Twitch logo_score");
      let youtube = youtubeScoreboard(appendLogo, "YouTube logo_score");

      scoreboardDiv.appendChild(twitch);
      scoreboardDiv.appendChild(separator);
      scoreboardDiv.appendChild(youtube);
    } else {
      let twitch = twitchScoreboard(appendLogo, "Twitch logo_score");
      let youtube = youtubeScoreboard(prependLogo, "YouTube logo_score");

      scoreboardDiv.appendChild(youtube);
      scoreboardDiv.appendChild(separator);
      scoreboardDiv.appendChild(twitch);
    }

    return scoreboardDiv;
  }

  firstWinForPlatform(platform) {
    return this.history.filter((winner) => winner === platform).length === 1;
  }

  getMessage(winner) {
    if (this.history.length === 1) {
      return bottomMessage(`First to claim the ${hillName}!`);
    } else if (this.isReclaiming) {
      if (this.firstWinForPlatform(winner)) {
        return bottomMessage(`Claims the ${hillName}!`);
      }
      return bottomMessage(`Reclaims the ${hillName}!`);
    } else {
      return bottomMessage(`Holds the ${hillName}!`);
    }
  }

  removeChildren() {
    const platformBattleDiv = document.getElementById(this.outerDiv);
    if (!platformBattleDiv) {
      console.error("No platformBattleDiv found");
      return;
    }
    while (platformBattleDiv.firstChild) {
      platformBattleDiv.removeChild(platformBattleDiv.firstChild);
    }
  }

  displayWinnerPlatformMessage(delay = 0) {
    console.log({ history: this.history });
    this.removeChildren();

    const platformBattleDiv = document.getElementById(this.outerDiv);
    if (!platformBattleDiv) {
      console.error("No platformBattleDiv found");
      return;
    }

    const winner = this.lastWinner;
    if (!winner) return;
    const isTwitch = PLATFORM.Twitch === winner;

    let message = this.getMessage(winner);
    let title = isTwitch ? twitchTitle() : youtubeTitle();
    let scoreboardDiv = this.displayScoreboard();

    let titleDiv = document.createElement("div");
    titleDiv.appendChild(title);
    titleDiv.appendChild(message);
    titleDiv.className = "titleMessageWrapper";

    let display = document.createElement("div");
    display.id = this.id;
    display.className = "platformBattleDisplay";
    display.appendChild(titleDiv);
    display.appendChild(scoreboardDiv);

    this.platformBattleDisplayDiv = display;
    platformBattleDiv.appendChild(display);

    setTimeout(scoreboardMotion, delay, true, display);
  }

  hideWinnerPlatformMessage(delay = 0) {
    const platformBattleDiv = document.getElementById(this.outerDiv);
    if (!platformBattleDiv) {
      console.error("No platformBattleDiv found");
      return;
    }
    let display = platformBattleDiv.firstChild;
    console.log({ display });
    if (!display) {
      return;
    }
    setTimeout(
      scoreboardMotion,
      delay,
      false,
      scoreboard.platformBattleDisplayDiv,
    );
  }

  platformWonRound(winner) {
    this.history.push(winner);
    this.store();
  }

  get overallCurrentWinner() {
    if (this.twitch === this.youtube) {
      return null;
    }
    return this.twitch > this.youtube ? PLATFORM.Twitch : PLATFORM.YouTube;
  }
  get diff() {
    return Math.abs(this.twitch - this.youtube);
  }

  platformState(platform) {
    if (this.lastWinner === null) {
      return null;
    }
    if (this.lastWinner === platform) {
      if (this.twitch === this.youtube) {
        return PlatformState.TYING_WON;
      } else if (this.twitch > this.youtube) {
        return platform === PLATFORM.Twitch
          ? PlatformState.WINNING_WON
          : PlatformState.LOSING_WON;
      } else {
        return platform === PLATFORM.YouTube
          ? PlatformState.WINNING_WON
          : PlatformState.LOSING_WON;
      }
    } else {
      if (this.twitch === this.youtube) {
        return PlatformState.TYING_LOSE;
      } else if (this.twitch > this.youtube) {
        return platform === PLATFORM.Twitch
          ? PlatformState.WINNING_LOSE
          : PlatformState.LOSING_LOSE;
      } else {
        return platform === PLATFORM.YouTube
          ? PlatformState.WINNING_LOSE
          : PlatformState.LOSING_LOSE;
      }
    }
  }
  get scoreChatMessage() {
    let scoreList = [this.twitch, this.youtube].sort((a, b) => b - a);
    return `${scoreList[0]} - ${scoreList[1]}`;
  }

  overallScoreState(platform) {
    if (this.lastWinner === null) {
      return null;
    }
    const overallWinner = this.overallCurrentWinner;

    if (overallWinner === null) {
      return PlatformScoreState.TYING;
    } else if (overallWinner === platform) {
      return PlatformScoreState.WINNING;
    } else {
      return PlatformScoreState.LOSING;
    }
  }

  endChatMessage(platform) {
    const state = this.platformState(platform);
    const score = this.scoreChatMessage;
    const diff = this.diff;
    const overallWinner = this.overallCurrentWinner;
    console.log({ state, platform });
    switch (state) {
      case PlatformState.TYING_WON:
        return `Great job, ${platform}! That win made it a tie, keep pushing ahead! The score is now ${score}.`;
      case PlatformState.TYING_LOSE:
        return `Unlucky, ${platform}! It's a tie now. The score is now ${score}.`;
      case PlatformState.WINNING_WON:
        return `Great job, ${platform}! Keep pushing ahead, you leading by ${diff}! The score is now ${score} to ${overallWinner}.`;
      case PlatformState.WINNING_LOSE:
        return `Unlucky, ${platform}! You are only ${diff} ahead! The score is now ${score} to ${overallWinner}.`;
      case PlatformState.LOSING_WON:
        return `Great job, ${platform}! You are only ${diff} behind! The score is now ${score} to ${overallWinner}.`;
      case PlatformState.LOSING_LOSE:
        return `Unlucky, ${platform}! It may be a skill issue but maybe kick them in the shins next time around! The score is now ${score} to ${overallWinner}.`;
      default:
        return "No side has won yet!";
    }
  }

  startChatMessage(platform) {
    const score = this.scoreChatMessage;
    const diff = this.diff;
    const state = this.overallScoreState(platform);
    console.log({ state, platform });

    switch (state) {
      case PlatformScoreState.WINNING:
        return `You are currently winning ${platform}. The score is ${score}, keep up the great work!`;
      case PlatformScoreState.LOSING:
        return `You are currently losing, ${platform}. The score is ${score}, you are only behind by ${diff}! Remember you can kick them in the shins if you need to!!`;
      case PlatformScoreState.TYING:
        return `We are all tied up, ${platform}. The score is ${score}, we have this, push ahead so we can be the champions.`;
      default:
        return "No side has won yet! Who will be the first platform to win?";
    }
  }
}

export const scoreboard = new Scoreboard();

export function clearPlatformBattleHistory() {
  scoreboard.reset();
  scoreboard.store();
  storage.removeItem(scoreboard.key);
}
