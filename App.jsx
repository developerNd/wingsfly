import { NavigationContainer } from "@react-navigation/native";
import React from "react";
import AuthStack from "./src/Navigation/AuthStack";
import AppStack from "./src/Navigation/AppStack";
import YNScreen from "./src/Pages/PlanYourDay/Recurring/RecurringYesorNoScreen"



const App = () => {
  return (
    <NavigationContainer>
      <AppStack/>
    </NavigationContainer>
  )
}

export default App