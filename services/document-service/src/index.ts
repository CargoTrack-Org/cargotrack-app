import express from 'express';
import cors from 'cors';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import healthRoutes from './routes/health';
import documentRoutes from './routes/documents';

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

// Document service owns all /api/documents/* routes.
// nginx proxies these paths here; core-service never handles them.
app.use('/api/health', healthRoutes);
app.use('/api/documents', documentRoutes);

app.use(errorHandler);

app.listen(config.port, '0.0.0.0', () => {
  console.log(`[document-service] Running on port ${config.port} (${config.nodeEnv})`);
});
