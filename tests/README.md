Run the Streamer.bot regression checks with Node.js:

```sh
node --test tests/*.test.cjs
```

No package installation or running Streamer.bot instance is required. The checks load the production shared client and auxiliary overlay scripts into a small browser harness with fake sockets, timers, DOM elements, and local storage. KOTH checks exercise its `userJoining` handler with fighter creation captured at the callback boundary.

Coverage includes current and legacy chat payloads, subscription tiers, command authorization, whispers, YouTube joins, malformed messages, authentication challenge ordering, and reconnection. These checks do not validate a live Streamer.bot or OBS installation.
