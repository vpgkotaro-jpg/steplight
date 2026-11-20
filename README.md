# StepLight

Turn an overwhelming task list into one clear next step.

Live: https://vpgkotaro-jpg.github.io/steplight/

StepLight is built for the moment when the list is so long that nothing gets started. You empty your head into one box, StepLight cleans it into a list, you pick one task, and the screen then shows only the next small physical step in large text. When you have to stop, you leave a note for future you, and the app opens with that note next time.

Built for the Taskforge student hackathon (November 2026).

## What it does

1. **Dump**: paste anything. Bullets, numbers, `[ ]` checkboxes, semicolons and "then" are understood. Finished `[x]` items and duplicates are dropped. Words like "by Fri" or "!!" are noticed.
2. **Pick**: a suggested order (urgent, then anything with a day, then your own order). The app never hides a task and never decides for you.
3. **Focus**: one task, one step. Each task starts with a concrete starter step ("Open the message and write only the first line"). Three buttons: Done, Too big (make it smaller), Pause with a note. An optional 2/10/25 minute timer.
4. **Resume**: after a pause, the app opens with "Welcome back. Last time you stopped at..." and your own note.

## Accessibility

- Every action works from the keyboard: `1` `2` `3` switch sections, `D` / `S` / `P` in Focus, arrow keys and `Delete` in the list.
- Screen readers: a polite live region announces what changed (task added, step done, time left every 5 minutes if enabled). Focus moves to the new step after every change, and every list item has a full label ("2 of 6: Email Ms. Tan, due fri. Press Enter to start.").
- Settings for larger text, extra letter and line spacing, high contrast and reduced motion. The system dark mode and reduced-motion settings are followed.
- Touch targets are at least 44 px. No flashing, no countdown pressure: the timer is optional and silent by default.

## Privacy

No account, no server, no analytics. Data stays in `localStorage` in your browser. "Download my list as text" and "Delete all data" are in Settings. A strict Content-Security-Policy blocks all network requests from the page. After the first visit it works offline (service worker).

## Run locally

```
python3 -m http.server 8000   # then open http://localhost:8000
node --test test/              # unit tests for the parser
```

No build step and no dependencies.

## Limits

- The parser is rule based and tuned for English. It does not understand dates beyond simple day words.
- Starter steps come from a fixed table of about a dozen task types, with a "2 minutes" fallback.
- Data lives in one browser. There is no sync between devices, by design.

## AI disclosure

I used Claude as an AI coding assistant while building StepLight. I chose what to build and tested it. The app itself uses no AI and sends nothing anywhere.

## License

MIT
