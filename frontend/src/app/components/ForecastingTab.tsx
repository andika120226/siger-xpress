'use client';

import { useMemo, useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000/api/v1';

interface ForecastPoint {
  month: string;
  predicted_volume_tons: number;
  is_spike: boolean;
}

interface DemandResult {
  commodity: string;
  forecast_data: ForecastPoint[];
  average_volume_tons: number;
  recommendations: string[];
}
