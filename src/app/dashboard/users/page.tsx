'use client';
import { db } from '@/lib/firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import {
    UserGroupIcon,
    TruckIcon,
    CheckBadgeIcon,
    UserCircleIcon,
} from '@heroicons/react/24/outline';

export default function RidesPage() {
    const { loading } = useAuth();

    const [users, setUsers] = useState<any[]>([]);
    const [loader, setLoader] = useState<boolean>(true);
    const [popped, setPopped] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState<any>(null);

    const stats = [
        {
            name: 'Total users',
            value: users.length,
            change: '+12.5%',
            changeType: 'increase',
            icon: UserGroupIcon,
        },
        {
            name: 'Total drivers',
            value: users.filter(user => user.accountType === 'driver').length,
            change: '+6.7%',
            changeType: 'increase',
            icon: TruckIcon,
        },
        {
            name: 'Active users',
            value: users.filter(user => user.accountStatus === 'active').length,
            change: '+8.2%',
            changeType: 'increase',
            icon: CheckBadgeIcon,
        },
        {
            name: 'Total passengers',
            value: users.filter(user => user.accountType === 'rider').length,
            change: '+2.4%',
            changeType: 'increase',
            icon: UserCircleIcon,
        },
    ];

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, 'users'));
                const usersList = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setUsers(usersList);
                setLoader(false);
            } catch (error) {
                console.error('Error fetching users: ', error);
            }
        };

        fetchUsers();
    }, []);

    const filteredUsers = users.filter(user =>
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                                    className={`ml-2 flex items-baseline text-sm font-semibold ${stat.changeType === 'increase'
                                        ? 'text-green-600'
                                        : 'text-red-600'
                                        }`}
                                >
                                    {stat.change}
                                </p>
                            </dd>
                        </div>
                    ))}
                </div>

                {/* Popup with user details */}
                {popped && selectedUser && (
                    <div className="fixed border top-10 right-10 z-50 bg-white text-black h-[90%] w-[80%] p-6 rounded shadow overflow-y-scroll">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-semibold">User Details</h2>
                            <button
                                onClick={() => {
                                    setPopped(false);
                                    setSelectedUser(null);
                                }}
                                className="ml-4 text-white bg-red-500 hover:bg-red-700 px-3 py-1 rounded"
                            >
                                Close
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Detail label="Full Name" value={`${selectedUser.firstName} ${selectedUser.lastName}`} />
                            <Detail label="Email" value={selectedUser.email} />
                            <Detail label="Phone Number" value={selectedUser.phoneNumber} />
                            <Detail label="Account Type" value={selectedUser.accountType} />
                            <Detail label="Account Status" value={selectedUser.accountStatus} />
                            <Detail label="Address" value={selectedUser.address} />
                            <Detail label="City" value={selectedUser.city} />
                            <Detail label="Language" value={selectedUser.language} />
                            <Detail label="Referral Code" value={selectedUser.referralCode} />
                            <Detail label="Driver License" value={selectedUser.driverLicense} />
                            <Detail label="License Plate" value={selectedUser.licensePlate} />
                            <Detail label="National ID" value={selectedUser.nationalId} />
                            <Detail label="Vehicle Manufacturer" value={selectedUser.vehicleManufacturer} />
                            <Detail label="Vehicle Color" value={selectedUser.vehicleColor} />
                            <Detail label="Score" value={selectedUser.score} />
                            <Detail label="Bank Name" value={selectedUser.paymentInfo?.bankName} />
                            <Detail label="Account Number" value={selectedUser.paymentInfo?.accountNumber} />
                            <Detail label="Name on Account" value={selectedUser.paymentInfo?.nameOnAccount} />
                        </div>
                    </div>
                )}

                {/* Recent Activity */}
                <div className="bg-white shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <div className="flex justify-between mb-4">
                            <h3 className="text-lg font-medium leading-6 text-gray-900">Recent Activity</h3>
                            <input
                                type="search"
                                placeholder="Search users..."
                                className="border rounded-lg px-3 py-2 w-72"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <ul role="list" className="space-y-2">
                            <li className="grid grid-cols-7 font-semibold bg-gray-100 py-2 px-4 text-black rounded-md">
                                <span>First Name</span>
                                <span>Last Name</span>
                                <span>Account Type</span>
                                <span>Phone Number</span>
                                <span>Email</span>
                                <span>Address</span>
                                <span></span>
                            </li>

                            {filteredUsers.map((item) => (
                                <li
                                    key={item.id}
                                    className="grid grid-cols-7 text-sm text-gray-700 px-4 py-2 border-b"
                                >
                                    <span>{item.firstName}</span>
                                    <span>{item.lastName}</span>
                                    <span>{item.accountType}</span>
                                    <span>{item.phoneNumber?.slice(0, 14)}</span>
                                    <span className="truncate" title={item.email}>{item.email}</span>
                                    <span className="truncate" title={item.address}>{item.address}</span>
                                    <button
                                        onClick={() => {
                                            setSelectedUser(item);
                                            setPopped(true);
                                        }}
                                        className="text-blue-500 hover:bg-blue-100 py-1 px-2 rounded"
                                    >
                                        Details
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

// Helper component to render a labeled field
function Detail({ label, value }: { label: string; value: any }) {
    return (
        <div>
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <p className="text-lg text-gray-800">{value || '—'}</p>
        </div>
    );
}
