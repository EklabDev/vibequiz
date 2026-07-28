# VibeQuiz

VS Code extension that turns your current git diff into a multiple-choice quiz. Pass the configured score to unlock creating a GitHub pull request — with `{{score}}` and `{{question}}` filled into your PR template.

## Features

- **Source Control pane** — VibeQuiz view under the Git tab
- **Create Quiz** — generates an MC quiz from your diff vs a base branch (default `main`)
- **Editor quiz panel** — take the quiz in the main editor area
- **PR gate** — Create Pull Request is enabled only after a passing score
- **LLM providers** — GitHub Copilot (primary / Enterprise), OpenAI API, Anthropic (Claude) API
- **Configurable** difficulty, question count, passing score, base branch, and PR title/body templates

## Install (development)

```bash
npm install
npm run build
```

Press **F5** in VS Code/Cursor (Run Extension) or:

```bash
npm run package   # produces vibequiz-0.1.0.vsix
code --install-extension vibequiz-0.1.0.vsix
```

## Settings

Search for `VibeQuiz` in Settings, or run **VibeQuiz: Open Settings**.

| Setting | Default | Description |
|---|---|---|
| `vibequiz.llmProvider` | `copilot` | `copilot`, `openai`, or `anthropic` |
| `vibequiz.openaiModel` | `gpt-4o` | Model when using OpenAI |
| `vibequiz.anthropicModel` | `claude-sonnet-4-20250514` | Model when using Anthropic |
| `vibequiz.difficulty` | `medium` | `easy`, `medium`, or `hard` |
| `vibequiz.questionCount` | `5` | Number of MC questions |
| `vibequiz.passingScore` | `70` | Minimum % to unlock PR creation |
| `vibequiz.baseBranch` | `main` | Diff + PR base branch |
| `vibequiz.prTitleTemplate` | `VibeQuiz: {{score}}% — ready for review` | PR title |
| `vibequiz.prBodyTemplate` | includes score + questions | PR body |

### Template placeholders

- `{{score}}` — numeric score (e.g. `85`)
- `{{question}}` — numbered list of prompts and options **without** correct answers

### API keys

Run **VibeQuiz: Set API Key** to store OpenAI or Anthropic keys in VS Code Secret Storage (not in settings.json).

## Workflow

1. Configure provider, difficulty, question count, passing score, and PR template.
2. Open the **Source Control** view → **VibeQuiz** pane.
3. Click **Create Quiz** (works at any git status as long as a repo is open and there is a diff vs the base branch).
4. Complete the quiz in the editor panel.
5. If you pass, click **Create Pull Request** — the extension authenticates with GitHub, pushes the branch if needed, and creates the PR via Octokit.

## Copilot Enterprise notes

- Requires GitHub Copilot chat/language-model access in the editor.
- Org policies may hide models; if `selectChatModels` returns none, switch `vibequiz.llmProvider` to `openai` or `anthropic`.
- Quiz generation runs only from an explicit user action (Create Quiz).

## Scripts

```bash
npm run build    # bundle extension
npm run watch    # rebuild on change
npm run compile  # typecheck
npm test         # unit tests
```

## License

MIT
