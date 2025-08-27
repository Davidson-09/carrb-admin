'use client';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import {
    RectangleStackIcon,
    XCircleIcon,
    XMarkIcon,
    CheckIcon,
    EllipsisHorizontalIcon,
} from '@heroicons/react/24/outline';
import { Ticks } from 'chart.js';

export default function RidesPage() {
    const { loading } = useAuth();

    const [requests, setRequestlist] = useState<any[]>([]);
    const [loader, setLoader] = useState<boolean>(true);
    const [popped, setPopped] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [userTypeFilter, setUserTypeFilter] = useState<'all' | 'driver' | 'rider'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'rejected' | 'pending'>('all');

    const stats = [
        {
            name: 'Total Transactions',
            value: requests.length,
            change: '+12.5%',
            changeType: 'increase',
            icon: RectangleStackIcon,
        },
        {
            name: 'Total Approved Transactions',
            value: requests.filter(request => request.status === 'approved').length,
            change: '+6.7%',
            changeType: 'increase',
            icon: CheckIcon,
        },
        {
            name: 'Total Failed Transactions',
            value: requests.filter(request => request.status === 'rejected').length,
            change: '+8.2%',
            changeType: 'increase',
            icon: XCircleIcon,
        },
        {
            name: 'Total Pending Requests',
            value: requests.filter(request => request.status === 'pending').length,
            change: '+2.4%',
            changeType: 'increase',
            icon: EllipsisHorizontalIcon,
        },
    ];

    useEffect(() => {
        const fetchRequest = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, 'transactions'));
                const requestList = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setRequestlist(requestList);
                setLoader(false);
            } catch (error) {
                console.error('Error fetching users: ', error);
            }
        };

        fetchRequest();
    }, []);

    // Add status filter to filteredUsers
    const filteredUsers = requests.filter(request => {
        const fullName = `${request.firstName} ${request.lastName}`.toLowerCase();
        const userId = request.id?.toLowerCase();
        const matchesSearch =
            fullName.includes(searchQuery.toLowerCase()) ||
            userId?.includes(searchQuery.toLowerCase());
        const matchesType =
            userTypeFilter === 'all' ? true : request.accountType === userTypeFilter;
        const matchesStatus =
            statusFilter === 'all' ? true : request.status === statusFilter;
        return matchesSearch && matchesType && matchesStatus;
    });

    // Approve/Reject handlers
    const handleStatusChange = async (id: string, newStatus: 'approved' | 'rejected') => {
        try {
            await updateDoc(doc(db, 'withdrawal_requests', id), { status: newStatus });
            setRequestlist(prev =>
                prev.map(req =>
                    req.id === id ? { ...req, status: newStatus } : req
                )
            );
        } catch (error) {
            console.error(`Error updating status for ${id}:`, error);
        }
    };

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
                <h1 className="text-2xl font-semibold text-gray-900">Withdrawal Requests</h1>

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
                    <div className="flex justify-center items-center h-[100%] w-full">
                        <div className="fixed border top-30 z-50 bg-white text-black h-[70%] w-[70%] p-6 rounded shadow overflow-y-scroll">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-semibold">User Details</h2>
                                <button
                                    onClick={() => {
                                        setPopped(false);
                                        setSelectedUser(null);
                                    }}
                                    className="ml-4 text-white bg-red-500 hover:bg-red-700 px-3 py-1 rounded"
                                >
                                    <XCircleIcon height={'25px'} />
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
                    </div>
                )}

                {/* Recent Activity */}
                <div className="bg-white shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <div className="flex justify-between mb-4">
                            <h3 className="text-lg font-medium leading-6 text-gray-900">Recent Activity</h3>
                            {/* Filter Controls - placed back at the top right of Recent Activity */}
                            <div className="flex gap-4">

                                <select
                                    value={statusFilter}
                                    onChange={e => setStatusFilter(e.target.value as 'all' | 'approved' | 'rejected' | 'pending')}
                                    className="border border-black text-black rounded-lg px-3 py-2 mr-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="all">All Statuses</option>
                                    <option value="pending">Pending</option>
                                    <option value="approved">Approved</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                            </div>
                        </div>

                        <ul role="list" className="space-y-2">
                            <li className="grid grid-cols-7 font-semibold bg-gray-100 py-2 px-4 text-black rounded-md">
                                <span className='col-span-2 '>User Id</span>
                                <span>Amount</span>
                                <span>Request Status</span>
                                <span>Date</span>
                                <span></span>
                            </li>
                            {filteredUsers.map((item) => (
                                <li
                                    key={item.id}
                                    className="grid grid-cols-7 text-sm text-gray-700 px-4 py-2 border-b hover:bg-gray-50 rounded-md"
                                >
                                    <span className='col-span-2 '>{item.userId}</span>
                                    <span>{item.amount}</span>
                                    <span>{item.status}</span>
                                    <span>{item.createdAt}</span>
                                    {item.status === 'pending' && (
                                        <>
                                            <button
                                                onClick={() => handleStatusChange(item.id, 'approved')}
                                                className="text-green-700 hover:bg-green-100 py-1 px-2 rounded flex items-center justify-center"
                                            >
                                                Approve <CheckIcon height={'20px'} />
                                            </button>
                                            <button
                                                onClick={() => handleStatusChange(item.id, 'rejected')}
                                                className="text-red-700 hover:bg-red-100 py-1 px-2 rounded flex items-center justify-center"
                                            >
                                                Reject <XMarkIcon height={'20px'} />
                                            </button>
                                        </>
                                    )}
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
            <p className="text-xs font-medium text-gray-500">{label}</p>
            <p className="text-sm text-gray-800">{value || '—'}</p>
        </div>
    );
}
