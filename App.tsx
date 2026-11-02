import { StatusBar } from 'expo-status-bar';

import SpikeScreen from './src/spike/SpikeScreen';

// Temporary: the app is just the on-device spike until the next plan replaces it.
export default function App() {
  return (
    <>
      <SpikeScreen />
      <StatusBar style="dark" />
    </>
  );
}
