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

### Documentation Writing Guidelines
- Documentation files must be saved in the `code-history/` directory
- File naming convention: `YYYY-MM-DD-[feature-or-change-name].md` (e.g., `2026-02-21-add-auth-system.md`)
- All documentation should be written so that a developer seeing the codebase for the first time can fully understand the change
- Follow the Documentation Guide template above, with these detailed requirements for each section:

#### Section-specific requirements:
- **Overview**: Clearly describe why this change was made, what problem it solves, and any relevant background or context — not just what was changed
- **Changed Files**: List every modified, created, and deleted file with a one-line description of each file's role in the change
- **Major Changes**: Explain core logic step-by-step; include code snippets for non-obvious implementations, and describe the data flow or control flow where applicable
- **How to use it**: Provide concrete examples — API call samples with request/response, CLI commands, or UI interaction steps — so that a reader can immediately try the feature
- **Related Components/Modules**: Identify upstream and downstream dependencies, explain how this change interacts with existing systems, and note any side effects
- **Precautions**: Document known limitations, edge cases, required environment variables or configurations, and any planned future improvements

### Code Comment Guidelines
- Include appropriate comments when writing all code
- Functions/Methods: Describe purpose, parameters, and return values
- Complex logic: Explain why it was implemented this way
- TODO/FIXME: Mark areas that need future improvement
- Comments should explain "why", not "what"

### Client UI i18n Guidelines
- All hardcoded user-facing strings (labels, placeholders, tooltips, alt texts, etc.) must be managed through i18next — never embed display text directly in TSX. Date and number formatting must also follow the active locale configuration.

### Documented Judgment Criteria
- Add New Features → Documentation Required
- Fix bugs (except simple fixes) → Documentation recommended
- Refactoring → Documentation required for structural changes
- Change settings → Document if it affects the environment

### Build & Commit Policy
- After all code modifications and file creations are complete, always run the build
- Only proceed with commit if the build succeeds
- If the build fails, fix the errors and rebuild before committing
- Commit messages must always be written in Korean