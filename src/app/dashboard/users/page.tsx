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
    UserCircleIcon,
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

    const [users, setUsers] = useState<any[]>([]); // State to store fetched users
    const [loader, setLoader] = useState<boolean>(true); // Loading state

    const [searchQuery, setSearchQuery] = useState(''); // State to store the search query

    const stats = [
        {
            name: 'Total users',
            value: users.length,
            change: '+12.5%',
            changeType: 'increase',
            icon: UserGroupIcon,
        }, {
            name: 'Total drivers',
            value: users.filter(user => user.accountType === 'driver').length,
            change: '+6.7%',
            changeType: 'increase',
            icon: TruckIcon,
        },

        {
            name: 'Active users',
            value:
                users.filter(user => user.accountStatus === 'active').length,
            change: '+8.2%',
            changeType: 'increase',
            icon: CheckBadgeIcon,
        },

        {
            name: 'Total passengers',
            value: users.filter(ride => ride.accountType === 'rider').length,
            change: '+2.4%',
            changeType: 'increase',
            icon: UserCircleIcon,
        },
    ];
    useEffect(() => {
        // Fetch users from Firestore
        const fetchUsers = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "users")); // Specify the collection name
                const usersList = querySnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setUsers(usersList); // Set the state with the fetched users
                setLoader(false); // Set loading to false once data is fetched


            } catch (error) {
                console.error("Error fetching users: ", error);
            }
        };

        fetchUsers(); // Call the fetch function when the component mounts
    }, []);

    // Filter users based on search query
    const filteredUsers = users.filter(user =>
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
    );


    return (
        <DashboardLayout>
            <div className="space-y-6">
                <h1 className="text-2xl font-semibold text-gray-900">Users Overview</h1>

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
                        <div className="flex justify-between">
                            <h3 className="text-lg font-medium leading-6 text-gray-900">
                                Recent Activity
                            </h3>
                            <form action="" className='w-[300px] h-10 border rounded-lg flex items-center justify-center px-3 text-black'>
                                <input
                                    type="search"
                                    className='h-full w-full outline-none'
                                    placeholder="Search users..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </form>
                        </div>
                        <div className="mt-5">
                            <div className="flow-root">
                                <ul role="list" className="-mb-8">
                                    <div className='grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr] text-black bg-gray-100 font-bold text-sm my-4 py-2 px-4 rounded-lg'>

                                        <li>First Name</li>
                                        <li>Last Name</li>
                                        <li>Account Type</li>
                                        <li>Phone Number</li>
                                        <li>Email</li>
                                        <li>Address</li>
                                        {/* <li>Payment method</li>
                                        <li>Status</li> */}
                                    </div>
                                    {filteredUsers.map((item) => ( // Removed itemIdx
                                        <li key={item.id}> {/* Changed key to item.id */}
                                            <div className="relative pb-8">

                                                <div className="relative flex space-x-3">
                                                    <div className='grid grid-cols-[1fr_1fr_100px_1fr_1fr_1fr] w-full px-4 text-left gap-9'>
                                                        <div className='text-sm text-gray-500 flex flex-col - items-start'>{item.firstName}</div>
                                                        <div className='text-sm text-gray-500 flex flex-col - items-start'>{item.lastName}</div>
                                                        <div className='text-sm text-gray-500 flex flex-col - items-start'>{item.accountType}</div>
                                                        <div className='text-sm text-gray-500 flex flex-col - items-start'>{item.phoneNumber.slice(0, 14)}</div>
                                                        <div className='text-sm text-gray-500 text-left' title={item.email}>{item.email}</div>
                                                        <div className='text-sm text-gray-500 flex flex-col - items-start' title={item.address}>{item.address}</div>
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

