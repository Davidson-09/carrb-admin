// components/charts/DashboardCharts.tsx
"use client";

import React from 'react';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    ArcElement, // For Doughnut chart
    BarElement, // For Bar chart
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    ArcElement,
    BarElement,
    Title,
    Tooltip,
    Legend
);

interface ChartProps {
    data: any;
    options?: any;
}

export const DailyRidesChart: React.FC<ChartProps> = ({ data, options }) => {
    return (
        <div style={{ height: '300px' }}> {/* Add a fixed height for responsiveness */}
            <Line data={data} options={options} />
        </div>
    );
};

export const RideStatusDoughnutChart: React.FC<ChartProps> = ({ data, options }) => {
    return (
        <div style={{ height: '300px' }}> {/* Add a fixed height for responsiveness */}
            <Doughnut data={data} options={options} />
        </div>
    );
};

export const RevenueChart: React.FC<ChartProps> = ({ data, options }) => {
    return (
        <div style={{ height: '300px' }}> {/* Add a fixed height for responsiveness */}
            <Bar data={data} options={options} />
        </div>
    );
};

export const UserRegistrationChart: React.FC<ChartProps> = ({ data, options }) => {
    return (
        <div style={{ height: '300px' }}> {/* Add a fixed height for responsiveness */}
            <Line data={data} options={options} />
        </div>
    );
};