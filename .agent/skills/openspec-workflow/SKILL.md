---
name: openspec-workflow
description: OpenSpec format for spec-driven development with proposal, specs, design, and tasks artifacts
---

## OpenSpec Workflow

Before writing code, generate these artifacts in `openspec/changes/{change-name}/`:

### 1. proposal.md — Why
- **Goals**: What we're trying to achieve
- **Non-Goals**: What we're explicitly NOT doing (prevents scope creep)
- **Impact**: What will change in the system

### 2. specs/{feature}/spec.md — What (Delta Spec)
Behavior contracts using Requirements + Scenarios.

**RFC 2119 keywords:**
- SHALL / MUST: mandatory
- SHOULD: recommended
- MAY: optional

**Scenario format (Given/When/Then):**
```
### Requirement: {name}
The system SHALL {behavior}.

#### Scenario: {scenario name}
- GIVEN {initial state}
- WHEN {trigger action}
- THEN {expected result}
- AND {additional result}
```

**Delta sections (describe ONLY what changes):**
- **ADDED**: New behavior → merged into main spec on archive
- **MODIFIED**: Changed existing behavior → replaces original requirement
- **REMOVED**: Deprecated behavior → deleted from main spec

### 3. design.md — How
- **Technical approach**: Architecture decisions, file structure changes
- **Alternatives considered**: Other approaches and why they were rejected
- **Risk assessment**: Potential issues and mitigation

### 4. tasks.md — Steps
Implementation checklist for step-by-step execution:
```
- [ ] 1. {Task description}
- [ ] 2. {Task description}
```
- Each task should be granular and verifiable against a spec scenario
- Ordered for sequential implementation
- No task should depend on unmentioned assumptions

## Important Rules
- Read existing code and specs before writing new ones
- Delta specs describe ONLY the diff, never rewrite entire specs
- Non-goals section is critical — be explicit about what's out of scope
- Tasks must map to spec scenarios for verification
