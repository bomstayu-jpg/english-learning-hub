# English Learning Hub – Combined Website

This project brings the existing **WORLDs APART!** and **BACK TO NATURE** learning units together under one homepage and one website address.

## Preserved learning units

- `public/worlds-apart/` – the existing WORLDs APART! interactive site, including vocabulary with Hebrew translations, flashcards, speech, recording, Hangman, Past Progressive practice, reading comprehension and guided writing.
- `public/back-to-nature/` – the existing Maor BACK TO NATURE interactive site, including vocabulary, grammar, reading/research, writing, speaking and voice-feedback features.
- `vocab.json` – the original BACK TO NATURE vocabulary data.
- `server.js` – the existing Node/Express API for Maor, voice feedback and teacher progress.

The homepage is `public/index.html`. Each unit includes a link back to the hub.

## Run locally

1. Install Node.js 20 or newer.
2. In this folder run `npm install`.
3. Copy `.env.example` to `.env`.
4. Add `OPENAI_API_KEY` and a strong `TEACHER_PASSWORD` to `.env` if you want Maor's AI conversation and voice-feedback features.
5. Run `npm start`.
6. Open `http://localhost:3000`.

The homepage opens at `/`, WORLDs APART! at `/worlds-apart/`, and BACK TO NATURE at `/back-to-nature/`.

## Deploy to Render

Create a Node Web Service from this repository. Use:
- Build command: `npm install`
- Start command: `npm start`

Set environment variables in Render:
- `OPENAI_API_KEY` – required for Maor's AI chat and audio feedback.
- `OPENAI_MODEL` – optional; defaults to the model configured in `server.js`.
- `TEACHER_PASSWORD` – set a strong password for the teacher progress dashboard.

Microphone access requires HTTPS (Render provides HTTPS). For reliable student progress storage, configure a persistent disk for the `data` directory; otherwise local filesystem data may not survive redeploys or restarts.

## Important

The two existing learning units remain separate and accessible from the shared homepage. The combined homepage does not merge their lesson content or remove their activities.
