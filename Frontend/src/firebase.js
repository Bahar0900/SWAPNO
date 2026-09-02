import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

// From Firebase Console -> Project settings -> Your apps -> Web app
const firebaseConfig = {
  apiKey: "AIzaSyBWuVTBZZvNX1Ggw2WH5dVI6iqr6wXyGkE",
  authDomain: "shwapno-store.firebaseapp.com",
  projectId: "shwapno-store",
  storageBucket: "shwapno-store.firebasestorage.app",
  messagingSenderId: "887017636703",
  appId: "1:887017636703:web:c379bd640b1ed843ffacea"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  const idToken = await result.user.getIdToken();
  return { firebaseUser: result.user, idToken };
}

export async function logout() {
  await signOut(auth);
}

export { onAuthStateChanged };
