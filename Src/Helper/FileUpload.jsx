import { PermissionsAndroid, Platform } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import ImagePicker from 'react-native-image-crop-picker';

const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.CAMERA,
            {
                title: 'Camera Permission',
                message: 'This app needs access to your camera to take pictures.',
                buttonNeutral: 'Ask Me Later',
                buttonNegative: 'Cancel',
                buttonPositive: 'OK',
            },
        );

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            return true;
        } else {
            return false;
        }
    } else {
        return true;
    }
};

export const handleCamera = async callback => {
    
    const hasPermission = await requestCameraPermission();
  
    if (hasPermission) {
        const options = {
            mediaType: 'photo',
            cameraType: 'back',
            saveToPhotos: true,
            storageOptions: {
                skipBackup: true,
                path: 'images',
            },
        };

        // Launch the camera
        launchCamera(options, response => {
            if (response.didCancel) {
                console.log('User cancelled camera picker');
            } else if (response.errorCode) {
                console.log('Camera Error: ', response);
            } else if (response.assets && response.assets.length > 0) {
                callback(response.assets[0]);
            }
        });
    }
};

export const handleFileUpload = async callback => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    ImagePicker.openPicker({
        mediaType: 'photo',
        cropping: true, 
        multiple: false, 
    }).then(image => {
       
        callback([image]); 
    }).catch(error => {
        if (error.code !== 'E_PICKER_CANCELLED') {
            console.log('Image Picker Error:', error);
        }
    });
};