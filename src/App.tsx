import { PlayerProvider } from './context/PlayerContext';
import { ThemeProvider } from './themes/ThemeContext';
import { AppShell } from './components/AppShell';

export function App() {
  return (
    <ThemeProvider>
      <PlayerProvider>
        <AppShell />
      </PlayerProvider>
    </ThemeProvider>
  );
}
