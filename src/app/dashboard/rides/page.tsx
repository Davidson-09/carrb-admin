'use client';
import { db } from '@/lib/firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import {
    TruckIcon,
    CheckBadgeIcon,
    XCircleIcon,
    ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';

export default function RidesPage() {
    const { loading } = useAuth();
    const [rides, setRides] = useState<any[]>([]);
    const [loader, setLoader] = useState<boolean>(true);

    const stats = [
        {
            name: 'Total Rides',
            value: rides.length,
            change: '+12.5%',
            changeType: 'increase',
            icon: ClipboardDocumentCheckIcon,
        },
        {
            name: 'Completed Rides',
            value: rides.filter(ride => ride.status === 'completed').length,
            change: '+6.7%',
            changeType: 'increase',
            icon: CheckBadgeIcon,
        },
        {
            name: 'Active Rides',
            value: rides.filter(ride => ride.status === 'pending').length,
            change: '+8.2%',
            changeType: 'increase',
            icon: TruckIcon,
        },
        {
            name: 'Cancelled Rides',
            value: rides.filter(ride => ride.status === 'cancelled').length,
            change: '+2.4%',
            changeType: 'increase',
            icon: XCircleIcon,
        },
    ];

    useEffect(() => {
        const fetchRides = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, 'rides'));
                const ridesList = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setRides(ridesList);
                setLoader(false);
            } catch (error) {
                console.error('Error fetching rides: ', error);
            }
        };

        fetchRides();
    }, []);

    if (loading || loader) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <h1 className="text-2xl font-semibold text-gray-900">Rides Overview</h1>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {stats.map(stat => (
                        <div
                            key={stat.name}
                            className="relative flex flex-col justify-center overflow-hidden rounded-lg bg-white px-4 pb-2 pt-5 shadow sm:px-6 sm:pt-6"
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
                                <p
                                    className={`ml-2 flex items-baseline text-sm font-semibold ${stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'}`}
                                >
                                    {stat.change}
                                </p>
                            </dd>
                        </div>
                    ))}
                </div>

                {/* Recent Activity Table */}
                <div className="bg-white shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <h3 className="text-lg font-medium leading-6 text-gray-900">Recent Activity</h3>

                        <div className="mt-5">
                            <div className="grid grid-cols-8 text-black bg-gray-100 font-bold text-sm my-4 py-2 px-4 rounded-lg">
                                <span>Driver</span>
                                <span>Passenger</span>
                                <span>Category</span>
                                <span>Price</span>
                                <span>Pickup</span>
                                <span>Dropoff</span>
                                <span>Payment</span>
                                <span>Status</span>
                            </div>

                            {rides.map((item) => (
                                <div
                                    key={item.id}
                                    className="grid grid-cols-8 text-sm text-gray-700 px-4 py-2 border-b mb-3"
                                >
                                    <span>{item.driverName || 'John Doe'}</span>
                                    <span>{item.passengerName || 'Jane Smith'}</span>
                                    <span>{item.ride_category?.name || 'N/A'}</span>
                                    <span>{item.price || 'N/A'}</span>
                                    <span title={item.pickupLocation?.description}>
                                        {item.pickupLocation?.description?.slice(0, 15) || 'N/A'}
                                    </span>
                                    <span title={item.dropoffLocation?.description}>
                                        {item.dropoffLocation?.description?.slice(0, 15) || 'N/A'}
                                    </span>
                                    <span>{item.paymentMethod || 'N/A'}</span>
                                    <span>{item.status || 'N/A'}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
