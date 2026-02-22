# Daybound

Daybound brings time clarity to distributed teams with a delightful timezone dashboard built for remote work. No more guessing who’s working when.

## Development

Run `npm run build` to generate the `dist` folder, then serve it with any static file server.

## Project Structure

- `src/app/App.tsx`: Main application logic.
- `src/app/components`: UI components.
- `src/hooks`: Custom React hooks (time, persistent storage).
- `src/utils`: Timezone helpers and squircle paint worklet.

Settings and timezone configuration are persisted in `localStorage`.
