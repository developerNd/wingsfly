import { NavigationContainer } from "@react-navigation/native";
import React from "react";
import AuthStack from "./Src/Navigation/AuthStack";
import Home from "./Src/Pages/Home/Home";
import AppStack from "./Src/Navigation/AppStack";
import EvaluateProgress from "./Src/Pages/PlanYourDay/Habit/Step1/EvaluateProgress";


const App = () => {
  return (
    <NavigationContainer>
      <EvaluateProgress></EvaluateProgress>
    </NavigationContainer>
  )
}

export default App