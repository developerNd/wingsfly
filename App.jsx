import { NavigationContainer } from "@react-navigation/native";
import React from "react";
import AuthStack from "./src/Navigation/AuthStack";
import AppStack from "./src/Navigation/AppStack";

const App = () => {
  return (
    <NavigationContainer>
      <AuthStack/>
    </NavigationContainer>
  )
}

export default App