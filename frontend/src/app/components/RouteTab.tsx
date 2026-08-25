'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import LoadingSpinner from './LoadingSpinner';
import MetricCard from './MetricCard';

const RouteMap = dynamic(() => import('./RouteMap'), {
  ssr: false,
  loading: () => <LoadingSpinner text="Memuat Peta..." />,
});
