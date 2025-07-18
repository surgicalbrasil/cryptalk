import { Magic } from 'magic-sdk';

let magic: Magic | null = null;

// Initialize Magic instance
const initMagic = () => {
  if (!magic && typeof window !== 'undefined') {
    magic = new Magic('pk_live_20134EF9B8F26232');
  }
  return magic;
};

// Simple magic link auth
export const sendMagicLink = async (email: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const magicInstance = initMagic();
    if (!magicInstance) {
      return { success: false, error: 'Magic not initialized' };
    }

    await magicInstance.auth.loginWithMagicLink({ email });
    return { success: true };
  } catch (error) {
    console.error('Magic link error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Check if user is logged in
export const isLoggedIn = async (): Promise<boolean> => {
  try {
    const magicInstance = initMagic();
    if (!magicInstance) return false;
    return await magicInstance.user.isLoggedIn();
  } catch (error) {
    console.error('Login check error:', error);
    return false;
  }
};

// Get user info
export const getUserInfo = async () => {
  try {
    const magicInstance = initMagic();
    if (!magicInstance) return null;
    const isAuth = await magicInstance.user.isLoggedIn();
    if (!isAuth) return null;
    return await magicInstance.user.getMetadata();
  } catch (error) {
    console.error('Get user info error:', error);
    return null;
  }
};

// Logout
export const logout = async (): Promise<void> => {
  try {
    const magicInstance = initMagic();
    if (!magicInstance) return;
    await magicInstance.user.logout();
  } catch (error) {
    console.error('Logout error:', error);
  }
};