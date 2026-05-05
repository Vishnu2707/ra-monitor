import './global.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';

import { AppNavigator } from './src/navigation/AppNavigator';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppNavigator />
      <StatusBar style="dark" />
    </QueryClientProvider>
  );
}
