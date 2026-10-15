## ADDED Requirements

### Requirement: Separate API origin
Frontend SHALL use the configured VITE_API_ORIGIN for API requests and OAuth navigation, including cookies with credentials=include.

#### Scenario: Production build
- **WHEN** the app is built for the public deployment
- **THEN** API requests target https://api.worldofleprechauns.ru

#### Scenario: Local development
- **WHEN** VITE_API_ORIGIN is empty
- **THEN** requests use the local frontend origin and Vite proxy