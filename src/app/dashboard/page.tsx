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
  BanknotesIcon,
} from '@heroicons/react/24/outline';

export default function DashboardPage() {
  const { loading } = useAuth();
  const [rides, setRides] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loader, setLoader] = useState<boolean>(true);

  const totalRides = rides.length;
  const completedRides = rides.filter((ride) => ride.status === 'completed').length;
  const activeRides = rides.filter((ride) => ride.status === 'pending').length;
  const rideCompletionRate = totalRides === 0 ? 0 : (completedRides / totalRides) * 100;

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
      value: activeRides,
      change: '+8.2%',
      changeType: 'increase',
      icon: TruckIcon,
    },
    {
      name: 'Revenue',
      value: '₦' + transactions.reduce((acc, txn) => acc + (txn.amount || 0), 0).toLocaleString(),
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

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const usersList = querySnapshot.docs.map((doc) => ({
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

  useEffect(() => {
    const fetchRides = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'rides'));
        const ridesList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          type: 'ride',
          timestamp: doc.data().requestedAt || Date.now(),
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

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'transactions'));
        const transactionsList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          type: 'transaction',
          timestamp: new Date(doc.data().paidAt || doc.data().paid_at || doc.data().createdAt).getTime(),
          ...doc.data(),
        }));
        setTransactions(transactionsList);
      } catch (error) {
        console.error('Error fetching transactions: ', error);
      }
    };
    fetchTransactions();
  }, []);

  const recentActivities = [...rides, ...transactions].sort((a, b) => b.timestamp - a.timestamp);

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
                <p className={`ml-2 flex items-baseline text-sm font-semibold ${stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
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
                                  from <span className="font-medium">{activity.pickupLocation?.description}</span>{' '}
                                  to <span className="font-medium">{activity.dropoffLocation?.description}</span>{' '}
                                  by <span className="font-medium">{activity.passengerId}</span>
                                </p>
                              ) : (
                                <p className="text-sm text-gray-500">
                                  Transaction of <span className="font-medium text-gray-900">₦{(activity.amount / 100).toLocaleString()}</span>{' '}
                                  by <span className="font-medium">{activity.customer?.email || activity.userId}</span>
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
