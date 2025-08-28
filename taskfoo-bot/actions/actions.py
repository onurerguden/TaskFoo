# actions/actions.py
from typing import Any, Dict, List, Text
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher

class ActionNavigatePage(Action):
    def name(self) -> Text:
        return "action_navigate_page"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[Dict[Text, Any]]:
        text = (tracker.latest_message.get("text") or "").lower()

        routes = {
            "board": "/board",
            "gantt": "/gantt",
            "gantt chart": "/gantt",
            "dashboard": "/dashboard",
            "tasks": "/tasks",
            "task list": "/tasks",
            "new task": "/tasks/new",
            "projects": "/projects",
            "new project": "/projects/new",
            "epics": "/epics",
            "new epic": "/epics/new",
            "users": "/users",
            "new user": "/users/new",
            "audit": "/audit",
        }

        target = None
        for k, v in routes.items():
            if k in text:
                target = v
                break

        if target:
            # Send a structured payload the frontend can catch
            dispatcher.utter_message(
                text=f"Opening {target}…",
                json_message={"type": "navigate", "route": target},
            )
        else:
            dispatcher.utter_message(
                text="Tell me which page to open (e.g. “Open Board”, “Go to Dashboard”)."
            )

        return []