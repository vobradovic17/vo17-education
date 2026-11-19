const express = require('express');
const app = express();
app.use(express.json());

const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

const cors = require('cors');
app.use(cors());

const dotenv = require('dotenv');
dotenv.config();

const history = require('./history.js');
const geography = require('./geography.js');
const _ = require('lodash');

app.get('/quiz', (req, res) => {
	let { type, question, questionstotal } = req.query;

	// parameter validation
	if (!(type == 'history' || type == 'geography')) {
		return res.status(400).json({status: 400, message: "Invalid query parameters"})
	}
	if (!(Number(question) > 0 && Number(question) <= 10)) {
		return res.status(400).json({status: 400, message: "Invalid query parameters"})
	}
	if (!(Number(questionstotal) > 0 && Number(questionstotal) <= 10)) {
		return res.status(400).json({status: 400, message: "Invalid query parameters"})
	}
	if (Number(question) > Number(questionstotal)) {
		return res.status(400).json({status: 400, message: "Invalid query parameters"})
	}

	let theme;

	let inputData = (type == 'history') ? history : geography;

	// divide themes into chunks based on number of questions
	let chunkSize = Math.floor(inputData.themes.length / questionstotal);

	let chunks = _.chunk(inputData.themes, chunkSize)

	if (inputData.themes.length > chunkSize * questionstotal) {
		chunks[questionstotal - 1] = _.concat(chunks[questionstotal - 1], chunks[questionstotal])
		chunks.pop();
	}

	let selectedChunk = chunks[question - 1];
	
	theme = selectedChunk[_.random(0, selectedChunk.length - 1)]

	// prompt text
	const prompt = `You are a school teacher. Create a 10 question ${type} quiz about ${theme}. For each question give 1 correct answer and 3 possible but wrong answers. Give me the answer in JSON format with no extra characters beside pure JSON format output. Use following structure: [{"question": "***question***", "answers": [{"correct": true, "answer": "***answer***"}, {"correct": false, "answer": "***answer***"}, {"correct": false, "answer": "***answer***"}, {"correct": false, "answer": "***answer***"}]]`

	// prompt validation before sending API request
	if (!(prompt && type && theme)) {
		return res.status(400).json({status: 400, message: "Invalid request"})
	}

	function sendPrompt(prompt, type, theme) {
		console.log("sendPrompt!!!")

		// send prompt to openAI
		fetch('https://api.openai.com/v1/responses', {
			method: 'POST',
			headers: {
				'Content-type': 'application/json',
				'Authorization': `Bearer ${process.env.OPENAI_KEY}`
			},
			body: JSON.stringify({
				"model": "gpt-4.1-2025-04-14",
				"temperature": 0,
				"input": prompt
			})
		}).then((response) => {
			return response.json()
		}).then((data) => {
			let output = JSON.parse(data.output[0].content[0].text);
			
			// randomly select one question
			let question = output[_.random(0, questionstotal - 1)]

			let correctAnswer = question.answers.filter((answer) => {
				return answer.correct
			}).map((answer) => {
				return answer.answer
			})

			let wrongAnswers = question.answers.filter((answer) => {
				return !answer.correct
			}).map((answer) => {
				return answer.answer
			})
			
			let allAnswers = [...correctAnswer, ...wrongAnswers].join(", ")

			// send another request for solution to question picked
			fetch('https://api.openai.com/v1/responses', {
				method: 'POST',
				headers: {
					'Content-type': 'application/json',
					'Authorization': `Bearer ${process.env.OPENAI_KEY}`
				},
				body: JSON.stringify({
					"model": "gpt-4.1-2025-04-14",
					"temperature": 0,
					"input": `On the theme of: '${theme}'. Question is: '${question.question}'. I have 4 possible answers of which one is true and the other three are false. Possible answers are: '${allAnswers}'. Give me the long answer to a question in a few sentences up to one paragraph length. After giving the long answer, review and edit possible answers for correctness. Give me the response in JSON format with no extra characters beside pure JSON format output. Use following structure: [{"question": "***question***", "longAnswer": "***longAnswer***", "possibleAnswers": [{"correct": true, "answer": "***answer***"}, {"correct": false, "answer": "***answer***"}, {"correct": false, "answer": "***answer***"}, {"correct": false, "answer": "***answer***"}]]`
				})
			}).then((response) => {
				return response.json()
			}).then((data) => {
				let output = JSON.parse(data.output[0].content[0].text)[0];
				console.log("output", output);

				// return data
				res.json({
					results: [
						{
							subject: type,
							theme: theme,
							question: question.question,
							answers: _.shuffle(output.possibleAnswers),
							solution: output.longAnswer,
						},
        			],
				});
			}).catch((error) => {
				console.log("error!!! resending request!!!", error);
				sendPrompt(prompt, type, theme)
			})
		}).catch((error) => {
			// error usually occurs because of malformed JSON in API response. resend request.
			console.log("error!!! resending request!!!", error);
			sendPrompt(prompt, type, theme)
		})
	
	}

// send prompt to openAI API
sendPrompt(prompt, type, theme)

});

// contact form: appends each message as one JSON line to messages.jsonl
const fs = require('fs');
const MESSAGES_FILE = path.join(__dirname, 'messages.jsonl');
const contactHits = new Map(); // ip -> [timestamps]
const CONTACT_LIMIT = 5;
const CONTACT_WINDOW_MS = 60 * 60 * 1000;

app.post('/contact', async (req, res) => {
	const { name, email, message, website } = req.body || {};

	// honeypot: pretend success for bots
	if (website) return res.json({ status: 200 });

	if (typeof name !== 'string' || typeof email !== 'string' || typeof message !== 'string' ||
		!name.trim() || !message.trim() ||
		name.length > 100 || email.length > 200 || message.length > 5000 ||
		!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		return res.status(400).json({ status: 400, message: "Invalid form data" });
	}

	// simple in-memory rate limit per IP
	const now = Date.now();
	const hits = (contactHits.get(req.ip) || []).filter((t) => now - t < CONTACT_WINDOW_MS);
	if (hits.length >= CONTACT_LIMIT) {
		return res.status(429).json({ status: 429, message: "Too many messages. Try again later." });
	}
	hits.push(now);
	contactHits.set(req.ip, hits);

	try {
		const entry = {
			receivedAt: new Date().toISOString(),
			name: name.trim(),
			email: email.trim(),
			message: message.trim()
		};
		await fs.promises.appendFile(MESSAGES_FILE, JSON.stringify(entry) + '\n');
		res.json({ status: 200 });
	} catch (error) {
		console.log("contact form error", error);
		res.status(500).json({ status: 500, message: "Could not save message" });
	}
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));