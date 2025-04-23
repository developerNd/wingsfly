import { createContext, useContext, useState } from "react";

export const Authcontext = createContext(null)


export const AuthProvider = ({ children }) => {
    const [login, setIslogin] = useState(false)
    return (
        <Authcontext.Provider value={{ login, setIslogin }}>
            {children}
        </Authcontext.Provider>
    )
}

export const useAuth = () => {
    return useContext(Authcontext);
};