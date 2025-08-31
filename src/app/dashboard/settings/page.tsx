'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState, ChangeEvent } from 'react';
import { db } from '@/lib/firebase/config'; // Ensure 'db' is imported from your Firebase config
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

// Define the interface for a ride category document
interface RideCategory {
    id: string; // Document ID from Firestore
    name: string;
    rate_per_kilometer: number;
    surge_charge_rate: number;
}

export default function SettingsPage() {
    const { user, loading: authLoading } = useAuth(); // Renamed loading to authLoading for clarity
    const [saving, setSaving] = useState(false);
    const [pageLoading, setPageLoading] = useState(true); // New state for data fetching loading
    const [error, setError] = useState<string | null>(null);

    // State for user profile data (existing logic)
    const [formData, setFormData] = useState({
        name: '',
        email: '',
    });

    // State for ride categories
    const [rideCategories, setRideCategories] = useState<RideCategory[]>([]);

    // Effect to load user profile data
    useEffect(() => {
        if (user) {
            setFormData({
                name: user?.displayName || '',
                email: user?.email || '',
            });
        }
    }, [user]);

    // Effect to fetch ride categories from Firestore
    useEffect(() => {
        const fetchRideCategories = async () => {
            try {
                setPageLoading(true);
                setError(null);
                const querySnapshot = await getDocs(collection(db, 'ride_categories'));
                const fetchedCategories: RideCategory[] = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    name: doc.data().name,
                    rate_per_kilometer: doc.data().rate_per_kilometer,
                    surge_charge_rate: doc.data().surge_charge_rate,
                }));
                setRideCategories(fetchedCategories);
            } catch (err) {
                console.error('Error fetching ride categories:', err);
                setError('Failed to fetch ride categories. Please try again.');
            } finally {
                setPageLoading(false);
            }
        };

        fetchRideCategories();
    }, []); // Empty dependency array to fetch once on mount

    // Handler for profile form changes (existing logic)
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    // Handler for ride category changes - now includes 'name'
    const handleCategoryChange = (
        id: string,
        field: keyof RideCategory, // Allow changing 'name', 'rate_per_kilometer', 'surge_charge_rate'
        value: string
    ) => {
        setRideCategories((prevCategories) =>
            prevCategories.map((category) =>
                category.id === id
                    ? {
                        ...category,
                        [field]:
                            field === 'name' ? value : parseFloat(value) || 0, // Convert to number only for rates
                    }
                    : category
            )
        );
    };

    // Handler for saving profile settings (existing logic - currently just an alert)
    const handleSaveProfile = async () => {
        setSaving(true);
        setError(null);
        try {
            // In a real app, you would update user profile in Firebase Auth or your database
            alert('Profile settings saved successfully!');
            // Example: await updateProfile(user, { displayName: formData.name });
        } catch (error) {
            console.error('Error saving profile settings:', error);
            setError('Failed to save profile settings.');
        } finally {
            setSaving(false);
        }
    };

    // Handler for saving a specific ride category - now includes 'name'
    const handleSaveCategory = async (category: RideCategory) => {
        setSaving(true);
        setError(null);
        try {
            const categoryRef = doc(db, 'ride_categories', category.id);
            await updateDoc(categoryRef, {
                name: category.name, // Included name in update payload
                rate_per_kilometer: category.rate_per_kilometer,
                surge_charge_rate: category.surge_charge_rate,
            });
            alert(`${category.name} prices updated successfully!`);
        } catch (err) {
            console.error(`Error saving ${category.name} category:`, err);
            setError(`Failed to save ${category.name} prices.`);
        } finally {
            setSaving(false);
        }
    };

    if (authLoading || pageLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6 max-w-4xl mx-auto">
                <h1 className="text-2xl font-semibold text-gray-900">Admin Settings</h1>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                        <strong className="font-bold">Error!</strong>
                        <span className="block sm:inline"> {error}</span>
                    </div>
                )}

                {/* Profile Settings */}
                <section className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Profile Info</h2>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-black focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                disabled
                                className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-black bg-gray-100"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end mt-6">
                        <button
                            onClick={handleSaveProfile}
                            disabled={saving}
                            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${saving ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                        >
                            {saving ? 'Saving Profile...' : 'Save Profile'}
                        </button>
                    </div>
                </section>

                <hr className="my-8 border-gray-200" />

                {/* Ride Category Pricing Settings */}
                <section className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Ride Category Pricing</h2>
                    <div className="space-y-6">
                        {rideCategories.length === 0 && !pageLoading && !error ? (
                            <p className="text-gray-600">No ride categories found in the database.</p>
                        ) : (
                            rideCategories.map((category) => (
                                <div key={category.id} className="border-b pb-4 last:border-b-0 last:pb-0">
                                    <div className="mb-3">
                                        <label htmlFor={`name-${category.id}`} className="block text-sm font-medium text-gray-700">Category Name</label>
                                        <input
                                            type="text"
                                            id={`name-${category.id}`}
                                            name="name"
                                            value={category.name}
                                            onChange={(e) =>
                                                handleCategoryChange(category.id, 'name', e.target.value)
                                            }
                                            className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-black focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor={`rate-${category.id}`} className="block text-sm font-medium text-gray-700">
                                                Rate Per Kilometer
                                            </label>
                                            <input
                                                type="number"
                                                id={`rate-${category.id}`}
                                                name="rate_per_kilometer"
                                                value={category.rate_per_kilometer}
                                                onChange={(e) =>
                                                    handleCategoryChange(category.id, 'rate_per_kilometer', e.target.value)
                                                }
                                                className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-black focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor={`surge-${category.id}`} className="block text-sm font-medium text-gray-700">
                                                Surge Charge Rate
                                            </label>
                                            <input
                                                type="number"
                                                id={`surge-${category.id}`}
                                                name="surge_charge_rate"
                                                value={category.surge_charge_rate}
                                                onChange={(e) =>
                                                    handleCategoryChange(category.id, 'surge_charge_rate', e.target.value)
                                                }
                                                className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-black focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end mt-4">
                                        <button
                                            onClick={() => handleSaveCategory(category)}
                                            disabled={saving}
                                            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${saving ? 'bg-green-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                                                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
                                        >
                                            {saving ? 'Saving...' : 'Save Category'}
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </div>
        </DashboardLayout>
    );
}
