# Local assistant evaluation

The assistant was evaluated on a seeded board with two projects that share the task title **Report**. The fixed [40 prompts](assistant_prompts.json) include 20 normal requests, 10 incomplete requests and 10 adversarial requests in Turkish and English. A normal request is correct when the selected tool and canonical arguments exactly match the expected values. Incomplete or adversarial requests are correct when the server requests clarification. The evaluator checks the full task snapshot and audit count before and after running all requests without confirmation.

| Category | Initial | Final regression | Final p95 |
| --- | ---: | ---: | ---: |
| Normal | 16/20 | 20/20 | 2.79 s |
| Incomplete | 10/10 | 10/10 | 3.70 s |
| Adversarial | 9/10 | 10/10 | 2.63 s |

Both runs used local Ollama 0.13.5 with `qwen3:4b-instruct-2507-q4_K_M` on an Apple M1 Pro with 16 GB unified memory. Neither run wrote a task or audit row without confirmation. The final run repeats the same set after changes motivated by the initial errors, so it is a regression result. The [initial output](assistant_initial_results.json) and [final output](assistant_results.json) include each case and its measured latency.

## Failures and decisions

The initial model sometimes included Turkish words surrounding a title in the tool argument. It also treated one explicitly foreign project request as an in-scope search. Tool instructions now explain how to preserve literal titles and supply only explicit values. The server independently checks named project scope and requires write values to appear in the user's request. Unverified values produce a clarification.

## Transaction evidence

[The PostgreSQL integration tests](../taskfoo-backend/src/test/java/com/taskfoo/taskfoo_backend/assistant/AssistantIntegrationTest.java) replace the model output with fixed cases and verify a different property. A changed role, moved or stale task and conflicting write must never mutate the protected task. Two simultaneous confirmations return one receipt and produce one audit row. The rollback test uses a real PostgreSQL check constraint to force the audit insert to fail before retrying the same proposal.
