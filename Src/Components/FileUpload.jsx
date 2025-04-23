import React from 'react';
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import Upload from 'react-native-vector-icons/MaterialCommunityIcons';

const FileUpload = ({onclick}) => {
    return (
        <TouchableOpacity style={styles.uploadBox}>
            <Upload name="cloud-upload-outline" size={25} color="#3366FF" />
            <Text style={styles.uploadText}>Browse image to start uploading</Text>
            <TouchableOpacity onPress={onclick} style={{ width: 100, height: 30, borderWidth: 1, borderColor: "#3366FF", borderRadius: 6, marginTop: 10 }}>
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                    <Text style={{ fontSize: 12, fontWeight: "600", color: "#3366FF" }}>Browse files</Text>
                </View>
            </TouchableOpacity>
        </TouchableOpacity>
    );
};

export default FileUpload;

const styles = StyleSheet.create({
    uploadBox: {
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#3366FF',
        borderRadius: 10,
        height: 110,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 10,
        marginVertical: 10,
        backgroundColor: '#F5F8FF',
    },
    uploadText: {
        fontSize: 12,
        color: '#3366FF',
        fontWeight: '500',
    },
});
