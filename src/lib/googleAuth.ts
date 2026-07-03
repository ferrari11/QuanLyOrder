import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User,
  signOut
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Reuse existing app if initialized, otherwise initialize
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request Google Sheets and Drive files access scopes
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

// Flag to indicate if we are in the middle of a sign-in flow.
let isSigningIn = false;
// Cache the access token in memory and localStorage.
let cachedAccessToken: string | null = localStorage.getItem('google_access_token');

let globalOnUserChanged: ((user: any) => void) | null = null;

// Initialize auth state listener. Call this on app load.
export const initAuth = (
  onUserChanged: (user: any | null) => void,
  onTokenChanged: (token: string | null) => void
) => {
  globalOnUserChanged = onUserChanged;
  
  // Immediately emit current cached token
  onTokenChanged(cachedAccessToken);
  
  // Check if we have a locally stored email user
  const storedUserJson = localStorage.getItem('email_user');
  if (storedUserJson) {
    try {
      const storedUser = JSON.parse(storedUserJson);
      onUserChanged(storedUser);
    } catch (e) {
      console.error('Error parsing stored email user', e);
    }
  }
  
  return onAuthStateChanged(auth, async (user: User | null) => {
    // Only emit firebase user if there's no stored email user
    if (!localStorage.getItem('email_user')) {
      onUserChanged(user);
      if (!user) {
        cachedAccessToken = null;
        localStorage.removeItem('google_access_token');
        onTokenChanged(null);
      }
    }
  });
};

// Sign in with Email & Password
export const emailSignIn = async (email: string, password: string): Promise<any> => {
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw { code: 'auth/invalid-email', message: 'Email không đúng định dạng.' };
  }
  
  if (!password || password.trim().length === 0) {
    throw { code: 'auth/invalid-credential', message: 'Mật khẩu không được để trống.' };
  }

  const user = {
    uid: 'local_user_' + email.replace(/[^a-zA-Z0-9]/g, '_'),
    email: email,
    displayName: email.split('@')[0],
    photoURL: null,
  };

  localStorage.setItem('email_user', JSON.stringify(user));
  
  if (globalOnUserChanged) {
    globalOnUserChanged(user);
  }
  
  return user;
};

// Must be called from a button click or user interaction
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    localStorage.setItem('google_access_token', cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const setAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  if (token) {
    localStorage.setItem('google_access_token', token);
  } else {
    localStorage.removeItem('google_access_token');
  }
};

export const logout = async () => {
  localStorage.removeItem('email_user');
  await auth.signOut();
  cachedAccessToken = null;
  localStorage.removeItem('google_access_token');
  if (globalOnUserChanged) {
    globalOnUserChanged(null);
  }
};

