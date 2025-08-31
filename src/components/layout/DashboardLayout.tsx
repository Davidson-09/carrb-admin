'use client';

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { logout } from '@/store/slices/authSlice';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  HomeIcon,
  UserGroupIcon,
  TruckIcon,
  ChartBarIcon,
  CogIcon,
  UserCircleIcon,
  NewspaperIcon,
  BanknotesIcon,
  InformationCircleIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { auth } from '@/lib/firebase/config';
import { signOut } from 'firebase/auth';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';
import { group } from 'console';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Users', href: '/dashboard/users', icon: UserGroupIcon },
  { name: 'Rides', href: '/dashboard/rides', icon: TruckIcon },
  { name: 'Analytics', href: '/dashboard/analytics', icon: ChartBarIcon },
  // { name: 'Campaigns', href: '/dashboard/campaigns', icon: InformationCircleIcon },
  { name: 'News', href: '/dashboard/news', icon: NewspaperIcon },
  // { name: 'Transactions', href: '/dashboard/transactions', icon: CurrencyDollarIcon },
  { name: 'Withdrawal requests', href: '/dashboard/withdraw', icon: BanknotesIcon },
  { name: 'Settings', href: '/dashboard/settings', icon: CogIcon },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useSelector((state: RootState) => state.auth);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      dispatch(logout());
      Cookies.remove('auth_token');
      toast.success('Successfully logged out!');
      router.push('/auth/login');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg">
        <div className="flex h-16 items-center justify-center border-b">
          <h1 className="text-xl font-bold text-gray-800">Admin Dashboard</h1>
        </div>
        <nav className="mt-5 px-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${isActive
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
              >
                <item.icon
                  className={`mr-4 h-6 w-6 flex-shrink-0 ${isActive ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={handleLogout}
          className="rounded bg-red-600 px-3 py-2 w-[90%] mx-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 absolute bottom-8"
        >
          Logout
        </button>
      </div>

      {/* Main content */}
      <div className="pl-64">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="flex h-16 items-center justify-between px-4">
            <h2 className="text-lg font-medium text-gray-900">
              {navigation.find((item) => item.href === pathname)?.name || 'Dashboard'}
            </h2>
            <div className="flex items-center">
              <div>
                <Link href="/dashboard/profile" passHref>
                  <UserCircleIcon
                    height={'34px'}
                    className="text-black pr-1 cursor-pointer"
                  />
                </Link>
              </div>
              <span className="mr-4 text-sm text-gray-700">{user?.email}</span>

            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
} 