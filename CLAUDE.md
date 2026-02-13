# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

### Documentation Guide
To help developers who are new to the project understand, we include:

```markdown
# [Function/Work Name]

## Overview
- Work purpose and background description

## Changed Files
- list of modified/created/deleted files and the role of each file

## Major Changes
- Description of core logic and implementation
- With cord snippet (if required)

## How to use it
- Example of how to use a new feature or call API

## Related Components/Modules
- Relationships with other related files or systems

## Precautions (optional)
- Known limitations, future improvements
```

### Code Comment Guidelines
- Include appropriate comments when writing all code
- Functions/Methods: Describe purpose, parameters, and return values
- Complex logic: Explain why it was implemented this way
- TODO/FIXME: Mark areas that need future improvement
- Comments should explain "why", not "what"

### Documented Judgment Criteria
- Add New Features → Documentation Required
- Fix bugs (except simple fixes) → Documentation recommended
- Refactoring → Documentation required for structural changes
- Change settings → Document if it affects the environment