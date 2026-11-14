#!/usr/bin/env python3
"""Check the configured Streamer.bot API contract using official documentation."""

import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import sys
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONTRACT = ROOT / "config/streamerbot-compatibility.json"


def fetch(url, token=None, method="GET", body=None):
    headers = {"User-Agent": "Mozilla/5.0 (KOTH Streamer.bot compatibility monitor)"}
    if token:
        headers.update(Authorization=f"Bearer {token}", Accept="application/vnd.github+json",
                       **{"X-GitHub-Api-Version": "2026-03-10"})
    if body is not None:
        headers["Content-Type"] = "application/json"
    request = Request(url, headers=headers, method=method,
                      data=None if body is None else json.dumps(body).encode())
    with urlopen(request, timeout=30) as response:
        return response.read().decode()


def extract_schema(record):
    """Read the schema from a JSON export record, including its Markdown section."""
    value = record.get("schema")
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except ValueError:
            value = None
    if isinstance(value, dict) and "$schema" in value:
        return value
    sections = record.get("sections", [])
    if isinstance(sections, str):
        sections = json.loads(sections)
    schemas = []
    for section in sections:
        if section.get("id") != "schema":
            continue
        for block in re.findall(r"```json[^\n]*\n(.*?)```", section.get("content", ""), re.S):
            value = json.loads(block)
            if isinstance(value, dict) and "$schema" in value:
                schemas.append(value)
    if len(schemas) != 1:
        raise ValueError(f"Expected one event JSON schema; found {len(schemas)}")
    return schemas[0]


def extract_requests(markdown):
    requests = {}
    for name, section in re.findall(r"^### `([^`]+)`\s*\n(.*?)(?=^### |\Z)",
                                    markdown, re.M | re.S):
        examples = {}
        for label, block in re.findall(r"```json \[([^\]]+)\]\s*\n(.*?)```", section, re.S):
            if label not in ("Schema", "↙️ Response"):
                continue
            try:
                examples[label] = json.loads(block)
            except ValueError:
                continue
        # A heading proves the request exists, even if its example is unavailable.
        requests[name] = examples
    if not requests:
        raise ValueError("No request definitions found in upstream documentation")
    return requests


def export_release(version):
    match = re.fullmatch(r"\d+\.\d+\.\d+(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?", version or "")
    if not match:
        raise ValueError("Event export has no valid version")
    return {"version": version, "release_channel": match[1].split(".")[0] if match[1] else "stable"}


def validate_contract(contract, root=ROOT):
    if contract.get("schema_version") != 1:
        raise ValueError("Unsupported contract schema_version")
    field_values = contract["reporting"].get("issue_field_values", [])
    if (not isinstance(field_values, list)
            or any(not isinstance(field, dict)
                   or type(field.get("field_id")) is not int or field["field_id"] <= 0
                   or not isinstance(field.get("value"), str) or not field["value"].strip()
                   for field in field_values)):
        raise ValueError("reporting.issue_field_values needs positive field IDs and nonempty option names")
    consumers = contract["consumers"]
    for name, consumer in consumers.items():
        path = (root / consumer["file"]).resolve()
        if not path.is_relative_to(root.resolve()) or not path.is_file():
            raise ValueError(f"Consumer {name!r} references a missing or invalid file")
        if not consumer["function"]:
            raise ValueError(f"Consumer {name!r} needs a function name")
    if not contract["events"] or not contract["requests"]:
        raise ValueError("The contract must include events and requests")
    for kind in ("events", "requests"):
        for scope, definition in contract[kind].items():
            if not definition["consumers"]:
                raise ValueError(f"{scope} needs linked consumers")
            for consumer in definition["consumers"]:
                if consumer not in consumers:
                    raise ValueError(f"Unknown consumer {consumer!r} in {scope}")
            for capability, rule in definition.get("fields", {}).items():
                alternatives = rule["alternatives"]
                if (not alternatives or len(set(alternatives)) != len(alternatives)
                        or any(not isinstance(path, str) or not path
                               or any(not part for part in path.split("."))
                               for path in alternatives)):
                    raise ValueError(f"{scope}/{capability} needs distinct, nonempty paths")
                for consumer in rule.get("consumers", definition["consumers"]):
                    if consumer not in definition["consumers"]:
                        raise ValueError(f"Invalid consumer {consumer!r} in {scope}/{capability}")
                if kind == "events" and any(not path.startswith("data.") for path in alternatives):
                    raise ValueError(f"{scope}/{capability} event paths must start with data.")


def collect_snapshot(contract, read=fetch):
    upstream = contract["upstream"]
    def query(sql):
        rows = json.loads(read(upstream["events_query_url"], method="POST", body={"sql": sql}))
        if not isinstance(rows, list) or any(not isinstance(row, dict) for row in rows):
            raise ValueError("Event export did not return JSON records")
        return rows

    metadata = query('SELECT "path", "source", "type", "version" FROM _content_events ORDER BY stem ASC')
    versions = sorted({row["version"] for row in metadata if isinstance(row.get("version"), str) and row["version"]})
    version = versions[0] if len(versions) == 1 else None
    try:
        release = export_release(version)
    except (TypeError, ValueError):
        release = {"version": "unspecified", "release_channel": "unspecified"}
    by_event = {}
    for row in metadata:
        event = f"{row.get('source')}.{row.get('type')}"
        if event in contract["events"]:
            if event in by_event:
                raise ValueError(f"Duplicate event definitions for {event}")
            by_event[event] = row
    paths = ["'" + row["path"].replace("'", "''") + "'" for row in by_event.values()]
    records = query('SELECT * FROM _content_events WHERE ("path" IN (' + ", ".join(paths)
                    + ')) ORDER BY stem ASC') if paths else []
    details = {}
    for row in records:
        event = f"{row.get('source')}.{row.get('type')}"
        if event in details:
            raise ValueError(f"Duplicate event schemas for {event}")
        details[event] = row
    snapshot = {
        "release": release,
        "export_version": version,
        "export_versions": versions,
        "event_versions": {},
        "observed_at": datetime.now(timezone.utc).isoformat(),
        "basis": "Current API field presence against the configured supported functions.",
        "sources": {"events": upstream["events_query_url"], "requests": upstream["requests_url"]},
        "requests": extract_requests(read(upstream["requests_url"])),
        "events": {},
        "errors": {},
    }
    for event in contract["events"]:
        # Absence from a successfully read export is a missing event, not a fetch failure.
        if event not in by_event:
            continue
        try:
            row = details[event]
            snapshot["event_versions"][event] = row.get("version")
            snapshot["events"][event] = extract_schema(row)
        except (ValueError, KeyError, TypeError) as error:
            snapshot["errors"][event] = str(error)
    return snapshot


def acceptance_problem(contract, snapshot):
    version = snapshot.get("export_version")
    try:
        expected = export_release(version)
    except (ValueError, TypeError):
        return "The result needs a valid version declared by the API export."
    if any(snapshot["release"].get(key) != value for key, value in expected.items()):
        return "The result must be recorded against the version declared by the API export."
    for event in contract["events"]:
        if event in snapshot["events"] and snapshot.get("event_versions", {}).get(event) != version:
            return f"{event} has missing or mismatched export version metadata."
    if snapshot.get("errors"):
        return "Some required API definitions could not be read."
    return None


def schema_nodes(schema, parts, root=None, seen=frozenset()):
    """Resolve explicit property paths, including local refs and nullable unions."""
    if root is None:
        root = schema
    if not isinstance(schema, dict):
        raise ValueError("Unsupported boolean or malformed schema")
    if not parts:
        return [schema]
    if not any(key in schema for key in ("properties", "$ref", "oneOf", "anyOf", "allOf", "type")):
        raise ValueError("Schema does not describe the fields of this object")
    result = []
    if "$ref" in schema:
        ref = schema["$ref"]
        marker = (ref, tuple(parts))
        if marker in seen:
            raise ValueError(f"Recursive schema reference: {ref}")
        if not ref.startswith("#/"):
            raise ValueError(f"Unsupported external schema reference: {ref}")
        target = root
        for key in ref[2:].split("/"):
            target = target[key.replace("~1", "/").replace("~0", "~")]
        result.extend(schema_nodes(target, parts, root, seen | {marker}))
    for keyword in ("oneOf", "anyOf", "allOf"):
        for branch in schema.get(keyword, []):
            result.extend(schema_nodes(branch, parts, root, seen))
    if parts[0] in schema.get("properties", {}):
        result.extend(schema_nodes(schema["properties"][parts[0]], parts[1:], root, seen))
    return result


def example_has_path(example, path):
    for part in path.split("."):
        if not isinstance(example, dict) or part not in example:
            return False
        example = example[part]
    return True


def check_contract(contract, snapshot):
    findings = []
    for kind in ("events", "requests"):
        for scope, definition in contract[kind].items():
            def finding(status, capability, **details):
                rule = definition.get("fields", {}).get(capability, {})
                findings.append({"scope": scope, "capability": capability, "status": status,
                                 "consumers": rule.get("consumers", definition["consumers"]),
                                 **details})

            if scope in snapshot.get("errors", {}):
                finding("unverified", "schema", reason=snapshot["errors"][scope])
                continue
            if scope not in snapshot[kind]:
                finding("missing", "definition")
                continue
            for capability, rule in definition.get("fields", {}).items():
                alternatives = rule["alternatives"]
                try:
                    if kind == "events":
                        schema = snapshot[kind][scope]
                        matches = [path for path in alternatives
                                   if schema_nodes(schema, path.split(".")[1:])]
                    else:
                        example = snapshot[kind][scope].get(rule.get("example", "Schema"))
                        if example is None:
                            finding("unverified", capability, reason="Request example unavailable")
                            continue
                        matches = [path for path in alternatives if example_has_path(example, path)]
                except (ValueError, KeyError, TypeError) as error:
                    finding("unverified", capability, reason=str(error))
                    continue
                if len(matches) != 1:
                    finding("missing" if not matches else "ambiguous", capability,
                            alternatives=alternatives, matches=matches)
    return findings


def render_report(contract, snapshot, findings, include_metadata=True):
    if not findings:
        result = "Compatible: all configured API requirements are satisfied."
    elif any(item["status"] != "unverified" for item in findings):
        result = "Needs a fix: the current API does not satisfy the configured requirements."
    else:
        result = "Check incomplete: required API definitions could not be read."
    lines = ["# Streamer.bot API compatibility", "", result, "",
             "Each capability must have exactly one accepted field in its own event schema.",
             "Zero matches = missing; multiple matches = ambiguous and require review.", ""]
    if any(item["status"] == "unverified" for item in findings):
        lines.extend(["Issue changes are deferred until all required API checks complete.", ""])
    if include_metadata:
        lines.extend([f"Observed: {snapshot['observed_at']}", ""])
        if snapshot.get("export_version"):
            lines.extend([f"Export version: {snapshot['export_version']} (informational).", ""])
    for item in findings:
        lines.extend([f"## {item['status']}: {item['scope']} / {item['capability']}", ""])
        if "alternatives" in item:
            lines.append("Accepted: " + ", ".join(f"`{p}`" for p in item["alternatives"]))
            lines.append("Found: " + (", ".join(f"`{p}`" for p in item["matches"]) or "none"))
        if "reason" in item:
            lines.append(f"Reason: {item['reason']}")
        lines.append("")
        for name in item["consumers"]:
            consumer = contract["consumers"][name]
            lines.append(f"- `{consumer['file']}` → `{consumer['function']}`")
        lines.append("")
        if item["scope"] in contract["events"]:
            lines.append(f"Source: {contract['events'][item['scope']]['url']}")
        else:
            lines.append(f"Source: {contract['upstream']['requests_url']}")
        lines.append("")
    lines.extend(["This checks documented field availability, not field meaning or running application behavior.",
                  "The accepted alternatives describe compatibility work separately from its implementation.", ""])
    return "\n".join(lines)


def findings_fingerprint(findings):
    """Only actionable compatibility changes should update an issue."""
    canonical = []
    for item in findings:
        if item["status"] == "unverified":
            continue
        entry = {key: item[key] for key in ("scope", "capability", "status")}
        for key in ("alternatives", "matches", "consumers"):
            entry[key] = sorted(item.get(key, []))
        canonical.append(entry)
    canonical.sort(key=lambda item: (item["scope"], item["capability"], item["status"]))
    return hashlib.sha256(json.dumps(canonical, sort_keys=True).encode()).hexdigest()


def publish_issue(contract, snapshot, findings, repository, token, read=fetch):
    if any(item["status"] == "unverified" for item in findings):
        return None
    if not re.fullmatch(r"[\w.-]+/[\w.-]+", repository):
        raise ValueError("GITHUB_REPOSITORY must be an owner/repository")
    marker = "<!-- streamerbot-compatibility:current-api -->"
    resolved_marker = "<!-- streamerbot-compatibility:resolved -->"
    fingerprint = f"<!-- streamerbot-findings:{findings_fingerprint(findings)} -->"
    base = f"https://api.github.com/repos/{repository}/issues"
    actionable = [item for item in findings if item["status"] != "unverified"]
    body = f"{marker}\n{fingerprint}\n{render_report(contract, snapshot, actionable, include_metadata=False)}"
    existing = None
    last_closed = None
    page = 1
    while True:
        issues = json.loads(read(f"{base}?state=all&per_page=100&page={page}", token=token))
        for item in issues:
            if "pull_request" in item or marker not in (item.get("body") or ""):
                continue
            if item["state"] == "open":
                existing = item
                break
            if last_closed is None:
                last_closed = item
        if existing or len(issues) < 100:
            break
        page += 1
    existing = existing or last_closed
    if existing:
        old_body = existing.get("body") or ""
        if not actionable:
            if resolved_marker in old_body:
                return existing["html_url"]
            update = {"state": "closed", "body": old_body + "\n\n" + resolved_marker
                      + "\nAll configured API compatibility checks now pass.\n"}
        elif existing["state"] == "open":
            if fingerprint in old_body:
                return existing["html_url"]
            update = {"body": body}
        elif resolved_marker not in old_body and fingerprint in old_body:
            # Respect a manual closure while the same unresolved findings persist.
            return existing["html_url"]
        else:
            update = None
        if update is not None:
            result = json.loads(read(f"{base}/{existing['number']}", token=token,
                                     method="PATCH", body=update))
            return result["html_url"]
    if not actionable:
        return None
    issue = {
        "title": contract["reporting"]["title"],
        "body": body, "assignees": contract["reporting"]["assignees"],
    }
    if contract["reporting"].get("issue_field_values"):
        issue["issue_field_values"] = contract["reporting"]["issue_field_values"]
    result = json.loads(read(base, token=token, method="POST", body=issue))
    return result["html_url"]


def record_accepted(path, contract, snapshot, findings):
    """Persist a clean check once per release and contract/schema combination."""
    if findings or check_contract(contract, snapshot) or acceptance_problem(contract, snapshot):
        return False
    accepted = json.loads(path.read_text()) if path.exists() else {"schema_version": 1, "versions": []}
    if accepted.get("schema_version") != 1 or not isinstance(accepted.get("versions"), list):
        raise ValueError("Invalid accepted-versions file")

    def digest(value):
        return hashlib.sha256(json.dumps(value, sort_keys=True).encode()).hexdigest()

    release = snapshot["release"]
    entry = {
        "version": release["version"],
        "channel": release["release_channel"],
        "basis": "API field presence for the declared export version",
        "checked_at": snapshot["observed_at"],
        "contract_sha256": digest(contract),
        "api_sha256": digest({kind: snapshot[kind] for kind in ("events", "requests")}),
        "sources": snapshot["sources"],
    }
    previous = next((item for item in accepted["versions"]
                     if (item["version"], item["channel"]) == (entry["version"], entry["channel"])), None)
    if previous and all(previous.get(key) == value for key, value in entry.items() if key != "checked_at"):
        return False
    if previous:
        accepted["versions"].remove(previous)
    accepted["versions"].append(entry)
    path.write_text(json.dumps(accepted, indent=2) + "\n")
    return True


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--contract", type=Path, default=DEFAULT_CONTRACT)
    parser.add_argument("--snapshot", type=Path, help="Use a saved upstream snapshot without network access")
    parser.add_argument("--write-snapshot", type=Path)
    parser.add_argument("--report", type=Path)
    parser.add_argument("--create-issues", action="store_true")
    parser.add_argument("--accepted-versions", type=Path,
                        help="Record successful checks in this accepted-versions JSON file")
    args = parser.parse_args(argv)
    try:
        contract = json.loads(args.contract.read_text())
        validate_contract(contract)
        snapshot = json.loads(args.snapshot.read_text()) if args.snapshot else collect_snapshot(contract)
        if args.write_snapshot:
            args.write_snapshot.write_text(json.dumps(snapshot, indent=2) + "\n")
        findings = check_contract(contract, snapshot)
        report = render_report(contract, snapshot, findings)
        if args.report:
            args.report.write_text(report)
        print(report)
        if args.accepted_versions and record_accepted(args.accepted_versions, contract, snapshot, findings):
            print(f"Accepted version recorded in {args.accepted_versions}")
        if args.create_issues and not any(item["status"] == "unverified" for item in findings):
            token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
            if not token:
                raise ValueError("Issue creation requires GH_TOKEN or GITHUB_TOKEN")
            issue = publish_issue(contract, snapshot, findings,
                                  os.environ.get("GITHUB_REPOSITORY", ""), token)
            if issue:
                print("Issue:", issue)
        if any(item["status"] == "unverified" for item in findings):
            return 2
        if findings:
            return 1
        return 0
    except (HTTPError, URLError, TimeoutError, OSError, ValueError, KeyError, TypeError) as error:
        print(f"Compatibility check could not complete: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
