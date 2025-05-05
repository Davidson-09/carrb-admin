'use client';
import { db } from '@/lib/firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import {
    UserGroupIcon,
    TruckIcon,
    CurrencyDollarIcon,
    ChartBarIcon,
    CheckBadgeIcon,
    ClipboardDocumentCheckIcon,
    CalendarDaysIcon,
    XCircleIcon,
} from '@heroicons/react/24/outline';



export default function RidesPage() {
    const { loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    const [rides, setRides] = useState<any[]>([]); // State to store fetched rides
    const [loader, setLoader] = useState<boolean>(true); // Loading state
    const [ridesMonth, setRidesMonth] = useState<number>(0); // State to store rides requested this month
    const stats = [
        {
            name: 'Total Rides',
            value: rides.length,
            change: '+12.5%',
            changeType: 'increase',
            icon: ClipboardDocumentCheckIcon,
        }, {
            name: 'Completed Rides',
            value: rides.filter(ride => ride.status === 'completed').length,
            change: '+6.7%',
            changeType: 'increase',
            icon: CheckBadgeIcon,
        },

        {
            name: 'Active Rides',
            value:
                rides.filter(ride => ride.status === 'pending').length,
            change: '+8.2%',
            changeType: 'increase',
            icon: TruckIcon,
        },

        {
            name: 'Cancled Rides',
            value: rides.filter(ride => ride.status === 'cancelled').length,
            change: '+2.4%',
            changeType: 'increase',
            icon: XCircleIcon,
        },
    ];
    useEffect(() => {
        // Fetch rides from Firestore
        const fetchRides = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "rides")); // Specify the collection name
                const ridesList = querySnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setRides(ridesList); // Set the state with the fetched rides
                setLoader(false); // Set loading to false once data is fetched


            } catch (error) {
                console.error("Error fetching rides: ", error);
            }
        };

        fetchRides(); // Call the fetch function when the component mounts
    }, []);


    return (
        <DashboardLayout>
            <div className="space-y-6">
                <h1 className="text-2xl font-semibold text-gray-900">Rides Overview</h1>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {stats.map((stat) => (
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
                                    className={`ml-2 flex items-baseline text-sm font-semibold ${stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                                        }`}
                                >
                                    {stat.change}
                                </p>
                            </dd>
                        </div>
                    ))}
                </div>

                {/* Recent Activity */}
                <div className="bg-white shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <h3 className="text-lg font-medium leading-6 text-gray-900">
                            Recent Activity
                        </h3>
                        <div className="mt-5">
                            <div className="flow-root">
                                <ul role="list" className="-mb-8">
                                    <div className='grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr] text-black bg-gray-100 font-bold text-sm my-4 py-2 px-4 rounded-lg'>

                                        <li>Driver</li>
                                        <li>Passenger</li>
                                        <li>Category</li>
                                        <li>Price</li>
                                        <li>Pick up Location</li>
                                        <li>Destination</li>
                                        <li>Payment method</li>
                                        <li>Status</li>
                                    </div>
                                    {rides.map((item, itemIdx) => (
                                        <li key={item}>
                                            <div className="relative pb-8">

                                                <div className="relative flex space-x-3">


                                                    <div className='grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr] w-full px-4'>

                                                        <div className='text-sm text-gray-500'>John Doe</div>
                                                        <div className='text-sm text-gray-500'>Jane Smith</div>
                                                        <div className='text-sm text-gray-500'>{item.ride_category.name}</div>
                                                        <div className='text-sm text-gray-500'>{item.price}</div>
                                                        <div className='text-sm text-gray-500' title={item.pickupLocation.description}>{item.pickupLocation.description.slice(0, 15)}</div>
                                                        <div className='text-sm text-gray-500' title={item.dropoffLocation.description}>{item.dropoffLocation.description.slice(0, 15)}</div>
                                                        <div className='text-sm text-gray-500'>{item.paymentMethod}</div>
                                                        <div className='text-sm text-gray-500'>{item.status}</div>
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