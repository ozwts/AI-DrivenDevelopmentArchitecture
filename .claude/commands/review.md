---
description: Launch guardrails-reviewer agent to review code changes against Guardrails policies
---

Use the Task tool with subagent_type=guardrails-reviewer to review code changes against Guardrails policies.

If the user provided file paths after the command, review those specific files.
If the user said "変更したファイル" or "modified files", the agent will automatically find them using git.
Otherwise, ask the user which files they want to review.

The guardrails-reviewer agent will:
1. Map files to policies based on path patterns
2. Read relevant policy files
3. Check code against policy requirements
4. Report violations and compliance in Japanese with file:line references

Examples:
- `/review server/src/domain/model/todo/todo.ts` - Review specific file
- `/review web/src/pages/TodosPage/TodoForm.ct.test.tsx` - Review test file
- `/review` - Review modified files (agent will find them)
