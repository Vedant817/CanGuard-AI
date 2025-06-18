import * as SecureStore from 'expo-secure-store';

export const saveToken = async (token: string) => {
  try {
    await SecureStore.setItemAsync('canara-token', token);
  } catch (error) {
    console.error('Error saving token:', error);
  }
};

export const getToken = async () => {
  try {
    return await SecureStore.getItemAsync('canara-token');
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};

export const deleteToken = async () => {
  try {
    await SecureStore.deleteItemAsync('canara-token');
  } catch (error) {
    console.error('Error deleting token:', error);
  }
};
