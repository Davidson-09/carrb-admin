import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc, serverTimestamp } from "firebase/firestore";

// Your Firebase config (update these with your actual values or use environment variables)
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export const addCreatedAtToUsers = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, "users"));

        for (const userDoc of querySnapshot.docs) {
            const data = userDoc.data();

            // Only update if missing
            if (!data.createdAt) {
                await updateDoc(doc(db, "users", userDoc.id), {
                    createdAt: serverTimestamp(),
                });
                console.log(`✅ Added createdAt to user: ${userDoc.id}`);
            }
        }

        console.log("🎉 Finished updating all user docs!");
    } catch (error) {
        console.error("❌ Error updating user docs:", error);
    }
};

// Run the function when executing the script
addCreatedAtToUsers();