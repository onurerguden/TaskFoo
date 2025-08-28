# actions.py
# No custom actions for now. This bot only uses response templates.
# You can extend this later if you want to fetch live data.

# Example skeleton:
# from rasa_sdk import Action, Tracker
# from rasa_sdk.executor import CollectingDispatcher
#
# class ActionExample(Action):
#     def name(self): return "action_example"
#     def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain):
#         dispatcher.utter_message(text="Example action response")
#         return []