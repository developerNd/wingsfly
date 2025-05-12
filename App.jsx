import { NavigationContainer } from "@react-navigation/native";
import React from "react";
import AuthStack from "./Src/Navigation/AuthStack";
import Home from "./Src/Pages/Home/Home";


const App = () => {
  return (
    <NavigationContainer>
      <Home></Home>
    </NavigationContainer>
  )
}

export default App