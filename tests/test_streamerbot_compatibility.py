import copy
from contextlib import redirect_stdout
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import streamerbot_compatibility as compat


def contract():
    return {
        "schema_version": 1,
        "upstream": {"requests_url": "requests", "events_query_url": "event-export"},
        "reporting": {"assignees": ["Ozy-Viking"], "title": "Current API compatibility"},
        "consumers": {"chat": {"file": "website/static/js/koth/index.js", "function": "userJoining"}},
        "requests": {"Subscribe": {"consumers": ["chat"], "fields": {
            "subscribe": {"alternatives": ["events"]},
        }}},
        "events": {"Twitch.ChatMessage": {"url": "chat-schema", "consumers": ["chat"], "fields": {
            "read-message": {"alternatives": ["data.message.message", "data.text"]},
            "display-name": {"alternatives": ["data.message.displayName", "data.user.name"]},
        }}},
    }


LEGACY = {
    "$schema": "http://json-schema.org/draft-04/schema#",
    "type": "object",
    "properties": {"message": {"type": "object", "properties": {
        "message": {"type": "string"}, "displayName": {"type": "string"},
    }}},
}
MODERN = {
    "$schema": "http://json-schema.org/draft-04/schema#",
    "type": "object",
    "properties": {"text": {"type": ["null", "string"]}, "user": {"oneOf": [
        {"type": "null"}, {"$ref": "#/$defs/User"},
    ]}},
    "$defs": {"User": {"type": "object", "properties": {"name": {"type": "string"}}}},
}


def snapshot(schema=MODERN, version="1.0.7"):
    return {
        "release": compat.export_release(version),
        "export_version": version,
        "event_versions": {"Twitch.ChatMessage": version},
        "sources": {"events": "event-export", "requests": "requests"},
        "observed_at": "2026-11-13T00:00:00Z",
        "basis": "Field presence for the declared export version.",
        "events": {"Twitch.ChatMessage": copy.deepcopy(schema)},
        "requests": {"Subscribe": {"Schema": {"request": "Subscribe", "events": {}}}},
        "errors": {},
    }


class CompatibilityTests(unittest.TestCase):
    def test_legacy_and_modern_releases_pass_independently(self):
        for version, schema in [("0.2.8", LEGACY), ("1.0.7", MODERN)]:
            with self.subTest(version=version):
                self.assertEqual(compat.check_contract(contract(), snapshot(schema, version)), [])

    def test_neither_message_path_flags_affected_function(self):
        upstream = snapshot()
        del upstream["events"]["Twitch.ChatMessage"]["properties"]["text"]
        findings = compat.check_contract(contract(), upstream)
        self.assertEqual([(f["status"], f["capability"]) for f in findings], [("missing", "read-message")])
        report = compat.render_report(contract(), upstream, findings)
        self.assertIn("userJoining", report)
        self.assertIn("website/static/js/koth/index.js", report)

    def test_both_paths_flag_even_when_their_types_differ(self):
        upstream = snapshot()
        upstream["events"]["Twitch.ChatMessage"]["properties"]["message"] = copy.deepcopy(LEGACY["properties"]["message"])
        upstream["events"]["Twitch.ChatMessage"]["properties"]["text"] = {"type": "number"}
        findings = compat.check_contract(contract(), upstream)
        self.assertEqual([f["status"] for f in findings], ["ambiguous", "ambiguous"])
        self.assertEqual(findings[0]["matches"], ["data.message.message", "data.text"])

    def test_fields_are_scoped_to_their_event(self):
        config = contract()
        config["events"]["YouTube.Message"] = {
            "url": "youtube-schema", "consumers": ["chat"],
            "fields": {"read-message": {"alternatives": ["data.message"]}},
        }
        upstream = snapshot(LEGACY)
        upstream["events"]["YouTube.Message"] = {"properties": {"message": {"type": "string"}}}
        self.assertEqual(compat.check_contract(config, upstream), [])

    def test_string_message_does_not_supply_nested_message(self):
        upstream = snapshot({"properties": {"message": {"type": "string"}}})
        self.assertEqual(compat.check_contract(contract(), upstream)[0]["status"], "missing")

    def test_allof_and_repeated_nullable_branches_count_path_once(self):
        schema = {"allOf": [MODERN, MODERN], "$defs": MODERN["$defs"]}
        self.assertEqual(compat.check_contract(contract(), snapshot(schema)), [])

    def test_unconstrained_leaf_exists_but_unconstrained_object_is_unverified(self):
        self.assertTrue(compat.schema_nodes({"properties": {"text": {}}}, ["text"]))
        findings = compat.check_contract(contract(), snapshot({}))
        self.assertTrue(all(f["status"] == "unverified" for f in findings))

    def test_missing_export_event_and_unreadable_schema_are_distinguished(self):
        upstream = snapshot()
        upstream["events"] = {}
        self.assertEqual(compat.check_contract(contract(), upstream)[0]["status"], "missing")
        upstream["errors"]["Twitch.ChatMessage"] = "Schema unavailable"
        self.assertEqual(compat.check_contract(contract(), upstream)[0]["status"], "unverified")

    def test_external_or_broken_reference_is_unverified(self):
        for ref in ["https://example.com/schema", "#/$defs/Missing"]:
            upstream = snapshot({"$ref": ref})
            findings = compat.check_contract(contract(), upstream)
            self.assertTrue(all(f["status"] == "unverified" for f in findings))

    def test_missing_request_and_missing_request_example_differ(self):
        upstream = snapshot()
        upstream["requests"] = {}
        self.assertEqual(compat.check_contract(contract(), upstream)[0]["status"], "missing")
        upstream["requests"] = {"Subscribe": {}}
        self.assertEqual(compat.check_contract(contract(), upstream)[0]["status"], "unverified")

    def test_request_fields_also_use_exactly_one_rule(self):
        config = contract()
        config["requests"]["Subscribe"]["fields"]["subscribe"]["alternatives"].append("subscriptions")
        upstream = snapshot()
        upstream["requests"]["Subscribe"]["Schema"]["subscriptions"] = {}
        self.assertEqual(compat.check_contract(config, upstream)[0]["status"], "ambiguous")

    def test_repo_contract_and_consumer_references_are_valid(self):
        compat.validate_contract(json.loads(compat.DEFAULT_CONTRACT.read_text()))
        config = contract()
        config["events"]["Twitch.ChatMessage"]["fields"]["read-message"]["alternatives"] *= 2
        with self.assertRaises(ValueError):
            compat.validate_contract(config)
        config = contract()
        config["events"]["Twitch.ChatMessage"]["consumers"] = ["unknown"]
        with self.assertRaises(ValueError):
            compat.validate_contract(config)

    def test_schema_extraction_reads_json_export_sections_not_examples(self):
        section = {"id": "schema", "content": "```json [schema.json]\n" + json.dumps(MODERN) + "\n```"}
        record = {"schema": "[object Object]", "sections": [
            {"id": "payload", "content": '```json\n{"message":"hello"}\n```'}, section,
        ]}
        self.assertEqual(compat.extract_schema(record), MODERN)
        self.assertEqual(compat.extract_schema({"schema": MODERN}), MODERN)
        self.assertEqual(compat.extract_schema({"schema": json.dumps(MODERN)}), MODERN)
        for sections in [[], [section, section]]:
            with self.assertRaises(ValueError):
                compat.extract_schema({"sections": sections})

    def test_request_extraction_tolerates_invalid_unrelated_examples(self):
        markdown = ('### `Subscribe`\n```json [Schema]\n{"events":{}}\n```\n'
                    '```json [↗️ Request]\n{invalid}\n```\n'
                    '### `GetBroadcaster`\n```json [↙️ Response]\n{"platforms":{}}\n```')
        self.assertEqual(compat.extract_requests(markdown), {
            "Subscribe": {"Schema": {"events": {}}},
            "GetBroadcaster": {"↙️ Response": {"platforms": {}}},
        })
        with self.assertRaises(ValueError):
            compat.extract_requests("Error page")

class RuntimeContractTests(unittest.TestCase):
    def setUp(self):
        self.config = json.loads(compat.DEFAULT_CONTRACT.read_text())

    def upstream(self, legacy=False):
        def object_schema(properties):
            return {"type": "object", "properties": properties}

        text = {"type": "string"}
        role = {"type": "integer"}
        if legacy:
            chat = object_schema({"message": object_schema({
                "message": text, "displayName": text, "username": text, "role": role,
            })})
            whisper = object_schema({"message": object_schema({"message": text, "username": text})})
        else:
            chat = object_schema({"text": text, "user": object_schema({
                "name": text, "login": text, "role": role,
            })})
            whisper = object_schema({"whisperText": text, "user": object_schema({"login": text})})
        return {
            "events": {
                "Twitch.ChatMessage": chat,
                "Twitch.Whisper": whisper,
                "YouTube.Message": object_schema({"message": text, "user": object_schema({
                    "name": text, "profileImageUrl": text,
                })}),
                **{event: object_schema({"subTier": {"type": "integer" if legacy else "string"}})
                   for event in ("Twitch.Sub", "Twitch.ReSub", "Twitch.GiftSub")},
            },
            "requests": {
                "Subscribe": {"Schema": {"events": {}, "id": "subscribe"}},
                "GetBroadcaster": {
                    "Schema": {"id": "broadcaster"},
                    "↙️ Response": {"id": "broadcaster", "platforms": {
                        "twitch": {"broadcastUserName": "Broadcaster"},
                    }},
                },
                "DoAction": {"Schema": {"action": {"name": "FightMessageTwitch"}, "args": {}, "id": "action"}},
            },
            "errors": {},
        }

    def test_repo_contract_accepts_supported_payloads_without_whisper_roles(self):
        for legacy in (True, False):
            with self.subTest(legacy=legacy):
                self.assertEqual(compat.check_contract(self.config, self.upstream(legacy)), [])

    def test_repo_contract_reports_missing_chat_login_for_koth_avatar_lookup(self):
        upstream = self.upstream()
        del upstream["events"]["Twitch.ChatMessage"]["properties"]["user"]["properties"]["login"]
        findings = compat.check_contract(self.config, upstream)
        self.assertEqual([(f["scope"], f["capability"], f["status"]) for f in findings],
                         [("Twitch.ChatMessage", "user-login", "missing")])
        self.assertIn("koth-chat", findings[0]["consumers"])

    def test_repo_contract_still_requires_whisper_text_and_identity(self):
        upstream = self.upstream()
        properties = upstream["events"]["Twitch.Whisper"]["properties"]
        del properties["whisperText"]
        del properties["user"]["properties"]["login"]
        findings = compat.check_contract(self.config, upstream)
        self.assertEqual([(f["scope"], f["capability"], f["status"]) for f in findings], [
            ("Twitch.Whisper", "read-message", "missing"),
            ("Twitch.Whisper", "user-login", "missing"),
        ])


class AcceptedVersionsTests(unittest.TestCase):
    def test_clean_export_is_accepted_without_manual_snapshot_approval(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "accepted.json"
            upstream = snapshot(version="1.1.0-alpha.17")
            upstream["latest_release"] = {"version": "1.0.7", "release_channel": "stable"}
            self.assertTrue(compat.record_accepted(path, contract(), upstream, []))
            entry = json.loads(path.read_text())["versions"][0]
            self.assertEqual((entry["version"], entry["channel"]), ("1.1.0-alpha.17", "alpha"))
            self.assertIn("presence", entry["basis"])
            self.assertNotIn("evidence", entry)

    def test_only_clean_results_add_version_and_repeated_checks_do_not_change_file(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "accepted.json"
            for status in ["missing", "ambiguous", "unverified"]:
                self.assertFalse(compat.record_accepted(path, contract(), snapshot(), [{"status": status}]))
                self.assertFalse(path.exists())
            self.assertTrue(compat.record_accepted(path, contract(), snapshot(), []))
            original = path.read_text()
            upstream = snapshot()
            upstream["observed_at"] = "2026-11-14T00:00:00Z"
            upstream["latest_release"] = {"version": "1.0.8", "release_channel": "stable"}
            self.assertFalse(compat.record_accepted(path, contract(), upstream, []))
            self.assertEqual(path.read_text(), original)

    def test_wrong_or_missing_version_metadata_cannot_label_an_export_as_stable(self):
        for mismatch in ["release", "release_channel", "export_version", "event_version"]:
            with self.subTest(mismatch=mismatch), tempfile.TemporaryDirectory() as directory:
                path = Path(directory) / "accepted.json"
                upstream = snapshot(version="1.1.0-alpha.17")
                if mismatch == "release":
                    upstream["release"] = {"version": "1.0.7", "release_channel": "stable"}
                elif mismatch == "release_channel":
                    upstream["release"]["release_channel"] = "stable"
                elif mismatch == "export_version":
                    upstream.pop("export_version")
                else:
                    upstream["event_versions"]["Twitch.ChatMessage"] = "1.0.7"
                self.assertFalse(compat.record_accepted(path, contract(), upstream, []))
                self.assertFalse(path.exists())

    def test_new_export_version_is_appended(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "accepted.json"
            compat.record_accepted(path, contract(), snapshot(), [])
            compat.record_accepted(path, contract(), snapshot(version="1.1.0-alpha.17"), [])
            entries = json.loads(path.read_text())["versions"]
            self.assertEqual([e["version"] for e in entries], ["1.0.7", "1.1.0-alpha.17"])


class ExportCollectionTests(unittest.TestCase):
    def resources(self, version="1.1.0-alpha.17"):
        metadata = [{"path": "/api/websocket/events/twitch/chat-message", "source": "Twitch",
                     "type": "ChatMessage", "version": version}]
        detail = {**metadata[0], "schema": "[object Object]", "sections": [{
            "id": "schema", "content": "```json [schema.json]\n" + json.dumps(MODERN) + "\n```",
        }]}
        return metadata, [detail]

    def reader(self, metadata, details, calls=None):
        def read(url, method="GET", body=None):
            if calls is not None:
                calls.append((url, method, body))
            if url == "event-export":
                self.assertEqual(method, "POST")
                return json.dumps(details if body["sql"].startswith("SELECT *") else metadata)
            if url == "requests":
                return '### `Subscribe`\n```json [Schema]\n{"events":{}}\n```'
            self.fail(f"Compatibility checking must not depend on release services: {url}")
        return read

    def test_current_api_is_checked_without_reading_release_feed(self):
        metadata, details = self.resources()
        calls = []
        upstream = compat.collect_snapshot(contract(), self.reader(metadata, details, calls))
        self.assertEqual(compat.check_contract(contract(), upstream), [])
        self.assertEqual(upstream["export_version"], "1.1.0-alpha.17")
        self.assertEqual(len([call for call in calls if call[0] == "event-export"]), 2)
        report = compat.render_report(contract(), upstream, [])
        self.assertIn("Compatible:", report)
        self.assertNotIn("Latest published", report)

    def test_missing_invalid_or_mixed_versions_do_not_block_presence_check(self):
        for version in [None, "invalid", "1.0.7"]:
            metadata, details = self.resources(version)
            metadata.append({"path": "/unrelated", "source": "Other", "type": "Event", "version": "different"})
            with self.subTest(version=version):
                upstream = compat.collect_snapshot(contract(), self.reader(metadata, details))
                self.assertEqual(compat.check_contract(contract(), upstream), [])
                self.assertIn("Compatible:", compat.render_report(contract(), upstream, []))

    def test_version_changing_between_queries_does_not_block_presence_check(self):
        metadata, details = self.resources()
        details[0]["version"] = "1.1.0-alpha.18"
        upstream = compat.collect_snapshot(contract(), self.reader(metadata, details))
        self.assertEqual(compat.check_contract(contract(), upstream), [])

    def test_event_absent_from_successful_export_is_missing(self):
        metadata, details = self.resources()
        metadata[0]["source"] = "Other"
        upstream = compat.collect_snapshot(contract(), self.reader(metadata, []))
        self.assertEqual(compat.check_contract(contract(), upstream)[0]["status"], "missing")


class IssueTests(unittest.TestCase):
    def setUp(self):
        self.calls = []
        self.issues = []
        self.config = contract()
        self.broken = snapshot()
        del self.broken["events"]["Twitch.ChatMessage"]["properties"]["text"]

    def read(self, url, token=None, method="GET", body=None):
        self.calls.append((method, body))
        if method == "GET":
            return json.dumps(list(reversed(self.issues)))
        if method == "POST":
            number = len(self.issues) + 1
            self.issues.append({**body, "number": number, "state": "open",
                                "html_url": f"https://github.com/a/b/issues/{number}"})
            return json.dumps(self.issues[-1])
        number = int(url.rsplit('/', 1)[-1])
        self.issues[number - 1].update(body)
        return json.dumps(self.issues[number - 1])

    def publish(self, upstream):
        findings = compat.check_contract(self.config, upstream)
        return compat.publish_issue(self.config, upstream, findings, "a/b", "token", self.read)

    def test_new_issue_is_assigned_and_unchanged_findings_do_not_notify(self):
        self.publish(self.broken)
        self.assertEqual(self.issues[0]["assignees"], ["Ozy-Viking"])
        self.assertEqual(self.issues[0]["title"], "Current API compatibility")
        self.publish(self.broken)
        self.assertEqual([method for method, _ in self.calls].count("POST"), 1)
        self.assertEqual([method for method, _ in self.calls].count("PATCH"), 0)

    def test_closed_issue_is_not_reopened_by_version_feed_or_timestamp_changes(self):
        self.publish(self.broken)
        self.issues[0]["state"] = "closed"
        changed = copy.deepcopy(self.broken)
        changed["latest_release"] = {"version": "9.0.0", "release_channel": "stable"}
        changed["export_version"] = "9.0.0-alpha.10"
        changed["observed_at"] = "tomorrow"
        changed["metadata_errors"] = {"latest_release": "HTTP 500"}
        self.publish(changed)
        self.assertEqual(len(self.issues), 1)
        self.assertEqual(self.issues[0]["state"], "closed")
        self.assertEqual([method for method, _ in self.calls].count("PATCH"), 0)

    def test_new_finding_updates_an_open_issue(self):
        self.publish(self.broken)
        changed = copy.deepcopy(self.broken)
        del changed["events"]["Twitch.ChatMessage"]["properties"]["user"]
        self.publish(changed)
        self.assertEqual(len(self.issues), 1)
        self.assertEqual(self.issues[0]["state"], "open")
        self.assertEqual([method for method, _ in self.calls].count("PATCH"), 1)

    def test_clean_check_closes_issue_and_later_regression_creates_a_new_one(self):
        self.publish(self.broken)
        original_body = self.issues[0]["body"]
        self.publish(snapshot())
        self.assertEqual(self.issues[0]["state"], "closed")
        self.assertIn(original_body, self.issues[0]["body"])
        self.publish(snapshot())
        self.assertEqual([method for method, _ in self.calls].count("PATCH"), 1)
        self.publish(self.broken)
        self.assertEqual(len(self.issues), 2)
        self.assertEqual(self.issues[0]["state"], "closed")
        self.assertEqual(self.issues[1]["state"], "open")
        self.assertNotIn('"state": "open"', json.dumps([b for m, b in self.calls if m == "PATCH"]))

    def test_different_findings_after_manual_closure_create_a_new_issue(self):
        self.publish(self.broken)
        self.issues[0]["state"] = "closed"
        changed = copy.deepcopy(self.broken)
        del changed["events"]["Twitch.ChatMessage"]["properties"]["user"]
        self.publish(changed)
        self.assertEqual(len(self.issues), 2)
        self.assertEqual(self.issues[0]["state"], "closed")

    def test_unreadable_schema_does_not_close_or_update_an_existing_issue(self):
        self.publish(self.broken)
        changed = copy.deepcopy(self.broken)
        changed["errors"]["Twitch.ChatMessage"] = "HTTP 500"
        self.publish(changed)
        self.assertEqual(self.issues[0]["state"], "open")
        self.assertEqual([method for method, _ in self.calls].count("PATCH"), 0)

    def test_partial_schema_failure_cannot_create_or_update_an_issue(self):
        self.config["events"]["Twitch.Whisper"] = copy.deepcopy(self.config["events"]["Twitch.ChatMessage"])
        broken = copy.deepcopy(self.broken)
        broken["events"]["Twitch.Whisper"] = copy.deepcopy(broken["events"]["Twitch.ChatMessage"])
        for state in ["open", "closed"]:
            with self.subTest(state=state):
                self.calls = []
                self.issues = []
                self.publish(broken)
                self.issues[0]["state"] = state
                original_body = self.issues[0]["body"]
                incomplete = copy.deepcopy(broken)
                incomplete["errors"]["Twitch.Whisper"] = "Temporary unreadable schema"
                calls_before = len(self.calls)
                self.publish(incomplete)
                self.assertEqual(len(self.issues), 1)
                self.assertEqual(self.issues[0]["state"], state)
                self.assertEqual(self.issues[0]["body"], original_body)
                self.assertFalse(any(method != "GET" for method, _ in self.calls[calls_before:]))

    def test_partial_schema_failure_cannot_create_the_first_issue(self):
        self.config["events"]["Twitch.Whisper"] = copy.deepcopy(self.config["events"]["Twitch.ChatMessage"])
        incomplete = copy.deepcopy(self.broken)
        incomplete["errors"]["Twitch.Whisper"] = "Temporary unreadable schema"
        self.publish(incomplete)
        self.assertEqual(self.issues, [])

    def test_clean_check_without_history_creates_no_issue(self):
        self.assertIsNone(self.publish(snapshot()))
        self.assertEqual(self.issues, [])

    def test_finding_order_and_transient_errors_do_not_change_fingerprint(self):
        findings = compat.check_contract(self.config, self.broken)
        changed = copy.deepcopy(findings)
        changed[0]["alternatives"].reverse()
        changed.append({"scope": "Other", "capability": "schema", "status": "unverified", "reason": "HTTP 500"})
        self.assertEqual(compat.findings_fingerprint(findings), compat.findings_fingerprint(changed))

    def test_issue_lookup_paginates(self):
        calls = []
        def read(url, token=None, method="GET", body=None):
            calls.append(url)
            if url.endswith("&page=1"):
                return json.dumps([{"body": "unrelated"}] * 100)
            if method == "GET":
                return "[]"
            return '{"html_url":"https://github.com/a/b/issues/42"}'
        findings = compat.check_contract(self.config, self.broken)
        compat.publish_issue(self.config, self.broken, findings, "a/b", "token", read)
        self.assertTrue(any("page=2" in url for url in calls))


class CommandTests(unittest.TestCase):
    def test_offline_command_exit_codes_and_acceptance_gate(self):
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory)
            config_path, snapshot_path = directory / "contract.json", directory / "snapshot.json"
            accepted_path, report_path = directory / "accepted.json", directory / "report.md"
            config_path.write_text(json.dumps(contract()))
            args = ["--contract", str(config_path), "--snapshot", str(snapshot_path),
                    "--accepted-versions", str(accepted_path), "--report", str(report_path)]
            for mode, expected in [("missing", 1), ("unverified", 2), ("pass", 0)]:
                upstream = snapshot()
                if mode == "missing":
                    del upstream["events"]["Twitch.ChatMessage"]["properties"]["text"]
                elif mode == "unverified":
                    upstream["errors"]["Twitch.ChatMessage"] = "Schema unavailable"
                snapshot_path.write_text(json.dumps(upstream))
                with redirect_stdout(io.StringIO()):
                    self.assertEqual(compat.main(args), expected)
                self.assertTrue(report_path.exists())
                self.assertEqual(accepted_path.exists(), mode == "pass")

    def test_missing_version_does_not_fail_the_command(self):
        with tempfile.TemporaryDirectory() as directory:
            config_path, snapshot_path = Path(directory) / "contract.json", Path(directory) / "snapshot.json"
            config_path.write_text(json.dumps(contract()))
            upstream = snapshot()
            upstream.pop("export_version")
            upstream.pop("event_versions")
            snapshot_path.write_text(json.dumps(upstream))
            with redirect_stdout(io.StringIO()):
                self.assertEqual(compat.main(["--contract", str(config_path), "--snapshot", str(snapshot_path)]), 0)

    def test_unverified_result_does_not_create_incompatibility_issue(self):
        with tempfile.TemporaryDirectory() as directory:
            config_path = Path(directory) / "contract.json"
            snapshot_path = Path(directory) / "snapshot.json"
            config_path.write_text(json.dumps(contract()))
            upstream = snapshot()
            upstream["errors"]["Twitch.ChatMessage"] = "Schema unavailable"
            snapshot_path.write_text(json.dumps(upstream))
            with patch.object(compat, "publish_issue") as publish, redirect_stdout(io.StringIO()):
                result = compat.main(["--contract", str(config_path), "--snapshot", str(snapshot_path),
                                      "--create-issues"])
            self.assertEqual(result, 2)
            publish.assert_not_called()

    def test_partial_check_does_not_publish_even_with_confirmed_findings(self):
        with tempfile.TemporaryDirectory() as directory:
            config_path, snapshot_path = Path(directory) / "contract.json", Path(directory) / "snapshot.json"
            config = contract()
            config["events"]["Twitch.Whisper"] = copy.deepcopy(config["events"]["Twitch.ChatMessage"])
            config_path.write_text(json.dumps(config))
            upstream = snapshot()
            del upstream["events"]["Twitch.ChatMessage"]["properties"]["text"]
            upstream["errors"]["Twitch.Whisper"] = "Temporary unreadable schema"
            snapshot_path.write_text(json.dumps(upstream))
            with patch.object(compat, "publish_issue") as publish, redirect_stdout(io.StringIO()), \
                    patch.dict(compat.os.environ, {"GH_TOKEN": "test-token", "GITHUB_REPOSITORY": "a/b"}):
                result = compat.main(["--contract", str(config_path), "--snapshot", str(snapshot_path),
                                      "--create-issues"])
            self.assertEqual(result, 2)
            publish.assert_not_called()


if __name__ == "__main__":
    unittest.main()
