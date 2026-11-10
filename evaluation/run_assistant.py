"""Score real HTTP assistant replies against fixed synthetic requests."""

import argparse
import json
import math
import os
import platform
import time
from pathlib import Path
from urllib.request import Request, urlopen


def run(args):
    def api(path, data=None, token=None):
        request = Request(args.base + path, headers={
            "Content-Type": "application/json",
            **({"Authorization": f"Bearer {token}"} if token else {}),
        }, data=None if data is None else json.dumps(data).encode())
        with urlopen(request, timeout=75) as response:
            return json.load(response)

    password = os.environ["TASKFOO_DEMO_PASSWORD"]
    auth = api("/auth/login", {"email": "pm@example.test", "password": password})
    token = auth.get("token") or auth["accessToken"]
    projects = {row["name"]: row["id"] for row in api("/api/projects", token=token)}
    project = projects["Delivery Lab"]
    status = {row["id"]: row["name"] for row in api("/api/statuses", token=token)}
    priority = {row["id"]: row["name"] for row in api("/api/priorities", token=token)}
    epic_rows = api("/api/epics", token=token)
    epics = {row["id"]: row["name"] for row in epic_rows}
    project_epics = {row["id"] for row in epic_rows if (row["project"] or {}).get("id") == project}
    snapshot = api("/api/tasks", token=token)
    count = api("/api/audit-events?entityType=TASK&size=1", token=token)["total"]
    report_id = next(row["id"] for row in snapshot if row["title"] == "Report"
                     and (row["epic"] or {}).get("id") in project_epics)

    def chat(prompt):
        start = time.perf_counter()
        result = api("/api/assistant/chat", {"projectId": project, "message": prompt}, token)
        return result, (time.perf_counter() - start) * 1000

    if args.demo:
        matches, _ = chat("Find tasks named Report")
        response, _ = chat("Change the status of Report to Done")
        proposal = response["preview"]
        path = f"/api/assistant/proposals/{proposal['id']}/confirm"
        receipt = api(path, {}, token)
        assert receipt == api(path, {}, token)
        changed = api(f"/api/tasks/{receipt['taskId']}", token=token)
        after = api("/api/audit-events?entityType=TASK&size=1", token=token)
        assert len(matches["tasks"]) == 1 and matches["tasks"][0]["id"] == receipt["taskId"]
        assert after["total"] == count + 1
        print(json.dumps({"project": "Delivery Lab", "search": matches, "preview": proposal,
                          "confirmed": receipt, "task": changed, "audit": after["content"][0]}, indent=2))
        return

    prompts = json.loads(Path(__file__).with_name("assistant_prompts.json").read_text())
    results = []
    for category, cases in prompts.items():
        for number, (language, question, *expected) in enumerate(cases, start=1):
            reply, elapsed = chat(question)
            tool = None
            actual = {}
            if reply["kind"] == "matches":
                tool = "search_tasks"
                actual["matches"] = [row["id"] for row in reply["tasks"]]
            if reply["kind"] == "preview":
                cmd = reply["preview"]["command"]
                tool = cmd["tool"]
                actual = {key: cmd[key] for key in ("title", "description", "startDate", "dueDate") if cmd.get(key)}
                if cmd.get("taskId"):
                    actual["taskId"] = cmd["taskId"]
                if cmd.get("statusId"):
                    actual["status"] = status[cmd["statusId"]]
                if cmd.get("epicId"):
                    actual["epic"] = epics[cmd["epicId"]]
                if cmd.get("priorityId"):
                    actual["priority"] = priority[cmd["priorityId"]]
            if category == "normal":
                expected_tool, expected_args = expected
                if expected_tool == "search_tasks":
                    expected_args = {"matches": [report_id]}
                elif expected_tool in ("update_task", "change_status"):
                    expected_args = {**expected_args, "taskId": report_id}
                correct = tool == expected_tool and actual == expected_args
            else:
                expected_tool, expected_args = None, {}
                correct = reply["kind"] == "clarify"
            results.append(dict(id=f"{category}-{number:02}", language=language, prompt=question, tool=tool,
                                arguments=actual, kind=reply["kind"], expected_tool=expected_tool,
                                expected_args=expected_args, correct=correct, ms=elapsed))
            print(results[-1]["id"], reply["kind"], tool, correct, round(elapsed), flush=True)
    assert api("/api/tasks", token=token) == snapshot, "Tasks changed without confirmation"
    assert api("/api/audit-events?entityType=TASK&size=1", token=token)["total"] == count
    summary = {}
    for category in prompts:
        rows = [row for row in results if row["id"].startswith(category + "-")]
        summary[category] = {"n": len(rows), "correct": sum(row["correct"] for row in rows),
                             "p95_ms": sorted(row["ms"] for row in rows)[math.ceil(len(rows)*.95)-1]}
    args.output.write_text(json.dumps({"hardware": platform.platform(), "model": args.model,
                                       "summary": summary, "unconfirmed_mutations": 0, "queries": results},
                                      indent=2, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", default="http://127.0.0.1:8080")
    parser.add_argument("--model", default="qwen3:4b-instruct-2507-q4_K_M")
    parser.add_argument("--output", type=Path, default=Path("evaluation/assistant_results.json"))
    parser.add_argument("--demo", action="store_true")
    run(parser.parse_args())
