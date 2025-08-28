# 1) retrain (rules/stories/domain changed)
#rasa train

# 2) start the action server (terminal A)
#rasa run actions -p 5055 --debug

# 3) start the bot server (terminal B)
#rasa run --enable-api -p 5005 --cors "*" --debug