import Toast from 'react-native-toast-message';

const showToast = (type, text1, text2) => {
    Toast.show({
        type,
        text1,
        text2,
        position: 'top',
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 50,
    });
};

const ToastUtil = {
    success: (text1, text2 = '') => showToast('success', text1, text2),
    error: (text1, text2 = '') => showToast('error', text1, text2),
    info: (text1, text2 = '') => showToast('info', text1, text2),
};

export default ToastUtil;
