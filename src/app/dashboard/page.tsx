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
} from '@heroicons/react/24/outline';



export default function DashboardPage() {


  const { loading } = useAuth();
  const [rides, setRides] = useState<any[]>([]); // State to store fetched rides
  const [loader, setLoader] = useState<boolean>(true); // Loading state
  const [users, setUsers] = useState<any[]>([]); // State to store fetched users


  const stats = [
    {
      name: 'Total Users',
      value: users.length,
      change: '+12.5%',
      changeType: 'increase',
      icon: UserGroupIcon,
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
      name: 'Revenue',
      value: '$12,345',
      change: '+15.3%',
      changeType: 'increase',
      icon: CurrencyDollarIcon,
    },
    {
      name: 'Conversion Rate',
      value: '24.57%',
      change: '+2.4%',
      changeType: 'increase',
      icon: ChartBarIcon,
    },
  ];
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }
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
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard Overview</h1>

        {/* Stats Grid */}
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
                  {[1, 2, 3, 4, 5].map((item, itemIdx) => (
                    <li key={item}>
                      <div className="relative pb-8">
                        {itemIdx !== 4 ? (
                          <span
                            className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200"
                            aria-hidden="true"
                          />
                        ) : null}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center ring-8 ring-white">
                              <span className="text-white text-sm">✓</span>
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-sm text-gray-500">
                                New ride request from <span className="font-medium text-gray-900">John Doe</span>
                              </p>
                              <p className="text-sm text-gray-500">
                                From: 123 Main St, To: 456 Park Ave
                              </p>
                            </div>
                            <div className="text-right text-sm whitespace-nowrap text-gray-500">
                              <time dateTime="2024-01-01">3 minutes ago</time>
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