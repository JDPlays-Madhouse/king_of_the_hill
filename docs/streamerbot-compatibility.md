# Streamer.bot compatibility monitoring

The monitor checks the API requirements in
[`config/streamerbot-compatibility.json`](../config/streamerbot-compatibility.json)
against Streamer.bot's current documentation export. It runs daily at 19:23 UTC
and can also be run from **Actions → Streamer.bot compatibility → Run workflow**
after the workflow reaches the default branch.

## What is checked

The question is whether the current API still satisfies the operations supported
by the application. The configured alternatives describe those supported calls;
keep them aligned with the implementation when adding or removing fallbacks.

The checker reads JSON from `upstream.events_query_url`. It first reads the
event inventory and version metadata, then retrieves the schemas for the
configured events. No HTML scraping or manual snapshot approval is required.
Version labels are informational. Missing, mixed, invalid, or changing version
metadata does not block the compatibility check or create an incompatibility.

The monitor does not query release feeds or wait for a release. It compares the
current available API definitions on every scheduled run.

Outgoing request definitions come from the Markdown at `upstream.requests_url`.
Its frontmatter introduction versions are not used as compatibility gates. The
saved evidence records both source URLs and identifies the event export version.

## Required functions and accepted fields

A function here means an operation such as `read-message`, `display-name`, or
`user-role`. Each event's `fields` section lists these operations and their
accepted API paths. The handlers support both formats, so the message rule is:

```json
"read-message": {
  "alternatives": ["data.message.message", "data.text"]
}
```

The rule applies independently to each event in the tested export:

| Available fields | Result |
| --- | --- |
| Only `data.message.message` | Pass |
| Only `data.text` | Pass |
| Neither field | Flag as missing |
| Both fields | Flag as ambiguous; review for repurposing |
| Schema unavailable or unreadable | Unverified; do not accept the version |

The Twitch handlers use `website/static/js/streamerbot.js` to normalize modern
and legacy payloads. The config accepts the fields supported by that helper:

| Function | Legacy path | Modern path |
| --- | --- | --- |
| Read message | `data.message.message` | `data.text` |
| Display name | `data.message.displayName` | `data.user.name` |
| User login | `data.message.username` | `data.user.login` |
| User role | `data.message.role` | `data.user.role` |

Twitch chat and whispers have separate schemas. A path present in chat does not
satisfy a whisper requirement. The current whisper schema uses
`data.whisperText` and `data.user.login`; the config accepts these alongside
the legacy nested message and username fields. Whisper commands authorize known
usernames without relying on a channel role, so whispers have no `user-role`
requirement. KOTH subscribes only to public chat and uses the user login for
avatar lookup.

Subscription events still require `data.subTier`. The runtime normalizes numeric
and string tiers; the presence monitor does not check their types. Run
`node --test tests/*.test.cjs` to verify payload handling, tier scoring,
authentication, and reconnect behavior.

The `consumers` section maps IDs to source files and JavaScript handlers. Event
or request consumers identify the affected code; individual field rules can
narrow that list. These are code references, separate from the operation names.

Add aliases when their meaning has been checked and the consuming code supports
them. Editing this file does not implement runtime fallbacks. This monitor checks
existence, not field meaning or type changes to a path that still exists.

The `requests` section checks outgoing request names and their documented
request/response fields, including request IDs and the broadcaster response ID
used to correlate replies. `DoAction.local_actions` records installation-specific
action names for reference; the export cannot check those actions or arbitrary
arguments such as `rawInput`.

## Issues and accepted versions

`reporting.assignees` configures who receives issues; it defaults to `Ozy-Viking`.
The workflow needs permission to create issues and the assignee must be
assignable in the repository.

Missing or ambiguous requirements create an issue showing the affected
operations, accepted and matching fields, source URLs, and affected code.
`reporting.title` sets the title. Issue handling follows the compatibility result:

- While an issue is open, changed findings update it; identical findings do not
  notify again. Versions and timestamps are excluded from that comparison.
- A successful check closes the issue and records that the problem was resolved,
  preserving the original problem description.
- A later incompatibility creates a new issue. Closed issues are never reopened.
- Manually closing an issue suppresses repeats of the same unresolved findings.
  A different problem or a regression after a successful check creates a new one.

Unreadable API data fails the workflow without claiming an API change. If any
required definition is unverified, issue publication is deferred for the entire
run: no issue is created, updated, or closed. Confirmed findings still appear in
the report. The next complete check compares the full findings with the existing
issue, preventing temporary missing data from looking like a new incompatibility.

The separate version history is retained for the previously requested tracking.
When presence checks pass and version metadata is available and consistent, the
export version is added automatically to
[`config/streamerbot-accepted-versions.json`](../config/streamerbot-accepted-versions.json).
Entries record its version/channel, check date, source URLs, and hashes of the
contract and API definitions. Repeated unchanged checks do not rewrite entries.
This bookkeeping never changes the compatibility result or issue lifecycle.
Unavailable version metadata simply skips the history entry. The check tests
API path existence; it does not execute the application's handlers.

The workflow commits accepted-version changes to the default branch. Its token
has `issues: write` and `contents: write` permissions only in the monitoring job.
Repository rules must allow those bot commits. Pull request runs execute local
tests and cannot create issues or record accepted versions.

Existing entries are historical successful checks; failures do not erase them.
Remove an entry manually if acceptance is revoked. The initial list is empty.

## Running locally

Python 3.12 or newer is sufficient; no third-party packages are required.

```sh
python3 -m unittest discover -s tests -p 'test_streamerbot_compatibility.py' -v
python3 scripts/streamerbot_compatibility.py \
  --write-snapshot /tmp/streamerbot-snapshot.json \
  --report /tmp/streamerbot-report.md
```

Replay saved data without fetching upstream:

```sh
python3 scripts/streamerbot_compatibility.py \
  --snapshot /tmp/streamerbot-snapshot.json
```

Optional flags:

- `--contract PATH`: use another contract file.
- `--accepted-versions PATH`: record passing export versions in that JSON file.
- `--create-issues`: create/update an issue on compatibility findings. Requires
  `GH_TOKEN` or `GITHUB_TOKEN` and `GITHUB_REPOSITORY=owner/repository`.

Exit codes: `0` = all presence checks passed; `1` = missing or ambiguous API;
`2` = required API definitions could not be checked. The workflow saves the report and JSON evidence as artifacts,
including on failures. The internal documentation query endpoint may change;
an unreadable response fails the check instead of accepting a version.
