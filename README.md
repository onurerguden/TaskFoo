# TaskFoo

TaskFoo is a project board built with Spring Boot, PostgreSQL and React. My contribution adds a local LLM assistant that can find a task and prepare a change. A project manager or administrator sees the exact change before deciding whether to commit it.

[Browser demo](docs/demo.mp4) · [Evaluation and failure analysis](evaluation/README.md) · [PostgreSQL integration tests](taskfoo-backend/src/test/java/com/taskfoo/taskfoo_backend/assistant/AssistantIntegrationTest.java)

```sh
python3 evaluation/run_assistant.py --demo
```

## Run the demo

Use Java 24, Node.js 22.12 or later, Docker Compose and Ollama. Run the database and pull the model from the repository root.

```sh
docker compose up -d --wait postgres
ollama pull qwen3:4b-instruct-2507-q4_K_M
export SPRING_DATASOURCE_PASSWORD=local-taskfoo
export JWT_SECRET="$(openssl rand -hex 64)"
export TASKFOO_DEMO_PASSWORD=local-demo-only
(cd taskfoo-backend && SPRING_PROFILES_ACTIVE=assistant-demo ./mvnw spring-boot:run)
```

In a second terminal, run:

```sh
cd taskfoo-frontend
npm ci
npm run dev
```

Open the Vite URL and sign in as `pm@example.test` with the demo password. The demo profile seeds two projects with a task called **Report**. Open the assistant, choose **Delivery Lab**, and ask it to find **Report**. Then ask it to change the status of **Report** to **Done**. Confirm the preview and inspect the board and the audit page. Use a fresh demo database when repeating the same write scenario.

The model runs locally. Set `TASKFOO_ASSISTANT_URL` when Ollama uses a different loopback address. The PostgreSQL connection uses `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME` and `SPRING_DATASOURCE_PASSWORD`.

## What the server verifies

`POST /api/assistant/chat` accepts the selected project and a request. It returns matching task IDs, a clarification, or a single preview. The server validates the model's four tool schemas and resolves names against the selected project's records. Write values must be explicit in the request. The project selector limits the assistant's search and write targets within TaskFoo's existing access model.

`POST /api/assistant/proposals/{id}/confirm` rechecks ownership, the current role, expiration and the task version. PostgreSQL locks the proposal during confirmation. The task change, audit event and receipt commit together. A replay returns the same receipt. The board refresh event contains the task ID and is sent after commit.

## Reproduce the checks

```sh
(cd taskfoo-backend && ./mvnw test)
(cd taskfoo-frontend && npm run build && npx eslint src/components/Chatbot.tsx src/api/auth.ts)
TASKFOO_DEMO_PASSWORD=local-demo-only python3 evaluation/run_assistant.py --output /tmp/taskfoo-results.json
```

The fixed model evaluation submits read requests and previews. Run it against the seeded project before the demo changes **Report** to **Done**.
