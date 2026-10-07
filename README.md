# TaskFoo

A full-stack project management application with projects, epics and task workflows, role-based access, audit events and real-time updates. Built during my software engineering internship at VBT Software.

[Onur Ergüden](https://onurerguden.dev) · [Portfolio context](https://onurerguden.dev/en/projects#taskfoo)

## Features

- Project and epic organization, task assignment, statuses and priorities.
- Authentication and role-based access with Spring Security and JWT.
- PostgreSQL persistence through Spring Data JPA.
- WebSocket/STOMP integration for real-time updates.
- A React/TypeScript interface using Ant Design, TanStack Query and drag-and-drop components.
- A separate Rasa bot module in `taskfoo-bot/`.

## Architecture

```text
React + TypeScript (Vite) → Spring Boot REST API → PostgreSQL
                         ↔ WebSocket/STOMP updates
```

| Directory | Purpose |
| --- | --- |
| `taskfoo-backend/` | Spring Boot services, controllers, persistence and security |
| `taskfoo-frontend/` | React application, views and API integration |
| `taskfoo-bot/` | Rasa configuration, training data and actions |

## Local development

The backend targets **Java 24** in its Maven configuration. Use Java 24, PostgreSQL and **Node.js 22.12+** for the frontend, following [Vite 7's Node requirements](https://vite.dev/blog/announcing-vite7#node-js-support).

Clone the repository:

```sh
git clone https://github.com/onurerguden/TaskFoo.git
cd TaskFoo
```

Create a local PostgreSQL database and user. Configure the backend with your own local values using Spring Boot environment variables:

```sh
export SPRING_DATASOURCE_URL='jdbc:postgresql://localhost:5432/taskfoo'
export SPRING_DATASOURCE_USERNAME='your_local_user'
export SPRING_DATASOURCE_PASSWORD='your_local_password'
export JWT_SECRET='replace-with-a-long-random-local-secret-at-least-64-characters'
```

Then start the backend:

```sh
cd taskfoo-backend
./mvnw spring-boot:run
```

On Windows, use `mvnw.cmd`. The configured API port is `8080` and the frontend origin is `http://localhost:5173`. The committed configuration is for local development; use environment-specific credentials and configuration for any deployment.

In another terminal, start the frontend:

```sh
cd taskfoo-frontend
npm ci
npm run dev
```

These steps cover the core web application. The Rasa module has separate configuration in `taskfoo-bot/`.

## Available checks

From `taskfoo-backend/`:

```sh
./mvnw test
```

The Spring Boot context test requires a reachable database and valid backend configuration. From `taskfoo-frontend/`:

```sh
npm run lint
npm run build
```

The frontend has no dedicated test script in its current package manifest. These are the repository's existing checks; they do not by themselves establish end-to-end coverage.
