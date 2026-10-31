@AGENTS.md

# Claude Code notes (on top of AGENTS.md)

- Start every session with: `git switch main && git pull --rebase`, then `gh issue list --milestone "<current phase>"` and read the pinned Checklist issue. Don't trust a compaction summary over those.
- Before saying anything "works": name the status word (AGENTS.md → Honesty rules) and the evidence. Gate on `npm run check`'s exit code.
- Plan mode for anything touching more than a couple of files or another lane's folder.
- Use `gh` for issues and PRs. Put `Closes #N` in the PR body. Comment on the issue when you start and when you open the PR.
- Never use `git add -A`, force-push, or rewrite `main`.
- Teammate handles in issue or PR text: only write `@name` for a real login you mean to ping.
