# Flashcards

A study tool. Users create question/answer cards, flip them in review mode, and mark each as known or unknown.

## Core interactions

- Add a new card with a question and an answer
- Enter review mode: cards show the question first; click or press Space to flip to the answer
- Mark each card as Known or Still learning
- Edit or delete a card from the list
- Deck persists across reloads

## Stack

HTML, CSS, JavaScript, localStorage, GitHub Pages. No server, no database, no frameworks, no build step.

## Run

Open `index.html` in a browser.

## Rules

- Do not add any new libraries without asking first.

## Layout

- `index.html`: markup for the Deck and Review tabs
- `style.css`: styles, with light and dark themes
- `app.js`: all logic; the deck is stored under the `flashcards.deck.v1` localStorage key

## Gotchas

- After marking a card, focus is returned to the card (`mark()` in `app.js`). Otherwise a focused Known or Still learning button would treat the next Space press as a click instead of a flip.
