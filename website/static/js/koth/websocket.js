import { emptyFunction } from "../util.js";
import { server, urlParams } from "./urlParams.js";

export let ws;

export function newWebSocket(server) {
  return new globalThis.Streamerbot.Connection(server, {
    password: urlParams.get("wsPassword") || "",
  });
}

export function connectws(onopen = emptyFunction, onclose = emptyFunction) {
  if (ws) {
    ws.close();
  }
  ws = newWebSocket(server);
  ws.onopen = onopen;
  ws.onclose = onclose;
  return ws;
}
