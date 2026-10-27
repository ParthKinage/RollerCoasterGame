import { useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import { audio } from './audio/audioEngine';
import { MainMenu } from './screens/MainMenu';
import { LevelSelect } from './screens/LevelSelect';
import { RideScreen } from './screens/RideScreen';
import { TrackBuilder } from './screens/TrackBuilder';
import { Customize } from './screens/Customize';
import { LoadingOverlay } from './ui/LoadingOverlay';

export default function App() {
  const screen = useGameStore((s) => s.screen);
  const setScreen = useGameStore((s) => s.setScreen);
  const rideSource = useGameStore((s) => s.rideSource);
  const sfx = useGameStore((s) => s.settings.sfxVolume);
  const music = useGameStore((s) => s.settings.musicVolume);

  useEffect(() => {
    if (screen === 'loading') setScreen('menu');
  }, [screen, setScreen]);

  useEffect(() => audio.setVolumes(sfx, music), [sfx, music]);

  // browsers only allow audio after a user gesture
  useEffect(() => {
    const unlock = () => audio.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    if (screen !== 'ride') audio.setMusic('menu');
  }, [screen]);

  switch (screen) {
    case 'loading':
      return <LoadingOverlay visible label="Starting" />;
    case 'menu':
    case 'settings':
    case 'exit':
      return <MainMenu />;
    case 'levels':
      return <LevelSelect />;
    case 'ride':
      return <RideScreen key={JSON.stringify(rideSource)} />;
    case 'builder':
      return <TrackBuilder />;
    case 'customize':
      return <Customize />;
    default:
      return <MainMenu />;
  }
}
