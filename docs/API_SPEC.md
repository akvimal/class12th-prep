# API Specification Baseline

This is a logical contract. Exact paths may be adapted to the selected framework, but capabilities and authorization boundaries should remain.

## Conventions

- JSON API
- IDs are opaque UUID/ULID-style values
- dates: `YYYY-MM-DD`
- timestamps: ISO-8601 UTC
- validation errors return machine-readable field errors
- role authorization is server-side

## Student/plan

- `POST /students`
- `GET /students/{id}`
- `POST /students/{id}/academic-years`
- `POST /academic-years/{id}/plans`
- `GET /plans/{id}`
- `PATCH /plans/{id}`
- `GET /plans/{id}/trajectory`

## Curriculum

- `GET /curriculum-versions`
- `GET /curriculum-versions/{id}`
- `GET /curriculum-versions/{id}/subjects`
- `GET /subjects/{id}/hierarchy`
- admin import/create endpoints as required

## Enrollment/progress

- `POST /academic-years/{id}/subjects`
- `GET /academic-years/{id}/subjects`
- `PATCH /chapter-progress/{id}`

## School context

- `POST /academic-years/{id}/calendar-events`
- `GET /academic-years/{id}/calendar-events`
- `POST /academic-years/{id}/assessments`
- `PATCH /assessments/{id}`

## Planner

- `GET /plans/{id}/today?date=...`
- `POST /plans/{id}/study-now`
  - body: `{ "availableMinutes": 45 }`
- `POST /study-tasks/{id}/complete`
- `POST /study-tasks/{id}/partial`
- `POST /study-tasks/{id}/skip`

Recommendation responses include:

```json
{
  "task": {},
  "reasonCodes": ["SCHOOL_TEST_SOON", "LOW_READINESS"],
  "explanation": "..."
}
```

## Revision

- `GET /academic-years/{id}/revisions?status=DUE`
- `POST /revisions/{id}/complete`
- `POST /revisions/{id}/outcome`

## Assessment/error

- `POST /assessments/{id}/result`
- `POST /assessments/{id}/errors`
- `PATCH /errors/{id}`
- `POST /errors/{id}/retest`

## Readiness/review

- `GET /academic-years/{id}/readiness`
- `GET /subjects/{enrollmentId}/readiness`
- `GET /academic-years/{id}/weekly-reviews`
- `POST /academic-years/{id}/weekly-reviews/generate`

## Parent-safe API - later

- `GET /parent/students/{id}/summary`

This endpoint must return aggregate permitted data only. Do not reuse a detailed student activity endpoint and hide fields client-side.

## Domain events

Internal/event API as architecture requires. External notification delivery is not required in the critical MVP.
