# Popup

Popup({
message: "Success!",
description: "Your action was successful.",
action: "success",
duration: 1000,
})

# camera option

handleCamera((imageData) => {
if (imageData) {

        setImageUri(imageData.uri);
        Alert.alert('Photo Taken!', `Image URI: ${imageData.uri}`);
      } else {
        Alert.alert('No photo taken!');
      }
    });

# Drawer handle

const { openDrawer, closeDrawer, toggleDrawer } = useNavigation();

# Handle back navigation

useEffect(() => {
const cleanupBackPress = handleBackNavigation(navigation, '', true); // Pass `true` to trigger exit confirmation
return cleanupBackPress;
}, [navigation]);

# Network check

const isConnected = await checkNetworkStatus();
if (isConnected) {
Alert.alert('You are connected to the internet!');
} else {
Alert.alert('No internet connection. Please check your network.');
}

# Api services users

import AxiosService from './AxiosService';
const api = new AxiosService();

// Example of GET request
api.get('/users', { page: 1, limit: 10 })
.then((data) => {
console.log('Fetched users:', data);
})
.catch((error) => {
console.error('Error fetching users:', error);
});

// Example of POST request
const newUser = { name: '', email: '' };
api.post('/users', newUser)
.then((data) => {
console.log('User created:', data);
})
.catch((error) => {
console.error('Error creating user:', error);
});

const updatedUser = { name: '', email: '' };
api.put('/users/123', updatedUser)
.then((data) => {
console.log('User updated:', data);
})
.catch((error) => {
console.error('Error updating user:', error);
});

const userPatchData = { email: '' };
api.patch('/users/123', userPatchData)
.then((data) => {
console.log('User patched:', data);
})
.catch((error) => {
console.error('Error patching user:', error);
});
