import { NavigationContainer } from "@react-navigation/native";
import React from "react";
import AuthStack from "./Src/Navigation/AuthStack";


const App = () => {
  return (
    <NavigationContainer>
      <AuthStack></AuthStack>
    </NavigationContainer>
  )
}

export default App