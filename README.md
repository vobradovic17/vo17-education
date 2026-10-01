# VO17 Education Quiz API

An Express API that generates educational history and geography quiz questions with the OpenAI API. Each request selects a topic from the project's built-in curriculum and returns a multiple-choice question with a longer answer explaining the solution.

## Why use it

- Generate questions across a broad set of history and geography topics.
- Request a particular position in a quiz, with topics distributed across the available themes.
- Receive one correct answer, three distractors, and an explanatory solution in a JSON response.
- Integrate the API with a separate frontend or learning tool.

## Getting started

### Requirements

- Node.js 18 or later (the server uses the built-in `fetch` API).
- An OpenAI API key with access to the `gpt-4.1-2025-04-14` model.

### Install and run

```sh
git clone https://github.com/vobradovic17/vo17-education.git
cd vo17-education
npm install
```

Create a `.env` file in the project root and add your key:

```env
OPENAI_KEY=your_openai_api_key
```

Start the API:

```sh
node app.js
```

The server listens on port `3000` by default. Set `PORT` in the environment to use a different port.

### Request a question

The `GET /quiz` endpoint accepts these query parameters:

| Parameter | Values | Description |
| --- | --- | --- |
| `type` | `history` or `geography` | Subject area. |
| `question` | `1`-`10` | Quiz slot used to select a segment of the subject's topic list. |
| `questionstotal` | `1`-`10` | Number of questions in the quiz; must be at least `question`. |

For example, request the first question in a 10-question history quiz:

```sh
curl --get http://localhost:3000/quiz \
  --data-urlencode "type=history" \
  --data-urlencode "question=1" \
  --data-urlencode "questionstotal=10"
```

The response contains a `results` array with one item, including `subject`, `theme`, `question`, `answers`, and `solution`. Each answer has an `answer` string and a `correct` boolean. Invalid query parameters return HTTP `400`.

Each request makes two calls to OpenAI to generate the quiz content and explanation. OpenAI usage may incur charges on the account associated with `OPENAI_KEY`.

## Help

- Report bugs or request help through [GitHub Issues](https://github.com/vobradovic17/vo17-education/issues).
- Review the [source code](https://github.com/vobradovic17/vo17-education) for the available topic lists and implementation details.

## Maintainers and contributions

The repository is maintained by [@vobradovic17](https://github.com/vobradovic17). Contributions are welcome: open an issue to discuss a change, then submit a pull request against the repository. Please keep changes focused and include relevant verification details in the pull request.

The package metadata declares the ISC license. A separate `LICENSE` file is not currently included.

## Development

Run the server with `node app.js`. The `npm test` script is currently a placeholder and does not run a test suite.