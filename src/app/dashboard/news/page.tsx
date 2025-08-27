'use client';

import { db, storage } from '@/lib/firebase/config';
import {
    collection,
    getDocs,
    updateDoc,
    doc,
    addDoc,
    deleteDoc,
    // orderBy, // Not directly used in the current getDocs and sorting is frontend
    // query, // Not directly used in the current getDocs and sorting is frontend
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState, ChangeEvent, FormEvent } from 'react';
import {
    RectangleStackIcon,
    XCircleIcon,
    XMarkIcon,
    CheckIcon,
    EllipsisHorizontalIcon,
} from '@heroicons/react/24/outline';

// Helper component to render a labeled field
function Detail({ label, value }: { label: string; value: any }) {
    return (
        <div>
            <p className="text-xs font-medium text-gray-500">{label}</p>
            <p className="text-sm text-gray-800">{value || '—'}</p>
        </div>
    );
}

// News Article Type - Reintroducing video-related properties and adding social links
interface NewsArticle {
    id: string;
    headline: string;
    article: string;
    mediaURL: string;
    mediaType: 'image' | 'video' | '';
    videoLink?: string;
    instagramLink?: string; // Added
    twitterLink?: string; // Added
    linkedinLink?: string; // Added
    timestamp: any; // Last updated timestamp
    createdAt: any; // Original creation timestamp
}

export default function NewsPage() {
    const { loading } = useAuth();

    const [loader, setLoader] = useState<boolean>(true);

    // State for the News Uploader form
    const [headline, setHeadline] = useState('');
    const [article, setArticle] = useState('');
    const [videoLink, setVideoLink] = useState('');
    const [instagramLink, setInstagramLink] = useState(''); // Reintroduced
    const [twitterLink, setTwitterLink] = useState(''); // Reintroduced
    const [linkedinLink, setLinkedinLink] = useState(''); // Reintroduced
    const [file, setFile] = useState<File | null>(null); // For image/video file
    const [uploading, setUploading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [newsList, setNewsList] = useState<NewsArticle[]>([]);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [currentNewsId, setCurrentNewsId] = useState<string | null>(null);

    const stats = [
        {
            name: 'Total News Articles',
            value: newsList.length,
            change: '+12.5%',
            changeType: 'increase',
            icon: RectangleStackIcon,
        },
        {
            name: 'Articles with Media',
            value: newsList.filter(article => article.mediaURL).length,
            change: '+6.7%',
            changeType: 'increase',
            icon: CheckIcon,
        },
        {
            name: 'Articles without Media',
            value: newsList.filter(article => !article.mediaURL).length,
            change: '+8.2%',
            changeType: 'increase',
            icon: XCircleIcon,
        },
        {
            name: 'Total Article Words',
            value: newsList.reduce((total, article) => total + article.article.split(' ').length, 0),
            change: '+2.4%',
            changeType: 'increase',
            icon: EllipsisHorizontalIcon,
        },
    ];

    // Fetch news articles on component mount
    useEffect(() => {
        const fetchNews = async () => {
            try {
                const newsCollectionRef = collection(db, 'news');
                const querySnapshot = await getDocs(newsCollectionRef);

                const articles = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        headline: data.headline,
                        article: data.article,
                        mediaURL: data.mediaURL || '',
                        videoLink: data.videoLink || '',
                        instagramLink: data.instagramLink || '', // Mapped
                        twitterLink: data.twitterLink || '',     // Mapped
                        linkedinLink: data.linkedinLink || '',   // Mapped
                        mediaType: data.mediaType || '',
                        timestamp: data.timestamp,
                        createdAt: data.createdAt,
                    };
                }) as NewsArticle[];

                // Sort the articles in the frontend by createdAt or timestamp, descending
                articles.sort((a, b) => {
                    const dateA = (a.createdAt || a.timestamp).toDate();
                    const dateB = (b.createdAt || b.timestamp).toDate();
                    return dateB.getTime() - dateA.getTime();
                });

                setNewsList(articles);
                setLoader(false);
            } catch (error) {
                console.error('Error fetching news articles:', error);
                setError('Failed to load news articles.');
                setLoader(false);
            }
        };

        fetchNews();
    }, []); // Empty dependency array means this runs once on mount

    // News Uploader & Editor Functions
    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            // Allow both image and video files
            const selectedFile = e.target.files[0];
            if (!selectedFile.type.startsWith('image/') && !selectedFile.type.startsWith('video/')) {
                setError('Please upload a thumbnail image.');
                setFile(null);
                return;
            }
            setFile(selectedFile);
            setError(''); // Clear error if a valid file is selected
        }
    };

    const resetForm = () => {
        setHeadline('');
        setArticle('');
        setVideoLink('');
        setInstagramLink(''); // Reset
        setTwitterLink(''); // Reset
        setLinkedinLink(''); // Reset
        setFile(null);
        setIsEditing(false);
        setCurrentNewsId(null);
        setSuccess('');
        setError('');
    };

    const handleUpload = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!headline || !article) {
            setError('Please fill in both the headline and article fields.');
            return;
        }

        setUploading(true);
        setError('');
        setSuccess('');

        try {
            let mediaURL = '';
            let mediaType: 'image' | 'video' | '' = '';

            if (file) { // Prioritize file upload
                const storageRef = ref(storage, `news-media/${file.name}`);
                await uploadBytes(storageRef, file);
                mediaURL = await getDownloadURL(storageRef);
                mediaType = file.type.startsWith('image/') ? 'image' : 'video';
            } else if (videoLink) { // Use videoLink if no file is uploaded
                mediaURL = videoLink;
                mediaType = 'video';
            }

            if (isEditing && currentNewsId) {
                const currentArticle = newsList.find(item => item.id === currentNewsId);
                const newsDataToUpdate: Partial<NewsArticle> = { // Use Partial for updates
                    headline,
                    article,
                    videoLink: videoLink,
                    instagramLink: instagramLink, // Included
                    twitterLink: twitterLink,     // Included
                    linkedinLink: linkedinLink,   // Included
                    // Use new mediaURL/mediaType if available, otherwise retain existing
                    mediaURL: mediaURL || currentArticle?.mediaURL || '',
                    mediaType: mediaType || currentArticle?.mediaType || '',
                    timestamp: new Date(), // Update timestamp on edit
                };
                await updateDoc(doc(db, 'news', currentNewsId), newsDataToUpdate);
                setSuccess('News article updated successfully!');
            } else {
                const newsDataToAdd: Omit<NewsArticle, 'id'> = { // Omit 'id' as it's generated by Firebase
                    headline,
                    article,
                    videoLink: videoLink,
                    instagramLink: instagramLink, // Included
                    twitterLink: twitterLink,     // Included
                    linkedinLink: linkedinLink,   // Included
                    mediaURL,
                    mediaType,
                    timestamp: new Date(),
                    createdAt: new Date(), // Set createdAt only for new articles
                };
                await addDoc(collection(db, 'news'), newsDataToAdd);
                setSuccess('News article uploaded successfully! 🎉');
            }

            // Re-fetch and sort the news list to show latest changes
            const newsCollectionRef = collection(db, 'news');
            const querySnapshot = await getDocs(newsCollectionRef);
            const updatedArticles = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    headline: data.headline,
                    article: data.article,
                    mediaURL: data.mediaURL || '',
                    videoLink: data.videoLink || '',
                    instagramLink: data.instagramLink || '', // Mapped
                    twitterLink: data.twitterLink || '',     // Mapped
                    linkedinLink: data.linkedinLink || '',   // Mapped
                    mediaType: data.mediaType || '',
                    timestamp: data.timestamp,
                    createdAt: data.createdAt,
                };
            }) as NewsArticle[];

            updatedArticles.sort((a, b) => {
                const dateA = (a.createdAt || a.timestamp).toDate();
                const dateB = (b.createdAt || b.timestamp).toDate();
                return dateB.getTime() - dateA.getTime();
            });

            setNewsList(updatedArticles);
            resetForm();
        } catch (err) {
            console.error('Upload failed:', err);
            setError('Failed to upload/update news. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    // Function to handle news deletion
    const handleDelete = async (id: string, mediaURL: string) => {
        if (window.confirm('Are you sure you want to delete this news article? This action cannot be undone.')) {
            try {
                // ✅ CRITICAL FIX: Only attempt to delete from Firebase Storage if mediaURL is a valid GCS URL.
                // Firebase Storage URLs typically start with 'https://firebasestorage.googleapis.com'
                if (mediaURL && mediaURL.startsWith('https://firebasestorage.googleapis.com')) {
                    try {
                        const path = new URL(mediaURL).pathname.split('/o/')[1].split('?')[0];
                        const fileRef = ref(storage, decodeURIComponent(path));
                        await deleteObject(fileRef);
                        console.log('Successfully deleted media from Firebase Storage.');
                    } catch (storageErr) {
                        // Log a warning but don't prevent document deletion,
                        // as the media might have been an external link or already deleted.
                        console.warn('Could not delete media from Firebase Storage (might have been external link or already deleted):', storageErr);
                    }
                }

                await deleteDoc(doc(db, 'news', id));

                setNewsList(prev => prev.filter(item => item.id !== id));
                setSuccess('News article deleted successfully!');
            } catch (err) {
                console.error('Deletion failed:', err);
                setError('Failed to delete news article.');
            }
        }
    };

    // Function to handle news editing - populates form with article data
    const handleEdit = (articleToEdit: NewsArticle) => {
        setIsEditing(true);
        setCurrentNewsId(articleToEdit.id);
        setHeadline(articleToEdit.headline);
        setArticle(articleToEdit.article);
        setVideoLink(articleToEdit.videoLink || '');
        setInstagramLink(articleToEdit.instagramLink || ''); // Populated
        setTwitterLink(articleToEdit.twitterLink || '');     // Populated
        setLinkedinLink(articleToEdit.linkedinLink || '');   // Populated
        setFile(null); // Clear file input when editing, so user can choose to upload new or keep old
        setSuccess('');
        setError('');
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
                <h1 className="text-2xl font-semibold text-gray-900">News Board</h1>

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

                {/* News Upload Form */}
                <div className="bg-white shadow rounded-lg text-black p-6">
                    <h2 className="text-3xl py-5 font-semibold">{isEditing ? 'EDIT NEWS ARTICLE' : 'UPLOAD NEWS'}</h2>
                    <form onSubmit={handleUpload} className="space-y-4">
                        <div>
                            <label htmlFor="headline" className="block text-sm font-medium text-gray-700">
                                News Headline
                            </label>
                            <input
                                id="headline"
                                type="text"
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm h-10 p-2 text-black focus:ring-indigo-500 focus:border-indigo-500"
                                value={headline}
                                onChange={(e) => setHeadline(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="article" className="block text-sm font-medium text-gray-700">
                                News Article
                            </label>
                            <textarea
                                id="article"
                                rows={5}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-black focus:ring-indigo-500 focus:border-indigo-500"
                                value={article}
                                onChange={(e) => setArticle(e.target.value)}
                            />
                        </div>
                        <div className='grid grid-cols-2 sm:grid-cols-2 gap-4'>
                            <div>
                                <label htmlFor="video-link" className="block text-sm font-medium text-gray-700">
                                    Video Link (Optional)
                                </label>
                                <input
                                    id="video-link"
                                    type="text"
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm h-10 p-2 text-black focus:ring-indigo-500 focus:border-indigo-500"
                                    value={videoLink}
                                    onChange={(e) => setVideoLink(e.target.value)}
                                />
                            </div>

                            <div>
                                <label htmlFor="instagram-link" className="block text-sm font-medium text-gray-700">
                                    Instagram Link (Optional)
                                </label>
                                <input
                                    id="instagram-link"
                                    type="text"
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm h-10 p-2 text-black focus:ring-indigo-500 focus:border-indigo-500"
                                    value={instagramLink}
                                    onChange={(e) => setInstagramLink(e.target.value)}
                                />
                            </div>

                            <div>
                                <label htmlFor="twitter-link" className="block text-sm font-medium text-gray-700">
                                    Twitter/X Link (Optional)
                                </label>
                                <input
                                    id="twitter-link"
                                    type="text"
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm h-10 p-2 text-black focus:ring-indigo-500 focus:border-indigo-500"
                                    value={twitterLink}
                                    onChange={(e) => setTwitterLink(e.target.value)}
                                />
                            </div>

                            <div>
                                <label htmlFor="linkedin-link" className="block text-sm font-medium text-gray-700">
                                    LinkedIn Link (Optional)
                                </label>
                                <input
                                    id="linkedin-link"
                                    type="text"
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm h-10 p-2 text-black focus:ring-indigo-500 focus:border-indigo-500"
                                    value={linkedinLink}
                                    onChange={(e) => setLinkedinLink(e.target.value)}
                                />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="media-upload" className="block text-sm font-medium text-gray-700">
                                Image or Video File (Optional)
                            </label>
                            <input
                                id="media-upload"
                                type="file"
                                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                accept="image/*,video/*" // ✅ Accept both image and video files
                                onChange={handleFileChange}
                            />
                            {file && (
                                <p className="mt-2 text-sm text-gray-600">Selected file: {file.name}</p>
                            )}
                            {isEditing && !file && (
                                <p className="mt-2 text-sm text-gray-400">Current media will be kept unless a new file is uploaded.</p>
                            )}
                        </div>
                        {success && <p className="text-green-600 font-semibold">{success}</p>}
                        {error && <p className="text-red-600 font-semibold">{error}</p>}
                        <button
                            type="submit"
                            className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            disabled={uploading}
                        >
                            {uploading ? (isEditing ? 'Updating...' : 'Uploading...') : (isEditing ? 'Update News' : 'Publish News')}
                        </button>
                        {isEditing && (
                            <button
                                type="button"
                                onClick={resetForm}
                                className="w-full mt-2 inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                Cancel Edit
                            </button>
                        )}

                    </form>
                </div>

                {/* News Management Section */}
                <div className="bg-white shadow rounded-lg text-black p-6">
                    <h2 className="text-3xl py-5 font-semibold">MANAGE NEWS ARTICLES</h2>
                    {newsList.length === 0 ? (
                        <p>No news articles found. Start by uploading one!</p>
                    ) : (
                        <div className="space-y-4">
                            {newsList.map(article => (
                                <div key={article.id} className="p-4 border rounded-md shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold">{article.headline}</h3>
                                        <p className="text-sm text-gray-600">{article.article}</p>
                                        <div className="flex mt-2 space-x-2">
                                            <button
                                                onClick={() => handleEdit(article)}
                                                className="px-3 py-1 text-sm font-medium rounded-md text-white bg-blue-500 hover:bg-blue-600"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(article.id, article.mediaURL)}
                                                className="px-3 py-1 text-sm font-medium rounded-md text-white bg-red-500 hover:bg-red-600"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                        <p className='pt-3 text-gray-400 text-xs'>
                                            {
                                                ` ${article.createdAt.toDate().getDate()}`
                                                + (
                                                    article.createdAt.toDate().getDate() === 1 || article.createdAt.toDate().getDate() === 21 || article.createdAt.toDate().getDate() === 31
                                                        ? 'st'
                                                        : article.createdAt.toDate().getDate() === 2 || article.createdAt.toDate().getDate() === 22
                                                            ? 'nd'
                                                            : article.createdAt.toDate().getDate() === 3 || article.createdAt.toDate().getDate() === 23
                                                                ? 'rd'
                                                                : 'th'
                                                ) +
                                                ` ${article.createdAt.toDate().toLocaleString('en-US', { month: 'short', year: 'numeric' })}`

                                                + ` at ${article.createdAt.toDate().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
                                            }
                                        </p>
                                        {/* Display social links if available */}
                                        <div className="flex space-x-2 mt-2 text-xs text-gray-500">
                                            {article.instagramLink && <a href={article.instagramLink} target="_blank" rel="noopener noreferrer" className="hover:underline">Instagram</a>}
                                            {article.twitterLink && <a href={article.twitterLink} target="_blank" rel="noopener noreferrer" className="hover:underline">Twitter/X</a>}
                                            {article.linkedinLink && <a href={article.linkedinLink} target="_blank" rel="noopener noreferrer" className="hover:underline">LinkedIn</a>}
                                        </div>
                                    </div>
                                    {/* ✅ Render image or video based on mediaType */}
                                    {article.mediaURL && (
                                        <div className="w-1/2 flex-shrink-0 sm:w-1/3 md:w-1/4 lg:w-1/5">
                                            <img src={article.mediaURL} alt={article.headline} className="w-full h-auto object-cover rounded-md" />
                                        </div>
                                    )}

                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
