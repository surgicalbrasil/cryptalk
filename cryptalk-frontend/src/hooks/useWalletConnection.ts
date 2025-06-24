import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface UseWalletConnectionOptions {
  feature?: string;
  onWalletConnected?: () => void;
}

export const useWalletConnection = (options: UseWalletConnectionOptions = {}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isWalletConnected, isEmailAuthenticated } = useAuth();

  const requireWalletConnection = useCallback((action: () => void) => {
    if (!isEmailAuthenticated) {
      // Should not happen in normal flow, but handle gracefully
      console.error('User must be logged in with email first');
      return;
    }

    if (isWalletConnected) {
      // Wallet already connected, execute action immediately
      action();
    } else {
      // Show wallet connection modal
      setIsModalOpen(true);
    }
  }, [isWalletConnected, isEmailAuthenticated]);

  const handleWalletConnected = useCallback(() => {
    setIsModalOpen(false);
    if (options.onWalletConnected) {
      options.onWalletConnected();
    }
  }, [options.onWalletConnected]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  return {
    isModalOpen,
    requireWalletConnection,
    handleWalletConnected,
    closeModal,
    isWalletConnected,
    feature: options.feature
  };
};