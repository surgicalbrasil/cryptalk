import React from 'react';
import {
  Box,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useColorModeValue
} from '@chakra-ui/react';
import { OffChainSpace } from '../features/storage/components/OffChainSpace';
import { OnChainSpace } from '../features/payments/components/OnChainSpace';
import WalletConnectionModal from '../components/WalletConnectionModal';
import { useWalletConnection } from '../hooks/useWalletConnection';

const ModularDashboard: React.FC = () => {
  const bgColor = useColorModeValue('gray.50', 'gray.900');

  const {
    isModalOpen: isWalletModalOpen,
    handleWalletConnected,
    closeModal
  } = useWalletConnection({
    feature: 'on-chain features'
  });

  return (
    <Box maxW="1400px" mx="auto" p={6} bg={bgColor} minH="calc(100vh - 64px)">
      {/* Main Tabs: Off Chain Space and On Chain Space */}
      <Tabs size="lg" variant="enclosed" colorScheme="blue" defaultIndex={0}>
        <TabList mb={4}>
          <Tab fontSize="lg" fontWeight="semibold">
            📁 Off Chain Space
          </Tab>
          <Tab fontSize="lg" fontWeight="semibold">
            ⛓️ On Chain Space
          </Tab>
        </TabList>

        <TabPanels>
          {/* OFF CHAIN SPACE TAB */}
          <TabPanel p={0}>
            <OffChainSpace />
          </TabPanel>

          {/* ON CHAIN SPACE TAB */}
          <TabPanel p={0}>
            <OnChainSpace />
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Wallet Connection Modal */}
      <WalletConnectionModal
        isOpen={isWalletModalOpen}
        onClose={closeModal}
        feature="on-chain features"
        onSuccess={handleWalletConnected}
      />
    </Box>
  );
};

export default ModularDashboard;