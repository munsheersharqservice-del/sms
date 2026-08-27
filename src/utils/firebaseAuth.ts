import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/drive');
provider.setCustomParameters({
  prompt: 'consent',
  access_type: 'offline',
});

let isSigningIn = false;
let cachedAccessToken: string | null = (typeof window !== 'undefined' && localStorage.getItem('sharq_google_access_token')) || null;
let cachedUser: User | null = null;

type AuthListener = (user: User | null, token: string | null) => void;
const authListeners = new Set<AuthListener>();

function notifyListeners() {
  authListeners.forEach((cb) => {
    try {
      cb(cachedUser, cachedAccessToken);
    } catch (e) {
      console.error('Auth listener error:', e);
    }
  });
}

export const subscribeAuth = (cb: AuthListener) => {
  authListeners.add(cb);
  cb(cachedUser, cachedAccessToken);
  return () => {
    authListeners.delete(cb);
  };
};

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    cachedUser = user;
    if (user) {
      const storedToken = cachedAccessToken || (typeof window !== 'undefined' ? localStorage.getItem('sharq_google_access_token') : null);
      if (storedToken) {
        cachedAccessToken = storedToken;
        if (onAuthSuccess) onAuthSuccess(user, storedToken);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sharq_google_access_token');
      }
      if (onAuthFailure) onAuthFailure();
    }
    notifyListeners();
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google Access Token from sign-in.');
    }
    cachedAccessToken = credential.accessToken;
    cachedUser = result.user;
    if (typeof window !== 'undefined') {
      localStorage.setItem('sharq_google_access_token', credential.accessToken);
    }
    notifyListeners();
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Auth Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken) return cachedAccessToken;
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('sharq_google_access_token');
    if (stored) {
      cachedAccessToken = stored;
      return stored;
    }
  }
  return null;
};

export const getCurrentGoogleUser = (): User | null => {
  return cachedUser || auth.currentUser;
};

export const googleSignOut = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  cachedUser = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('sharq_google_access_token');
  }
  notifyListeners();
};

export const clearCachedToken = () => {
  cachedAccessToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('sharq_google_access_token');
  }
  notifyListeners();
};

export const getOrRefreshAccessToken = async (forceFresh = false): Promise<string> => {
  if (!forceFresh) {
    const existing = await getAccessToken();
    if (existing) return existing;
  }
  clearCachedToken();
  const res = await googleSignIn();
  if (!res?.accessToken) {
    throw new Error('Google Sign-in was cancelled or failed to provide an access token.');
  }
  return res.accessToken;
};

