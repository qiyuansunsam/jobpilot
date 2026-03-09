import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import { migrate } from './db/connection';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import profileRoutes from './routes/profile.routes';
import credentialsRoutes from './routes/credentials.routes';
import preferencesRoutes from './routes/preferences.routes';
import applicationsRoutes from './routes/applications.routes';
import aiRoutes from './routes/ai.routes';
import linkedinRoutes from './routes/linkedin.routes';
import chatRoutes from './routes/chat.routes';

// Run migrations
migrate();

const app = express();

app.use(cors({ origin: [
  'http://localhost:5173',
  /\.ngrok-free\.app$/,
] }));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/credentials', credentialsRoutes);
app.use('/api/preferences', preferencesRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/linkedin', linkedinRoutes);
app.use('/api/chat', chatRoutes);

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Serve built client in production
const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Error handler
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`[server] JobPilot API running on http://localhost:${config.port}`);
});
