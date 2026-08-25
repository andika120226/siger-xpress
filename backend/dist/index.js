// backend/dist/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const healthRouter = require('./routes/health').default;
const routeRouter = require('./routes/route').default;
const forecastingRouter = require('./routes/forecasting').default;
const vehicleRouter = require('./routes/vehicle').default;
const warehouseRouter = require('./routes/warehouse').default;

const app = express();

app.use(cors());
app.use(express.json());

// Mount routes under /api/v1
app.use('/api/v1', healthRouter);
app.use('/api/v1', routeRouter);
app.use('/api/v1', forecastingRouter);
app.use('/api/v1', vehicleRouter);
app.use('/api/v1', warehouseRouter);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(err.statusCode || 500).json({
    status: 'error',
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
