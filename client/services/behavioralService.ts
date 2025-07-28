import AsyncStorage from "@react-native-async-storage/async-storage";
import API_BASE_URL from "@/config/api";
import blockchainService from './blockchainService';

export interface BehavioralDataResponse {
  success: boolean;
  message: string;
  data: any[];
  count: number;
  fingerprint?: {
    D: {
      sessionData: {
        typingStats: any;
      };
    };
  };
}

/**
 * Store behavioral data using blockchain
 */
export const storeBehavioralDataOnChain = async (data: any): Promise<boolean> => {
  try {
    console.log('🔗 Storing behavioral data on blockchain...', {
      sessionId: data.sessionId,
      timestamp: data.timestamp
    });
    
    const result = await blockchainService.storeDataOnChain(data);
    if (!result.success) {
      throw new Error(`Blockchain storage failed: ${result.message}`);
    }
    
    console.log('✅ Stored on blockchain successfully!', result.data);
    return true;
  } catch (error) {
    console.error('❌ Failed to store behavioral data on blockchain:', error);
    return false;
  }
};

/**
 * Get blockchain status for debugging
 */
export const getBlockchainStatus = async () => {
  try {
    const status = await blockchainService.getBlockchainStatus();
    console.log('🔗 Blockchain Status:', status);
    return status;
  } catch (error) {
    console.error('❌ Failed to get blockchain status:', error);
    return null;
  }
};

export const getBehavioralData = async (): Promise<BehavioralDataResponse | null> => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/api/behavior/data`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: BehavioralDataResponse = await response.json();
    if (data.success) {
      await AsyncStorage.setItem('behavioralData', JSON.stringify(data));
      console.log(`✅ Behavioral data retrieved and stored: ${data.count} records`);
    }

    return data;
  } catch (error) {
    console.error('Error fetching behavioral data:', error);
    return null;
  }
};
