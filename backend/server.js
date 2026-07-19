const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./src/config/swagger');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Enable CORS for frontend running on port 3000
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve interactive Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// Mount API Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/attendance', require('./src/routes/attendance'));
app.use('/api/leaves', require('./src/routes/leaves'));
app.use('/api/shifts', require('./src/routes/shifts'));
app.use('/api/reports', require('./src/routes/reports'));
app.use('/api/dashboard', require('./src/routes/dashboard'));

// Root Endpoint
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>WorkTrack Pro API</title></head>
      <body style="font-family: sans-serif; padding: 40px; background-color: #f9fafb; color: #111827;">
        <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
          <h1 style="color: #4f46e5; margin-top:0;">WorkTrack Pro API Server</h1>
          <p>The Express API backend is running successfully.</p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p>👉 Access interactive <strong>Swagger API documentation</strong> here: 
             <a href="/api-docs" style="color: #4f46e5; font-weight: bold; text-decoration: none;">http://localhost:${PORT}/api-docs</a>
          </p>
        </div>
      </body>
    </html>
  `);
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error Exception:', err.stack);
  res.status(500).json({ message: 'Internal Server Error' });
});

// Bind to Port
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🚀 WORKTRACK PRO API BACKEND IS RUNNING`);
  console.log(`📡 URL:                 http://localhost:${PORT}`);
  console.log(`📖 Swagger Document:    http://localhost:${PORT}/api-docs`);
  console.log(`==================================================`);
});
