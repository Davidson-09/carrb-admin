// app/dashboard/page.tsx
'use client';

import { db } from '@/lib/firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState, useMemo, useCallback } from 'react';
import {
    UserGroupIcon,
    TruckIcon,
    CurrencyDollarIcon,
    ChartBarIcon,
} from '@heroicons/react/24/outline';
import dynamic from 'next/dynamic';

// Date picker imports
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, eachDayOfInterval, eachMonthOfInterval, eachYearOfInterval } from 'date-fns';
import { DayPicker } from 'react-day-picker'; // Removed DateRange from import as we'll manage from/to separately
import 'react-day-picker/dist/style.css'; // Make sure to import the CSS

// Dynamically import chart components
const DynamicDailyRidesChart = dynamic(() =>
    import('@/components/charts/DashboardCharts').then((mod) => mod.DailyRidesChart),
    { ssr: false }
);
const DynamicRideStatusDoughnutChart = dynamic(() =>
    import('@/components/charts/DashboardCharts').then((mod) => mod.RideStatusDoughnutChart),
    { ssr: false }
);
const DynamicRevenueChart = dynamic(() =>
    import('@/components/charts/DashboardCharts').then((mod) => mod.RevenueChart),
    { ssr: false }
);
const DynamicUserRegistrationChart = dynamic(() =>
    import('@/components/charts/DashboardCharts').then((mod) => mod.UserRegistrationChart),
    { ssr: false }
);

// Define granularity types
type Granularity = 'day' | 'month' | 'year';

export default function DashboardPage() {
    const { loading: authLoading } = useAuth();
    const [rides, setRides] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [dataLoading, setDataLoading] = useState<boolean>(true);

    // --- Date Picker State (Separate from and to) ---
    const [from, setFrom] = useState<Date | undefined>(subDays(new Date(), 29)); // Default to last 30 days
    const [to, setTo] = useState<Date | undefined>(new Date());
    const [isFromPickerOpen, setIsFromPickerOpen] = useState(false);
    const [isToPickerOpen, setIsToPickerOpen] = useState(false);

    // --- Granularity State ---
    const [granularity, setGranularity] = useState<Granularity>('day'); // 'day', 'month', 'year'

    // Data Fetching (remains largely the same, fetching all data)
    useEffect(() => {
        const fetchData = async () => {
            setDataLoading(true);
            try {
                const [usersSnapshot, ridesSnapshot, transactionsSnapshot] = await Promise.all([
                    getDocs(collection(db, 'users')),
                    getDocs(collection(db, 'rides')),
                    getDocs(collection(db, 'transactions')),
                ]);

                const usersList = usersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

                // FIX: Ensure ride timestamp is always a valid number (milliseconds)
                const ridesList = ridesSnapshot.docs.map((doc) => {
                    const data = doc.data();
                    let timestamp = Date.now();
                    if (data.requestedAt?.toDate) {
                        timestamp = data.requestedAt.toDate().getTime();
                    } else if (data.requestedAt instanceof Date) {
                        timestamp = data.requestedAt.getTime();
                    } else if (typeof data.requestedAt === 'number') {
                        timestamp = data.requestedAt;
                    } else if (typeof data.requestedAt === 'string') {
                        const parsed = Date.parse(data.requestedAt);
                        timestamp = isNaN(parsed) ? Date.now() : parsed;
                    }
                    return {
                        id: doc.id,
                        type: 'ride',
                        timestamp,
                        ...data,
                    };
                });

                const transactionsList = transactionsSnapshot.docs.map((doc) => ({
                    id: doc.id,
                    type: 'transaction',
                    timestamp: doc.data().paidAt?.toDate ? doc.data().paidAt.toDate().getTime() :
                        doc.data().paid_at?.toDate ? doc.data().paid_at.toDate().getTime() :
                            doc.data().createdAt?.toDate ? doc.data().createdAt.toDate().getTime() :
                                Date.now(),
                    ...doc.data(),
                }));

                setUsers(usersList);
                setRides(ridesList);
                setTransactions(transactionsList);
            } catch (error) {
                console.error('Error fetching dashboard data: ', error);
            } finally {
                setDataLoading(false);
            }
        };
        fetchData();
    }, []);

    // --- Filtered Data based on Date Range (now using 'from' and 'to' states) ---
    const getFilteredData = useCallback((data: any[], dateField: string = 'timestamp') => {
        if (!from || !to) return data;
        const fromTs = startOfDay(from).getTime();
        const toTs = endOfDay(to).getTime();

        return data.filter(item => {
            let itemTimestamp;
            if (dateField === 'createdAt' && item.createdAt) {
                itemTimestamp = item.createdAt.toDate ? item.createdAt.toDate().getTime() : new Date(item.createdAt).getTime();
            } else if (dateField === 'transactionTimestamp') {
                itemTimestamp = item.paidAt?.toDate ? item.paidAt.toDate().getTime() :
                    item.paid_at?.toDate ? item.paid_at.toDate().getTime() :
                        item.createdAt?.toDate ? item.createdAt.toDate().getTime() :
                            item.timestamp;
            } else {
                itemTimestamp = item.timestamp;
            }

            return itemTimestamp >= fromTs && itemTimestamp <= toTs;
        });
    }, [from, to]); // Dependencies now include 'from' and 'to'

    const filteredRides = useMemo(() => getFilteredData(rides, 'timestamp'), [rides, getFilteredData]);
    const filteredTransactions = useMemo(() => getFilteredData(transactions, 'transactionTimestamp'), [transactions, getFilteredData]);
    const filteredUsers = useMemo(() => getFilteredData(users, 'createdAt'), [users, getFilteredData]);


    // --- Calculate Dashboard Stats (NOT filtered, always global) ---
    const globalTotalUsers = users.length;
    const globalActiveRides = rides.filter((ride) => ride.status === 'pending').length;
    const globalCompletedRides = rides.filter((ride) => ride.status === 'completed').length;
    const globalCancelledRides = rides.filter((ride) => ride.status === 'cancelled').length;
    const globalTotalRides = rides.length;
    const globalRideCompletionRate = globalTotalRides === 0 ? 0 : (globalCompletedRides / globalTotalRides) * 100;
    const globalTotalRevenue = transactions.reduce((acc, txn) => acc + (txn.amount || 0), 0) / 100;

    // --- Calculate Filtered Ride Completion Rate (for chart section) ---
    const filteredRideCompletionRate = filteredRides.length === 0
        ? 0
        : (filteredRides.filter((ride) => ride.status === 'completed').length / filteredRides.length) * 100;

    // --- Stats Grid (top of page, always global) ---
    const stats = [
        {
            name: 'Total Users',
            value: globalTotalUsers.toLocaleString(),
            change: '+12.5%',
            changeType: 'increase',
            icon: UserGroupIcon,
        },
        {
            name: 'Active Rides',
            value: globalActiveRides.toLocaleString(),
            change: '+8.2%',
            changeType: 'increase',
            icon: TruckIcon,
        },
        {
            name: 'Total Revenue',
            value: `₦${globalTotalRevenue.toLocaleString()}`,
            change: '+15.3%',
            changeType: 'increase',
            icon: CurrencyDollarIcon,
        },
        {
            name: 'Ride Completion Rate',
            value: `${globalRideCompletionRate.toFixed(2)}%`,
            change: '+2.4%',
            changeType: 'increase',
            icon: ChartBarIcon,
        },
    ];

    const recentActivities = useMemo(() =>
        [...filteredRides, ...filteredTransactions].sort((a, b) => b.timestamp - a.timestamp),
        [filteredRides, filteredTransactions]);

    // --- Chart Data Preparation (Now sensitive to granularity) ---
    const completedRides = filteredRides.filter(r => r.status === 'completed').length;
    const activeRides = filteredRides.filter(r => r.status === 'pending').length;
    const cancelledRides = filteredRides.filter(r => r.status === 'cancelled').length;

    const rideStatusData = useMemo(() => ({
        labels: ['Completed', 'Pending', 'Cancelled'],
        datasets: [
            {
                data: [completedRides, activeRides, cancelledRides],
                backgroundColor: ['#4ade80', '#60a5fa', '#ef4444'],
                hoverOffset: 4,
            },
        ],
    }), [completedRides, activeRides, cancelledRides]);

    const rideStatusOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend:
            {
                position: 'top' as const,
            },
            title: {
                display: true,
                text: 'Ride Status Distribution',
            },
        },
    };

    const { dailyRidesData, revenueData, userRegistrationData } = useMemo(() => {
        const ridesAggregated: { [key: string]: number } = {};
        const revenueAggregated: { [key: string]: number } = {};
        const usersAggregated: { [key: string]: number } = {};

        const getFormattedDateKey = (timestamp: number, granularity: Granularity) => {
            const date = new Date(timestamp);
            switch (granularity) {
                case 'day':
                    return format(date, 'yyyy-MM-dd');
                case 'month':
                    return format(date, 'yyyy-MM');
                case 'year':
                    return format(date, 'yyyy');
                default:
                    return format(date, 'yyyy-MM-dd');
            }
        };

        filteredRides.forEach(ride => {
            const key = getFormattedDateKey(ride.timestamp, granularity);
            ridesAggregated[key] = (ridesAggregated[key] || 0) + 1;
        });

        filteredTransactions.forEach(txn => {
            const key = getFormattedDateKey(txn.timestamp, granularity);
            revenueAggregated[key] = (revenueAggregated[key] || 0) + (txn.amount || 0) / 100;
        });

        filteredUsers.forEach(user => {
            const createdAtTimestamp = user.createdAt?.toDate ? user.createdAt.toDate().getTime() : new Date(user.createdAt).getTime();
            const key = getFormattedDateKey(createdAtTimestamp, granularity);
            usersAggregated[key] = (usersAggregated[key] || 0) + 1;
        });

        let labels: string[] = [];
        if (from && to) {
            let currentStartDate = from;
            let currentEndDate = to;

            if (granularity === 'day') {
                labels = eachDayOfInterval({ start: startOfDay(currentStartDate), end: endOfDay(currentEndDate) }).map(d => format(d, 'yyyy-MM-dd'));
            } else if (granularity === 'month') {
                labels = eachMonthOfInterval({ start: startOfMonth(currentStartDate), end: endOfMonth(currentEndDate) }).map(d => format(d, 'yyyy-MM'));
            } else if (granularity === 'year') {
                labels = eachYearOfInterval({ start: startOfYear(currentStartDate), end: endOfYear(currentEndDate) }).map(d => format(d, 'yyyy'));
            }
        } else {
            const allKeys = Array.from(new Set([
                ...Object.keys(ridesAggregated),
                ...Object.keys(revenueAggregated),
                ...Object.keys(usersAggregated)
            ])).sort();
            labels = allKeys;
        }

        const dailyRidesDataset = labels.map(key => ridesAggregated[key] || 0);
        const revenueDataset = labels.map(key => revenueAggregated[key] || 0);
        const userRegistrationDataset = labels.map(key => usersAggregated[key] || 0);

        return {
            dailyRidesData: {
                labels: labels.map(key => {
                    if (granularity === 'day') return format(new Date(key), 'MMM d');
                    if (granularity === 'month') return format(new Date(key + '-01'), 'MMM yyyy');
                    if (granularity === 'year') return key;
                    return key;
                }),
                datasets: [
                    {
                        label: `Total Rides (${granularity})`,
                        data: dailyRidesDataset,
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.5)',
                        tension: 0.4,
                        fill: true,
                    },
                ],
            },
            revenueData: {
                labels: labels.map(key => {
                    if (granularity === 'day') return format(new Date(key), 'MMM d');
                    if (granularity === 'month') return format(new Date(key + '-01'), 'MMM yyyy');
                    if (granularity === 'year') return key;
                    return key;
                }),
                datasets: [
                    {
                        label: `Revenue (₦) (${granularity})`,
                        data: revenueDataset,
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.5)',
                        tension: 0.4,
                        fill: true,
                    },
                ],
            },
            userRegistrationData: {
                labels: labels.map(key => {
                    if (granularity === 'day') return format(new Date(key), 'MMM d');
                    if (granularity === 'month') return format(new Date(key + '-01'), 'MMM yyyy');
                    if (granularity === 'year') return key;
                    return key;
                }),
                datasets: [
                    {
                        label: `New Users (${granularity})`,
                        data: userRegistrationDataset,
                        borderColor: 'rgb(102, 51, 153)',
                        backgroundColor: 'rgba(102, 51, 153, 0.5)',
                        tension: 0.4,
                        fill: true,
                    },
                ],
            },
        };
    }, [filteredRides, filteredTransactions, filteredUsers, granularity, from, to]); // Added from, to to dependencies

    const chartCommonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
            },
            title: {
                display: true,
            },
        },
        scales: {
            y: {
                beginAtZero: true,
            }
        }
    };


    if (authLoading || dataLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Stats Grid - Always global */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {stats.map((stat) => (
                        <div
                            key={stat.name}
                            className="relative overflow-hidden rounded-lg bg-white px-4 pb-2 pt-5 shadow sm:px-6 sm:pt-6"
                        >
                            <dt>
                                <div className="absolute rounded-md bg-indigo-500 p-3">
                                    <stat.icon className="h-6 w-6 text-white" aria-hidden="true" />
                                </div>
                                <p className="ml-16 truncate text-sm font-medium text-gray-500">
                                    {stat.name}
                                </p>
                            </dt>
                            <dd className="ml-16 flex items-baseline pb-6 sm:pb-7">
                                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                                <p className={`ml-2 flex items-baseline text-sm font-semibold ${stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
                                    {stat.change}
                                </p>
                            </dd>
                        </div>
                    ))}
                </div>

                {/* --- Date Range & Granularity Filters --- */}
                <div className="flex flex-wrap gap-4  mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                        <button
                            className="hover:border shadow text-black px-3 py-2 rounded bg-white"
                            onClick={() => setIsFromPickerOpen((v) => !v)}
                        >
                            {from ? format(from, 'yyyy-MM-dd') : 'Select'}
                        </button>
                        {isFromPickerOpen && (
                            <div className="absolute text-black p-3 z-10 bg-white shadow-lg rounded mt-2">
                                <DayPicker
                                    mode="single"
                                    selected={from}
                                    onSelect={(date) => {
                                        setFrom(date || undefined);
                                        setIsFromPickerOpen(false);
                                    }}
                                />
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                        <button
                            className="hover:border shadow text-black  px-3 py-2 rounded bg-white"
                            onClick={() => setIsToPickerOpen((v) => !v)}
                        >
                            {to ? format(to, 'yyyy-MM-dd') : 'Select'}
                        </button>
                        {isToPickerOpen && (
                            <div className="absolute text-black p-3 z-10 bg-white shadow-lg rounded mt-2">
                                <DayPicker
                                    mode="single"
                                    selected={to}
                                    onSelect={(date) => {
                                        setTo(date || undefined);
                                        setIsToPickerOpen(false);
                                    }}
                                />
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Granularity</label>
                        <select
                            value={granularity}
                            onChange={e => setGranularity(e.target.value as Granularity)}
                            className="border shadow text-black px-3 py-2 rounded bg-white"
                        >
                            <option value="day">Daily</option>
                            <option value="month">Monthly</option>
                            <option value="year">Yearly</option>
                        </select>
                    </div>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Daily Rides Chart */}
                    <div className="bg-white shadow rounded-lg p-4">
                        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                            Rides Trend
                        </h3>
                        <DynamicDailyRidesChart
                            data={dailyRidesData}
                            options={{ ...chartCommonOptions, plugins: { ...chartCommonOptions.plugins, title: { ...chartCommonOptions.plugins.title, text: `Rides Trend (${granularity.charAt(0).toUpperCase() + granularity.slice(1)}ly)` } } }}
                        />
                    </div>

                    {/* Ride Status Doughnut Chart */}
                    <div className="bg-white shadow rounded-lg p-4">
                        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                            Ride Status Distribution
                        </h3>
                        <DynamicRideStatusDoughnutChart data={rideStatusData} options={rideStatusOptions} />
                        {/* Filtered Ride Completion Rate */}
                        <div className="mt-6">
                            <div className="bg-gray-50 rounded-lg px-4 py-3 flex items-center">
                                <ChartBarIcon className="h-6 w-6 text-indigo-500 mr-2" />
                                <span className="text-lg font-semibold text-gray-900">
                                    Ride Completion Rate (Filtered): {filteredRideCompletionRate.toFixed(2)}%
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Revenue Over Time Chart */}
                    <div className="bg-white shadow rounded-lg p-4 lg:col-span-2">
                        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                            Revenue Trend
                        </h3>
                        <DynamicRevenueChart
                            data={revenueData}
                            options={{ ...chartCommonOptions, plugins: { ...chartCommonOptions.plugins, title: { ...chartCommonOptions.plugins.title, text: `Revenue Trend (${granularity.charAt(0).toUpperCase() + granularity.slice(1)}ly)` } } }}
                        />
                    </div>

                    {/* User Registration Chart */}
                    <div className="bg-white shadow rounded-lg p-4 lg:col-span-2">
                        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                            User Registration Trend
                        </h3>
                        <DynamicUserRegistrationChart
                            data={userRegistrationData}
                            options={{ ...chartCommonOptions, plugins: { ...chartCommonOptions.plugins, title: { ...chartCommonOptions.plugins.title, text: `User Registration Trend (${granularity.charAt(0).toUpperCase() + granularity.slice(1)}ly)` } } }}
                        />
                    </div>
                </div>

                {/* Recent Activity - Remains the same, uses filtered data */}
                <div className="bg-white shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <h3 className="text-lg font-medium leading-6 text-gray-900">
                            Recent Activity
                        </h3>
                        <div className="mt-5">
                            <div className="flow-root">
                                <ul role="list" className="-mb-8 pr-3 overflow-y-auto max-h-96">
                                    {recentActivities.map((activity, idx, arr) => (
                                        <li key={activity.id}>
                                            <div className="relative pb-8">
                                                {idx !== arr.length - 1 && (
                                                    <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                                                )}
                                                <div className="relative flex space-x-3">
                                                    <div>
                                                        <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${activity.type === 'ride'
                                                            ? activity.status === 'completed'
                                                                ? 'bg-green-500'
                                                                : activity.status === 'cancelled'
                                                                    ? 'bg-red-500'
                                                                    : 'bg-indigo-500'
                                                            : 'bg-yellow-500'
                                                            }`}>
                                                            <span className="text-white text-sm">
                                                                {activity.type === 'ride'
                                                                    ? activity.status === 'completed'
                                                                        ? '✓'
                                                                        : activity.status === 'cancelled'
                                                                            ? '✕'
                                                                            : '•'
                                                                    : '₦'}
                                                            </span>
                                                        </span>
                                                    </div>
                                                    <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                                        <div>
                                                            {activity.type === 'ride' ? (
                                                                <p className="text-sm text-gray-500">
                                                                    Ride <span className="font-medium text-gray-900">{activity.status}</span>{' '}
                                                                    from <span className="font-medium">{activity.pickupLocation?.description || 'N/A'}</span>{' '}
                                                                    to <span className="font-medium">{activity.dropoffLocation?.description || 'N/A'}</span>{' '}
                                                                    by <span className="font-medium">{activity.passengerId || 'N/A'}</span>{' '} <br />
                                                                    <span className='font-semibold text-black'>Driver is</span> <span className="font-medium">{activity.driverId || 'N/A'}</span>
                                                                </p>
                                                            ) : (
                                                                <p className="text-sm text-gray-500">
                                                                    Transaction of <span className="font-medium text-gray-900">₦{(activity.amount / 100).toLocaleString()}</span>{' '}
                                                                    by <span className="font-medium">{activity.customer?.email || activity.userId || 'N/A'}</span>
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                                            <time dateTime={new Date(activity.timestamp).toISOString()}>
                                                                {new Date(activity.timestamp).toLocaleDateString()} - {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </time>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}