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
        "upstream": {"releases_url": "releases", "requests_url": "requests", "channel": "stable",
                     "events_query_url": "event-export"},
        "reporting": {"assignees": ["Ozy-Viking"], "title_prefix": "Compatibility"},
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

    def test_latest_release_filters_product_channel_and_publication(self):
        def release(version, channel="stable", project="streamer.bot", published=True):
            major, minor, patch = map(int, version.split('.'))
            return dict(version=version, release_channel=channel, project=project, published=published,
                        version_major=major, version_minor=minor, version_patch=patch, published_at="2026-11-13")
        payload = {"data": [release("1.0.9"), release("1.0.10"), release("2.0.0", channel="alpha"),
                            release("3.0.0", published=False), release("4.0.0", project="speaker.bot")]}
        self.assertEqual(compat.latest_release(payload, "stable")["version"], "1.0.10")


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
        feed = {"data": [{"project": "streamer.bot", "published": True, "release_channel": "stable",
                          "version": "1.0.7", "version_major": 1, "version_minor": 0,
                          "version_patch": 7, "published_at": "2026-11-13"}]}
        return metadata, [detail], feed

    def reader(self, metadata, details, feed, calls=None):
        def read(url, method="GET", body=None):
            if calls is not None:
                calls.append((url, method, body))
            if url == "event-export":
                self.assertEqual(method, "POST")
                return json.dumps(details if body["sql"].startswith("SELECT *") else metadata)
            if url == "requests":
                return '### `Subscribe`\n```json [Schema]\n{"events":{}}\n```'
            if url == "releases":
                if isinstance(feed, Exception):
                    raise feed
                return json.dumps(feed)
            self.fail(f"Unexpected source: {url}")
        return read

    def test_export_version_is_the_target_and_latest_stable_is_separate(self):
        metadata, details, feed = self.resources()
        calls = []
        upstream = compat.collect_snapshot(contract(), self.reader(metadata, details, feed, calls))
        self.assertEqual(upstream["release"], {"version": "1.1.0-alpha.17", "release_channel": "alpha"})
        self.assertEqual(upstream["latest_release"]["version"], "1.0.7")
        self.assertEqual(compat.check_contract(contract(), upstream), [])
        self.assertIsNone(compat.acceptance_problem(contract(), upstream))
        self.assertEqual(len([call for call in calls if call[0] == "event-export"]), 2)
        report = compat.render_report(contract(), upstream, [])
        self.assertIn("compatibility: 1.1.0-alpha.17 (alpha)", report)
        self.assertIn("1.0.7 (informational)", report)

    def test_mixed_missing_or_invalid_export_versions_fail(self):
        for versions in [["1.1.0-alpha.17", "1.0.7"], [None], ["invalid"]]:
            metadata, details, feed = self.resources()
            metadata = [{**metadata[0], "version": version} for version in versions]
            with self.subTest(versions=versions), self.assertRaises(ValueError):
                compat.collect_snapshot(contract(), self.reader(metadata, details, feed))

    def test_schema_version_changing_between_queries_is_unverified(self):
        metadata, details, feed = self.resources()
        details[0]["version"] = "1.1.0-alpha.18"
        upstream = compat.collect_snapshot(contract(), self.reader(metadata, details, feed))
        findings = compat.check_contract(contract(), upstream)
        self.assertEqual(findings[0]["status"], "unverified")
        self.assertIsNotNone(compat.acceptance_problem(contract(), upstream))

    def test_event_absent_from_successful_export_is_missing(self):
        metadata, details, feed = self.resources()
        metadata[0]["source"] = "Other"
        upstream = compat.collect_snapshot(contract(), self.reader(metadata, [], feed))
        self.assertEqual(compat.check_contract(contract(), upstream)[0]["status"], "missing")

    def test_feed_failure_does_not_block_successful_presence_check(self):
        metadata, details, _ = self.resources()
        upstream = compat.collect_snapshot(contract(), self.reader(metadata, details, OSError("Feed unavailable")))
        self.assertEqual(compat.check_contract(contract(), upstream), [])
        self.assertIsNone(compat.acceptance_problem(contract(), upstream))
        self.assertIn("latest_release", upstream["metadata_errors"])


class IssueTests(unittest.TestCase):
    def test_issue_is_assigned_and_unchanged_findings_do_not_duplicate_or_notify(self):
        calls = []
        stored = []

        def read(url, token=None, method="GET", body=None):
            calls.append((method, body))
            if method == "GET":
                return json.dumps(stored)
            if method == "POST":
                stored.append({**body, "number": 42, "state": "open", "html_url": "https://github.com/a/b/issues/42"})
                return json.dumps(stored[0])
            stored[0].update(body)
            return json.dumps(stored[0])

        config, upstream = contract(), snapshot(version="1.1.0-alpha.17")
        upstream["latest_release"] = {"version": "1.0.7", "release_channel": "stable"}
        report = "# Finding\nObserved: today\nMissing text\n"
        compat.publish_issue(config, upstream, report, "a/b", "token", read)
        self.assertEqual(stored[0]["assignees"], ["Ozy-Viking"])
        self.assertEqual(stored[0]["title"], "Compatibility 1.1.0-alpha.17")
        compat.publish_issue(config, upstream, report.replace("today", "tomorrow"), "a/b", "token", read)
        self.assertEqual([method for method, _ in calls].count("POST"), 1)
        self.assertEqual([method for method, _ in calls].count("PATCH"), 0)
        stored[0]["state"] = "closed"
        compat.publish_issue(config, upstream, report + "New ambiguity\n", "a/b", "token", read)
        self.assertEqual(stored[0]["state"], "open")
        self.assertEqual([method for method, _ in calls].count("PATCH"), 1)

    def test_issue_lookup_paginates(self):
        calls = []
        def read(url, token=None, method="GET", body=None):
            calls.append(url)
            if url.endswith("&page=1"):
                return json.dumps([{"body": "unrelated"}] * 100)
            if method == "GET":
                return "[]"
            return '{"html_url":"https://github.com/a/b/issues/42"}'
        compat.publish_issue(contract(), snapshot(), "report", "a/b", "token", read)
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


if __name__ == "__main__":
    unittest.main()
