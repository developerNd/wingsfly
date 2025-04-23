import React, { useState } from 'react';
import {
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import CommonButton from '../../Components/Button/CommonButton';
import { useNavigation } from '@react-navigation/native';
import { Route } from '../../Helper/Contants/Route';
import { LoginApi, SignupApi } from '../../Services/Auth';
import ToastUtil from '../../Helper/Toast';
import DropDownPicker from 'react-native-dropdown-picker';
import UploadIcon from 'react-native-vector-icons/MaterialIcons';
import CalenderIcon from 'react-native-vector-icons/EvilIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { handleFileUpload } from '../../Helper/FileUpload';
import { Singlefileupload } from '../../Services/Fileupload';

const Signup = () => {
    const navigation = useNavigation();
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [dateOfBirth, setdateOfBirth] = useState('');
    const [name, setName] = useState('');
    const [phonenumer, setPhoneNumber] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [opengender, setOpenGender] = useState(false);
    const [gender, setGender] = useState(null);
    const [genderItems, setGenderItems] = useState([
        { label: 'Male', value: 'Male' },
        { label: 'Female', value: 'Female' },
    ]);
    const [openIndustry, setOpenIndustry] = useState(false);
    const [industry, setIndustry] = useState(null);
    const [industryItems, setIndustryItems] = useState([
        { label: 'IT', value: 'it' },
        { label: 'Healthcare', value: 'healthcare' },
        { label: 'Finance', value: 'finance' },
        { label: 'Education', value: 'education' },
        { label: 'Other', value: 'other' },
    ]);
    const [openMulti, setOpenMulti] = useState(false);
    const [multiValue, setMultiValue] = useState([]);
    const [multiItems, setMultiItems] = useState([
        { label: 'Tag1', value: 'tag1' },
        { label: 'Tag2', value: 'tag2' },
    ]);
    const [profile, setProfile] = useState('');

    const HandleSignup = async () => {



        if (!name) {
            ToastUtil.error('Error!', 'Full Name is required.');
            return;
        }
        if (!dateOfBirth) {
            ToastUtil.error('Error!', 'Date of birth is required.');
            return;
        }
        if (!gender) {
            ToastUtil.error('Error!', 'Gender is required.');
            return;
        }
        if (!industry) {
            ToastUtil.error('Error!', 'Industry is required.');
            return;
        }
        if (multiValue?.length === 0) {
            ToastUtil.error('Error!', 'Tags is required.');
            return;
        }
        if (!email) {
            ToastUtil.error('Error!', 'Email is required.');
            return;
        }
        if (!phonenumer) {
            ToastUtil.error('Error!', 'Phonenumber is required.');
            return;
        }
        if (phonenumer.length !== 10) {
            ToastUtil.error('Error!', 'Phonenumber must be 10 digit.');
            return;
        }
        if (!profile) {
            ToastUtil.error('Error!', 'Profile Image is required.');
            return;
        }
        setLoading(true);


        try {
            let uploadfile = await Singlefileupload(profile[0])
            if (uploadfile.success) {
                let response = await SignupApi({
                    fullName: name,
                    dob: dateOfBirth,
                    gender: gender,
                    email: email,
                    phone: phonenumer,
                    "role": "staff",
                    profileImage: uploadfile?.url,
                    tags: multiValue,
                });
                if (response.status === 200) {
                    ToastUtil.success('Success!', `Otp Send Successfully ${response.data}`);
                    navigation.navigate(Route.OTPVERIFICATION_SCREEN, {
                        phonenumber: phonenumer,
                    });
                } else {
                    ToastUtil.error('Error!', response.message);
                }
            }

        } catch (error) {
        } finally {
            setLoading(false);
        }
    };


    const handleDateChange = (event, selectedDate) => {
        setShowDatePicker(false);
        if (selectedDate) {
            const formatted = selectedDate.toISOString().split('T')[0];
            setdateOfBirth(formatted);
        }
    };

    const ProfileUpload = file => {
        setProfile(file);
    };

    return (
        <SafeAreaView style={Styles.container}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <ScrollView
                        contentContainerStyle={{ flexGrow: 1 }}
                        keyboardShouldPersistTaps="handled">
                        <View style={{ flex: 1 }}>
                            <Image
                                style={Styles.logo}
                                source={require('../../Assets/Images/Logobac.png')}
                            />

                            <View style={Styles.bottomSection}>
                                <Text style={Styles.title}>Save Smart, Earn Rewards</Text>
                                <View style={Styles.lineContainer}>
                                    <View style={Styles.leftLine} />
                                    <Text style={Styles.lineText}>Sign up</Text>
                                    <View style={Styles.rightLine} />
                                </View>

                                <View style={Styles.inputContainer}>
                                    <Text style={Styles.label}>Full name</Text>
                                    <View style={Styles.inputBox}>
                                        <TextInput
                                            style={Styles.input}
                                            keyboardType="default"
                                            placeholder="Enter your full name"
                                            value={name}
                                            onChangeText={text => setName(text)}
                                        />
                                    </View>

                                    <Text style={Styles.label}>Date of Birth</Text>
                                    <TouchableOpacity
                                        onPress={() => setShowDatePicker(true)}
                                        style={Styles.inputBox}>
                                        <Text style={[Styles.input, { paddingTop: 12 }]}>
                                            {dateOfBirth || 'Select your date of birth'}
                                        </Text>
                                        <CalenderIcon
                                            name="calendar"
                                            style={{ marginRight: 5 }}
                                            size={30}
                                            color="rgba(51, 102, 255, 1)"
                                        />
                                    </TouchableOpacity>

                                    {showDatePicker && (
                                        <DateTimePicker
                                            value={dateOfBirth ? new Date(dateOfBirth) : new Date()}
                                            mode="date"
                                            display="default"
                                            maximumDate={new Date()}
                                            onChange={handleDateChange}
                                        />
                                    )}

                                    <View
                                        style={{ zIndex: 10000, marginBottom: opengender ? 80 : 0 }}>
                                        <Text style={Styles.label}>Gender</Text>
                                        <DropDownPicker
                                            open={opengender}
                                            value={gender}
                                            items={genderItems}
                                            setOpen={setOpenGender}
                                            setValue={setGender}
                                            setItems={setGenderItems}
                                            placeholder="Select gender"
                                            style={Styles.dropdown}
                                            listMode="SCROLLVIEW"
                                            dropDownDirection="BOTTOM"
                                            dropDownContainerStyle={Styles.dropdownContainer}
                                        />
                                    </View>

                                    <View
                                        style={{
                                            zIndex: 8000,
                                            marginBottom: openIndustry ? 200 : 0,
                                        }}>
                                        <Text style={Styles.label}>Industry</Text>
                                        <DropDownPicker
                                            open={openIndustry}
                                            value={industry}
                                            items={industryItems}
                                            setOpen={setOpenIndustry}
                                            setValue={setIndustry}
                                            setItems={setIndustryItems}
                                            placeholder="Select industry"
                                            style={Styles.dropdown}
                                            listMode="SCROLLVIEW"
                                            dropDownDirection="BOTTOM"
                                            dropDownContainerStyle={Styles.dropdownContainer}
                                        />
                                    </View>

                                    <View
                                        style={{ zIndex: 5000, marginBottom: openMulti ? 60 : 0 }}>
                                        <Text style={Styles.label}>Tags</Text>
                                        <View
                                            style={{
                                                width: '100%',
                                                borderWidth: 1,
                                                padding: 10,
                                                borderRadius: 12,
                                                borderColor: '#D9D9D9',
                                            }}>
                                            <DropDownPicker
                                                multiple={true}
                                                min={0}
                                                max={5}
                                                open={openMulti}
                                                value={multiValue}
                                                items={multiItems}
                                                setOpen={setOpenMulti}
                                                setValue={setMultiValue}
                                                setItems={setMultiItems}
                                                placeholder="Select tags"
                                                style={[Styles.dropdown]}
                                                dropDownContainerStyle={Styles.dropdownContainer}
                                            />
                                            {multiValue.length > 0 && (
                                                <View
                                                    style={{
                                                        flexDirection: 'row',
                                                        flexWrap: 'wrap',
                                                        marginVertical: 5,
                                                    }}>
                                                    {multiValue.map((skill, index) => {
                                                        const label =
                                                            multiItems.find(item => item.value === skill)
                                                                ?.label || skill;
                                                        return (
                                                            <View
                                                                key={index}
                                                                style={{
                                                                    flexDirection: 'row',
                                                                    alignItems: 'center',
                                                                    borderRadius: 6,
                                                                    borderWidth: 1,
                                                                    borderColor: '#3366FF',
                                                                    paddingTop: 6,
                                                                    paddingBottom: 6,
                                                                    paddingRight: 10,
                                                                    paddingLeft: 10,
                                                                    marginLeft: 8,
                                                                    marginBottom: 8,
                                                                    backgroundColor: 'rgba(245, 248, 255, 1)',
                                                                }}>
                                                                <Text
                                                                    style={{
                                                                        fontSize: 12,
                                                                        color: '#3366FF',
                                                                        marginRight: 6,
                                                                        fontWeight: '400',
                                                                    }}>
                                                                    {label}
                                                                </Text>
                                                                <TouchableOpacity
                                                                    onPress={() =>
                                                                        setMultiValue(prev =>
                                                                            prev.filter((_, i) => i !== index),
                                                                        )
                                                                    }>
                                                                    <Text
                                                                        style={{
                                                                            color: '#3366FF',
                                                                            fontWeight: 'bold',
                                                                        }}>
                                                                        ✕
                                                                    </Text>
                                                                </TouchableOpacity>
                                                            </View>
                                                        );
                                                    })}
                                                </View>
                                            )}
                                        </View>
                                    </View>

                                    <View style={{ marginTop: 5 }}>
                                        <Text style={Styles.label}>Your Profile Image</Text>
                                        <TouchableOpacity

                                            style={{
                                                width: '100%',
                                                borderWidth: 1,
                                                borderRadius: 12,
                                                borderColor: '#D9D9D9',
                                                padding: 10,
                                            }}>
                                            <Text
                                                style={{
                                                    width: '95%',
                                                    alignSelf: 'center',
                                                    fontSize: 12,
                                                    fontWeight: '400',
                                                    color: 'rgba(102, 102, 102, 1)',
                                                }}>
                                                Max 5Mb image size are allowed
                                            </Text>
                                            <View
                                                style={{
                                                    width: '95%',
                                                    alignSelf: 'center',
                                                    borderWidth: 1,
                                                    borderRadius: 8,
                                                    borderColor: 'rgba(51, 102, 255, 1)',
                                                    borderStyle: 'dashed',
                                                    height: 100,
                                                    marginTop: 10,
                                                    flex: 1,
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                }}>
                                                <UploadIcon
                                                    name="cloud-upload"
                                                    size={24}
                                                    color="rgba(51, 102, 255, 1)"></UploadIcon>
                                                <Text
                                                    style={{
                                                        fontSize: 12,
                                                        fontWeight: '500',
                                                        color: 'rgba(51, 102, 255, 1)',
                                                        marginBottom: 3,
                                                    }}>
                                                    Browse image to start uploading
                                                </Text>
                                                {
                                                    profile ? <TouchableOpacity onPress={() => setProfile("")}>
                                                        <Text
                                                            style={{
                                                                fontSize: 10,
                                                                fontWeight: '500',
                                                                color: 'rgba(51, 102, 255, 1)',
                                                                backgroundColor: '#fff',
                                                                paddingTop: 5,
                                                                paddingLeft: 10,
                                                                paddingRight: 10,
                                                                paddingBottom: 5,
                                                                borderRadius: 6,
                                                                marginTop: 4,
                                                                borderWidth: 1,
                                                                borderColor: 'rgba(51, 102, 255, 1)',
                                                            }}>
                                                            Cancel
                                                        </Text>
                                                    </TouchableOpacity>
                                                        : <TouchableOpacity onPress={() => handleFileUpload(ProfileUpload)}>
                                                            <Text
                                                                style={{
                                                                    fontSize: 10,
                                                                    fontWeight: '500',
                                                                    color: 'rgba(51, 102, 255, 1)',
                                                                    backgroundColor: '#fff',
                                                                    paddingTop: 5,
                                                                    paddingLeft: 10,
                                                                    paddingRight: 10,
                                                                    paddingBottom: 5,
                                                                    borderRadius: 6,
                                                                    marginTop: 4,
                                                                    borderWidth: 1,
                                                                    borderColor: 'rgba(51, 102, 255, 1)',
                                                                }}>
                                                                Browse files
                                                            </Text>
                                                        </TouchableOpacity>

                                                }

                                            </View>
                                            <Text
                                                style={{
                                                    width: '95%',
                                                    alignSelf: 'center',
                                                    fontSize: 12,
                                                    fontWeight: '400',
                                                    color: 'rgba(102, 102, 102, 1)',
                                                    marginTop: 8,
                                                }}>
                                                Only support .jpg, .png and .svg files
                                            </Text>
                                            {
                                                profile[0]?.filename && <Text
                                                    style={{
                                                        width: '95%',
                                                        alignSelf: 'center',
                                                        fontSize: 12,
                                                        fontWeight: '400',
                                                        color: 'rgba(102, 102, 102, 1)',
                                                        marginTop: 5,
                                                    }}>
                                                    {profile[0]?.filename}
                                                </Text>
                                            }


                                            {profile && (
                                                <Image
                                                    style={{
                                                        height: 60,
                                                        width: 60,
                                                        marginTop: 5,
                                                        marginLeft: 10,
                                                        borderRadius: 5,
                                                    }}
                                                    source={{ uri: `${profile[0]?.path}` }}></Image>
                                            )}
                                        </TouchableOpacity>
                                    </View>

                                    <Text style={[Styles.label, { marginTop: 10 }]}>Email</Text>
                                    <View style={Styles.inputBox}>
                                        <TextInput
                                            style={Styles.input}
                                            keyboardType="email-address"
                                            placeholder="Enter your email"
                                            value={email}
                                            onChangeText={text => setEmail(text)}
                                        />
                                    </View>

                                    <Text style={Styles.label}>Phone Number</Text>
                                    <View style={Styles.phoneRow}>
                                        <View style={Styles.flagBox}>
                                            <Image source={require('../../Assets/Icons/flag.png')} />
                                        </View>
                                        <View style={Styles.phoneInputWrapper}>
                                            <View style={Styles.codeWrapper}>
                                                <Text style={Styles.fixedCode}>+91</Text>
                                            </View>
                                            <TextInput
                                                style={Styles.input}
                                                keyboardType="number-pad"
                                                maxLength={10}
                                                placeholder="Enter phone number"
                                                value={phonenumer}
                                                onChangeText={text => setPhoneNumber(text)}
                                            />
                                        </View>
                                    </View>

                                    <CommonButton
                                        textstyle={Styles.buttonText}
                                        outerstyle={[Styles.button]}
                                        btnname="Send OTP"
                                        loading={loading}
                                        onClick={() => HandleSignup()}
                                    />
                                </View>

                                <View
                                    style={{
                                        flexDirection: 'row',
                                        alignSelf: 'center',
                                        marginTop: 20,
                                    }}>
                                    <Text
                                        style={{ fontSize: 12, fontWeight: '500', color: '#6C7278' }}>
                                        Don’t have an account?
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() => navigation.navigate(Route.LOGIN_SCREEN)}>
                                        <Text
                                            style={{
                                                marginLeft: 6,
                                                fontSize: 12,
                                                fontWeight: '600',
                                                color: '#3366FF',
                                            }}>
                                            Log in
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={Styles.footer}>
                                <Text style={Styles.footerText}>
                                    By continuing you accept our{' '}
                                    <Text style={Styles.linkText}>Terms of Service</Text>. Also
                                    learn how we process your data in our{' '}
                                    <Text style={Styles.linkText}>Privacy Policy</Text> and{' '}
                                    <Text style={Styles.linkText}>Cookies Policy</Text>.
                                </Text>
                            </View>
                        </View>
                    </ScrollView>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default Signup;

const Styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    logo: {
        width: '100%',
        resizeMode: 'cover',
        borderBottomRightRadius: 25,
        borderBottomLeftRadius: 25,
    },
    bottomSection: {
        width: '90%',
        alignSelf: 'center',
    },
    title: {
        textAlign: 'center',
        marginTop: 30,
        fontWeight: '700',
        fontSize: 22,
    },
    lineContainer: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 30,
    },
    leftLine: {
        width: '40%',
        height: 20,
        borderColor: '#E6E6E6',
        borderStartWidth: 1,
        borderTopWidth: 1,
        borderTopStartRadius: 20,
    },
    rightLine: {
        width: '40%',
        height: 20,
        borderColor: '#E6E6E6',
        borderEndWidth: 1,
        borderTopWidth: 1,
        borderTopEndRadius: 20,
    },
    lineText: {
        width: '20%',
        textAlign: 'center',
        marginTop: -18,
        fontSize: 12,
        color: '#999999',
        fontWeight: '500',
    },
    inputContainer: {
        width: '100%',
        alignSelf: 'center',
        marginTop: 18,
    },
    label: {
        fontSize: 12,
        color: '#6C7278',
        fontWeight: '500',
        marginBottom: 5,
        marginTop: 5,
    },
    inputBox: {
        width: '100%',
        flexDirection: 'row',
        borderWidth: 1,
        height: 46,
        borderColor: '#EDF1F3',
        borderRadius: 10,
        backgroundColor: '#fff',
        alignItems: 'center',
        marginBottom: 5,
    },
    input: {
        flex: 1,
        height: '100%',
        paddingLeft: 12,
        fontSize: 14,
        color: '#000',
        fontWeight: '400',
    },
    dropdown: {
        borderColor: '#EDF1F3',
        borderRadius: 10,
        height: 46,
        marginBottom: 10,
        backgroundColor: '#fff',
    },
    dropdownContainer: {
        borderColor: '#EDF1F3',
        backgroundColor: '#fff',
    },
    phoneRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    flagBox: {
        height: 46,
        width: 50,
        borderWidth: 1,
        borderRadius: 10,
        borderColor: '#EDF1F3',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    phoneInputWrapper: {
        width: '80%',
        flexDirection: 'row',
        borderWidth: 1,
        height: 46,
        borderColor: '#EDF1F3',
        borderRadius: 10,
        backgroundColor: '#fff',
        alignItems: 'center',
    },
    codeWrapper: {
        width: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fixedCode: {
        fontSize: 14,
        color: '#000',
    },
    button: {
        height: 48,
        width: '100%',
        backgroundColor: '#3366FF',
        alignSelf: 'center',
        borderRadius: 10,
        marginTop: 20,
    },
    buttonText: {
        fontSize: 14,
        color: '#fff',
        fontWeight: '600',
    },
    footer: {
        width: '90%',
        alignSelf: 'center',
        marginTop: 45,
    },
    footerText: {
        fontSize: 10,
        color: '#6C7278',
        lineHeight: 18,
        textAlign: 'center',
    },
    linkText: {
        color: '#3366FF',
        fontWeight: '500',
        textDecorationLine: 'underline',
    },
});
