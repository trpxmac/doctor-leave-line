import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API Routes
app.use('/api', apiRoutes);

// In production, serve the frontend dist folder
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// Fallback for SPA routing in Express 5
app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('Doctor Leave @ LINE API Server is running. Access Vite at http://localhost:5173');
    }
  });
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🏥 Doctor Leave @ LINE Server`);
  console.log(`📍 Running on http://localhost:${PORT}`);
  console.log(`📡 API Base: http://localhost:${PORT}/api`);
  console.log(`====================================================`);
});
