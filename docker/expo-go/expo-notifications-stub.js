// Expo Go (Android, SDK 53+) throws as soon as expo-notifications is imported. The Docker Metro image aliases the
// module to this stub so the app can be previewed in Expo Go; pushes need a development build either way.
// Every call site in the app already treats a failure as "unavailable".
const unavailable = () => {
  throw new Error('expo-notifications is unavailable in Expo Go');
};

module.exports = {
  getPermissionsAsync: async () => ({ status: 'undetermined', granted: false, canAskAgain: false }),
  requestPermissionsAsync: async () => ({ status: 'undetermined', granted: false, canAskAgain: false }),
  getExpoPushTokenAsync: async () => unavailable(),
  getLastNotificationResponseAsync: async () => null,
  addNotificationResponseReceivedListener: () => ({ remove() {} }),
  setNotificationHandler: () => {},
};
