import { createApp } from './app.js';

const { app } = createApp(process.env.DATABASE_PATH);
const port = Number(process.env.PORT) || 3001;
app.listen(port, '127.0.0.1', function started() {
  console.log(`Сотрудники: http://127.0.0.1:${port}`);
});
