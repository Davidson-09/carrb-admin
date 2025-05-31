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
                const ridesList = ridesSnapshot.docs.map((doc) => ({
                    id: doc.id,
                    type: 'ride',
                    timestamp: doc.data().requestedAt?.toDate ? doc.data().requestedAt.toDate().getTime() : Date.now(),
                    ...doc.data(),
                }));
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


    // --- Calculate Dashboard Stats (Using filtered data) ---
    const totalRides = filteredRides.length;
    const completedRides = filteredRides.filter((ride) => ride.status === 'completed').length;
    const activeRides = filteredRides.filter((ride) => ride.status === 'pending').length;
    const cancelledRides = filteredRides.filter((ride) => ride.status === 'cancelled').length;
    const rideCompletionRate = totalRides === 0 ? 0 : (completedRides / totalRides) * 100;

    const totalRevenue = filteredTransactions.reduce((acc, txn) => acc + (txn.amount || 0), 0) / 100;

    const stats = [
        {
            name: 'Total Users',
            value: filteredUsers.length.toLocaleString(),
            change: '+12.5%',
            changeType: 'increase',
            icon: UserGroupIcon,
        },
        {
            name: 'Active Rides',
            value: activeRides.toLocaleString(),
            change: '+8.2%',
            changeType: 'increase',
            icon: TruckIcon,
        },
        {
            name: 'Total Revenue',
            value: `₦${totalRevenue.toLocaleString()}`,
            change: '+15.3%',
            changeType: 'increase',
            icon: CurrencyDollarIcon,
        },
        {
            name: 'Ride Completion Rate',
            value: `${rideCompletionRate.toFixed(2)}%`,
            change: '+2.4%',
            changeType: 'increase',
            icon: ChartBarIcon,
        },
    ];

    const recentActivities = useMemo(() =>
        [...filteredRides, ...filteredTransactions].sort((a, b) => b.timestamp - a.timestamp),
        [filteredRides, filteredTransactions]);

    // --- Chart Data Preparation (Now sensitive to granularity) ---
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
            legend: {
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
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                    <h1 className="text-2xl font-semibold text-gray-900 mb-4 sm:mb-0">Admin Analytics</h1>

                    <div className="flex items-center space-x-3 flex-wrap gap-2"> {/* Added flex-wrap and gap */}
                        {/* Granularity Selector */}
                        <div className="relative inline-block text-left">
                            <select
                                id="granularity"
                                name="granularity"
                                className="block w-full rounded-md border-black bg-white text-black py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                                value={granularity}
                                onChange={(e) => setGranularity(e.target.value as Granularity)}
                            >
                                <option value="day">Daily</option>
                                <option value="month">Monthly</option>
                                <option value="year">Annually</option>
                            </select>
                        </div>

                        {/* Start Date Picker Button */}
                        <div className="relative">
                            <button
                                onClick={() => { setIsFromPickerOpen(!isFromPickerOpen); setIsToPickerOpen(false); }} // Close other picker
                                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {from ? format(from, 'PPP') : 'Select Start Date'}
                            </button>
                            {isFromPickerOpen && (
                                <div className="absolute right-0 mt-2 z-10 bg-white border border-gray-300 rounded-md shadow-lg p-4">
                                    <DayPicker
                                        mode="single"
                                        selected={from}
                                        onSelect={(date) => {
                                            setFrom(date);
                                            setIsFromPickerOpen(false); // Close picker after selection
                                        }}
                                        // Ensure the 'to' date is not earlier than 'from' date
                                        toDate={to || new Date()} // Prevent selecting a start date after the current end date
                                    />
                                </div>
                            )}
                        </div>

                        {/* End Date Picker Button */}
                        <div className="relative">
                            <button
                                onClick={() => { setIsToPickerOpen(!isToPickerOpen); setIsFromPickerOpen(false); }} // Close other picker
                                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {to ? format(to, 'PPP') : 'Select End Date'}
                            </button>
                            {isToPickerOpen && (
                                <div className="absolute right-0 mt-2 z-10 bg-white border border-gray-300 rounded-md shadow-lg p-4">
                                    <DayPicker
                                        mode="single"
                                        selected={to}
                                        onSelect={(date) => {
                                            setTo(date);
                                            setIsToPickerOpen(false); // Close picker after selection
                                        }}
                                        // Ensure the 'from' date is not later than 'to' date
                                        fromDate={from || subDays(new Date(), 365 * 10)} // Prevent selecting an end date before the current start date (arbitrary past date)
                                    />
                                </div>
                            )}
                        </div>

                        {/* Reset Dates Button */}
                        {(from && to && (from.getTime() !== subDays(new Date(), 29).getTime() || to.getTime() !== new Date().getTime())) && ( // Only show reset if not default
                            <button
                                onClick={() => {
                                    setFrom(subDays(new Date(), 29));
                                    setTo(new Date());
                                    setIsFromPickerOpen(false);
                                    setIsToPickerOpen(false);
                                }}
                                className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                Reset Dates
                            </button>
                        )}
                    </div>
                </div>

                {/* Stats Grid - Remains the same, uses filtered data */}
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

                {/* Charts Section - Remains sensitive to granularity and filtered data */}
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