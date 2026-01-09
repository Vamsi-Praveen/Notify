import express from 'express';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

import bodyParser from 'body-parser';
import session from 'express-session';
import httpLogger from './middlewares/logger.middleware.js';
import adminRouter from './routes/admin.routes.js';
import apiRouter from './routes/api.routes.js';
import clientRouter from './routes/client.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' },
  })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

app.use(httpLogger);

app.use(limiter);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  return res.status(200).send('Application is Running!');
});

app.use('/api/v1', apiRouter);

app.use('/', clientRouter);

app.use('/admin', adminRouter);

export default app;
