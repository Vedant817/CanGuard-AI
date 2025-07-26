import AsyncStorage from "@react-native-async-storage/async-storage";
import API_BASE_URL from "@/config/api";

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
    if (data.success && data.fingerprint?.D?.sessionData?.typingStats) {
      await AsyncStorage.setItem('behavioralData', JSON.stringify(data.fingerprint.D.sessionData.typingStats));
      console.log(`✅ Behavioral data retrieved and stored: ${data.count} records`);
    }

    return data;
  } catch (error) {
    console.error('Error fetching behavioral data:', error);
    return null;
  }
};
