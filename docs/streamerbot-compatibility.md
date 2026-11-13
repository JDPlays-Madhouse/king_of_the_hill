# Streamer.bot compatibility monitoring

The monitor checks the API requirements in
[`config/streamerbot-compatibility.json`](../config/streamerbot-compatibility.json)
against Streamer.bot's current documentation export. It runs daily at 19:23 UTC
and can also be run from **Actions → Streamer.bot compatibility → Run workflow**
after the workflow reaches the default branch.

## Which version is tested

The version declared by the generated event records is the version being
tested. For example, records declaring `1.1.0-alpha.17` produce compatibility
results, issues, and accepted-version entries for `1.1.0-alpha.17`.

The checker reads JSON from `upstream.events_query_url`. It first reads the
event inventory and version metadata, then retrieves the schemas for the
configured events. No HTML scraping or manual snapshot approval is required.
Mixed or missing export versions stop the check. A schema that changes version
between the inventory and detail queries is marked unverified.

The latest published stable release is fetched independently from
`upstream.releases_url`, using `upstream.channel`. It is informational: an alpha
export's result is never recorded against a different stable release. A release
feed failure does not block the API presence check.

Outgoing request definitions come from the Markdown at `upstream.requests_url`.
Its frontmatter introduction versions are not used as compatibility gates. The
saved evidence records both source URLs and identifies the event export version.

## Required functions and accepted fields

A function here means an operation such as `read-message`, `display-name`, or
`user-role`. Each event's `fields` section lists these operations and their
accepted API paths:

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

All four Twitch mappings from the migration are configured:

| Function | Legacy | Current |
| --- | --- | --- |
| Read message | `data.message.message` | `data.text` |
| Display name | `data.message.displayName` | `data.user.name` |
| User login | `data.message.username` | `data.user.login` |
| User role | `data.message.role` | `data.user.role` |

Twitch chat and whispers have separate schemas. A path present in chat does not
satisfy a whisper requirement. The current whisper schema uses
`data.whisperText`, which is not accepted by the configured message alternatives.
Add it when the corresponding handler supports it. Role availability must also
be checked for whispers independently.

The `consumers` section maps IDs to source files and JavaScript handlers. Event
or request consumers identify the affected code; individual field rules can
narrow that list. These are code references, separate from the operation names.

Add aliases when their meaning has been checked and the consuming code supports
them. Editing this file does not implement runtime fallbacks. This monitor checks
existence, not field meaning or type changes to a path that still exists.

The `requests` section checks outgoing request names and their documented
request/response fields. `DoAction.local_actions` records installation-specific
action names for reference; the export cannot check those actions or arbitrary
arguments such as `rawInput`.

## Issues and accepted versions

`reporting.assignees` configures who receives issues; it defaults to `Ozy-Viking`.
The workflow needs permission to create issues and the assignee must be
assignable in the repository.

Missing or ambiguous requirements create an issue showing the tested export
version, accepted and matching fields, source URLs, and affected code. One issue
per tested version/channel is updated instead of creating daily duplicates.
A closed issue is reopened only when its findings change. Observation timestamps
are excluded from issue bodies so unchanged results do not generate updates.
Fetch failures alone fail the workflow without opening an incompatibility issue.

When every configured presence check passes, the tested export version is added
automatically to
[`config/streamerbot-accepted-versions.json`](../config/streamerbot-accepted-versions.json).
Entries record its version/channel, check date, source URLs, and hashes of the
contract and API definitions. Repeated unchanged checks do not rewrite entries.
Acceptance means the configured paths exist for that export version; it does
not test the application's runtime handling of them.

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
`2` = checks could not complete or export version metadata is unavailable or
inconsistent. The workflow saves the report and JSON evidence as artifacts,
including on failures. The internal documentation query endpoint may change;
an unreadable response fails the check instead of accepting a version.
