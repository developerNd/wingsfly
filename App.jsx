import { NavigationContainer } from "@react-navigation/native";
import React from "react";
import AuthStack from "./src/Navigation/AuthStack";
import Home from "./src/Pages/Home/Home";
import AppStack from "./src/Navigation/AppStack";
import EvaluateProgress from "./src/Pages/PlanYourDay/Habit/Step1/EvaluateProgress";
import TimerScreen from "./src/Pages/PlanYourDay/Habit/Step2/TimerScreen"


const App = () => {
  return (
    <NavigationContainer>
      <AppStack/>
    </NavigationContainer>
  )
}

export default App