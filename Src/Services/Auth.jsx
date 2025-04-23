import { Endpoints } from "../Helper/Contants/Endpoints"

// Login Api
export const LoginApi = async (payload) => {
    try {
        let res = await fetch(`${Endpoints.BASEURL}${Endpoints.LOGIN}`, {
            method: "POST",
            body: JSON.stringify(payload),
            headers: {
                'Content-type': 'application/json'
            }
        })
        res = await res.json()
        return res
    } catch (error) {
        return error.message
    }
}

// SignUp Api
export const SignupApi = async (payload) => {
    try {
        let res = await fetch(`${Endpoints.BASEURL}${Endpoints.SIGNUP}`, {
            method: "POST",
            body: JSON.stringify(payload),
            headers: {
                'Content-type': 'application/json'
            }
        })
        res = await res.json()
        return res
    } catch (error) {
        return error.message
    }
}


// Otp Verfication Api
export const OtpVerifyApi = async (payload) => {
    try {
        let res = await fetch(`${Endpoints.BASEURL}${Endpoints.VERIFYOTP}`, {
            method: "POST",
            body: JSON.stringify(payload),
            headers: {
                'Content-type': 'application/json'
            }
        })
        res = await res.json()
        return res
    } catch (error) {
        return error.message
    }
}


// Resend Otp
export const ResendOTPApi = async (phonenumber) => {
    try {
        let res = await fetch(`${Endpoints.BASEURL}${Endpoints.RESENDOTP}?phone=${phonenumber}`, {
            method: "GET",
            headers: {
                'Content-type': 'application/json'
            }
        })
        res = await res.json()
        return res
    } catch (error) {
        return error.message
    }
}