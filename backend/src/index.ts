import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import incidentRoutes from './routes/incidentRoutes';
import authRoutes from './routes/authRoutes';
import settingsRoutes from './routes/settingsRoutes';
import webhookRoutes from './routes/webhookRoutes';
import alertRoutes from './routes/alertRoutes';
import { detectionEngine } from './services/detectionEngine';

dotenv.config();

const app = express();
const httpServer = createServer(app);
export const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/alerts', alertRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Socket.io connection logic
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Mock Incident Socket Emitter
export const notifyIncident = (incident: any) => {
  io.emit('new_incident', incident);
};

// Start Detection Engine
detectionEngine.start();

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
