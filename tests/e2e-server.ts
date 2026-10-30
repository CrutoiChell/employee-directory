import { createApp } from '../server/app.js';

// Real API + isolated SQLite: browser checks never modify the user's database.
const { app } = createApp(':memory:');
app.listen(3100, '127.0.0.1');
