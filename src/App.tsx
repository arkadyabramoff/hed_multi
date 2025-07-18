import { Router } from "./components/layout/Router";
import { AllWalletsProvider } from "./services/AllWalletsProvider";

function App() {
  return (
    <AllWalletsProvider>
      <Router />
    </AllWalletsProvider>
  );
}

export default App;