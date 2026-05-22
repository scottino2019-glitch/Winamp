import { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  SkipBack, 
  SkipForward, 
  Music, 
  Sparkles,
  Volume2,
  FolderOpen,
  Info,
  Layers,
  Heart,
  Sliders
} from 'lucide-react';
import { Track, PlaybackMode, Skin, SkinId } from './types.ts';
import { SKINS } from './skins.ts';
import ControlPanel from './components/ControlPanel.tsx';
import PlaylistManager from './components/PlaylistManager.tsx';

const DEMO_TRACKS: Track[] = [
  { id: 'demo1', title: 'Neon Drive Horizon', artist: 'Synthwave Alliance', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', duration: 372 },
  { id: 'demo2', title: 'Sunset Cyber Cruise', artist: 'Grid Runner', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', duration: 344 },
  { id: 'demo3', title: 'Laser Dreamscape', artist: 'Arcade Kid', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', duration: 362 },
  { id: 'demo4', title: 'Overdrive Matrix', artist: 'C64 Emulator', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', duration: 318 },
];

const EQ_PRESETS: Record<string, Record<string, number>> = {
  Rock: { PRE: 65, '60': 75, '170': 60, '310': 35, '600': 45, '1K': 65 },
  Techno: { PRE: 70, '60': 80, '170': 70, '310': 30, '600': 55, '1K': 75 },
  Classical: { PRE: 55, '60': 60, '170': 55, '310': 45, '600': 40, '1K': 60 },
  Vocal: { PRE: 50, '60': 30, '170': 45, '310': 75, '600': 70, '1K': 50 },
  Flat: { PRE: 50, '60': 50, '170': 50, '310': 50, '600': 50, '1K': 50 },
};

export default function App() {
  const [tracks, setTracks] = useState<Track[]>(DEMO_TRACKS);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('linear');
  const [volume, setVolume] = useState<number>(0.7);
  const [balance, setBalance] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [selectedSkinId, setSelectedSkinId] = useState<SkinId>('bento');

  // Equalizer states
  const [eqPreset, setEqPreset] = useState<string>('Rock');
  const [eqOn, setEqOn] = useState<boolean>(true);
  const [eqAuto, setEqAuto] = useState<boolean>(false);
  const [eqValues, setEqValues] = useState<Record<string, number>>(EQ_PRESETS.Rock);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Active track helper
  const currentTrack = tracks[currentIndex] || null;

  // Sync localStorage skin choice on load
  useEffect(() => {
    const cachedSkin = localStorage.getItem('winamp_skin_choice');
    if (cachedSkin && SKINS[cachedSkin]) {
      setSelectedSkinId(cachedSkin as SkinId);
    }
  }, []);

  // Listen to custom event emitters inside subcomponents for cross-component triggers
  useEffect(() => {
    const handleAddWebTrack = (e: any) => {
      const addedTrack = e.detail as Track;
      setTracks((current) => {
        const updated = [...current, addedTrack];
        // If nothing was playing, jump directly to it
        if (current.length === 0) {
          setCurrentIndex(0);
        }
        return updated;
      });
    };

    const handleLoadCustomTracks = (e: any) => {
      const customQueue = e.detail as Track[];
      if (customQueue.length > 0) {
        setTracks(customQueue);
        setCurrentIndex(0);
        setIsPlaying(false);
        setCurrentTime(0);
      }
    };

    const handleRestoreDemos = () => {
      setTracks(DEMO_TRACKS);
      setCurrentIndex(0);
      setIsPlaying(false);
      setCurrentTime(0);
    };

    window.addEventListener('add-web-track', handleAddWebTrack);
    window.addEventListener('load-custom-tracks', handleLoadCustomTracks);
    window.addEventListener('restore-demo-tracks', handleRestoreDemos);

    return () => {
      window.removeEventListener('add-web-track', handleAddWebTrack);
      window.removeEventListener('load-custom-tracks', handleLoadCustomTracks);
      window.removeEventListener('restore-demo-tracks', handleRestoreDemos);
    };
  }, []);

  // Playback control logic
  const handlePlay = () => {
    if (!currentTrack) return;
    setIsPlaying(true);
    audioRef.current?.play().catch(() => {
      // Handle auto-play policies gracefully
    });
  };

  const handlePause = () => {
    setIsPlaying(false);
    audioRef.current?.pause();
  };

  const handleStop = () => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setCurrentTime(0);
  };

  // Skip tracks mechanics
  const handleNext = () => {
    if (tracks.length === 0) return;

    if (playbackMode === 'shuffle') {
      const randomIndex = Math.floor(Math.random() * tracks.length);
      setCurrentIndex(randomIndex);
    } else {
      const nextIndex = (currentIndex + 1) % tracks.length;
      setCurrentIndex(nextIndex);
    }
    // Stay playing if we were playing
    setCurrentTime(0);
  };

  const handlePrev = () => {
    if (tracks.length === 0) return;

    if (playbackMode === 'shuffle') {
      const randomIndex = Math.floor(Math.random() * tracks.length);
      setCurrentIndex(randomIndex);
    } else {
      const prevIndex = (currentIndex - 1 + tracks.length) % tracks.length;
      setCurrentIndex(prevIndex);
    }
    setCurrentTime(0);
  };

  // Volume balance controls
  const handleVolumeChange = (vol: number) => {
    setVolume(vol);
    if (isMuted) {
      setIsMuted(false);
    }
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
  };

  const handleBalanceChange = (bal: number) => {
    setBalance(bal);
    // Real stereo panning gets handled in visualizer component using Standard Web Audio Nodes
    if (audioRef.current) {
      // In advanced browsers, we pan left or right
    }
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handlePlaybackModeToggle = () => {
    setPlaybackMode((curr) => {
      if (curr === 'linear') return 'repeat-one';
      if (curr === 'repeat-one') return 'repeat-all';
      return 'linear';
    });
  };

  const handleShuffleToggle = () => {
    setPlaybackMode((curr) => curr === 'shuffle' ? 'linear' : 'shuffle');
  };

  const handleMuteToggle = () => {
    const targetMuted = !isMuted;
    setIsMuted(targetMuted);
    if (audioRef.current) {
      audioRef.current.volume = targetMuted ? 0 : volume;
    }
  };

  // Upload tracks
  const handleAddFiles = (fileList: FileList) => {
    const uploadedTracks: Track[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(file.name)) {
        const cleanTitle = file.name.replace(/\.[^/.]+$/, "");
        uploadedTracks.push({
          id: 'user_file_' + Date.now() + '_' + i,
          title: cleanTitle,
          artist: 'File Locale',
          url: URL.createObjectURL(file),
          duration: 0,
          file: file
        });
      }
    }

    if (uploadedTracks.length > 0) {
      setTracks((current) => {
        const updated = [...current, ...uploadedTracks];
        if (current.length === 0) {
          setCurrentIndex(0);
        }
        return updated;
      });
    }
  };

  const handleAddFolder = (fileList: FileList) => {
    const folderTracks: Track[] = [];
    const filesArray = Array.from(fileList).filter((file) => 
      file.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(file.name)
    );

    // Sort files alphabetically to respect albums indices
    filesArray.sort((a, b) => a.name.localeCompare(b.name));

    filesArray.forEach((file, index) => {
      const cleanTitle = file.name.replace(/\.[^/.]+$/, "");
      folderTracks.push({
        id: 'user_folder_' + Date.now() + '_' + index,
        title: cleanTitle,
        artist: 'Cartella Audio',
        url: URL.createObjectURL(file),
        duration: 0,
        file: file
      });
    });

    if (folderTracks.length > 0) {
      setTracks((current) => {
        const updated = [...current, ...folderTracks];
        if (current.length === 0) {
          setCurrentIndex(0);
        }
        return updated;
      });
    }
  };

  const handleTrackSelect = (index: number) => {
    setCurrentIndex(index);
    setCurrentTime(0);
    // Auto play when selected from playlist
    setIsPlaying(true);
  };

  const handleRemoveTrack = (id: string) => {
    if (tracks.length <= 1) {
      // Clear entirely
      handleClearPlaylist();
      return;
    }

    setTracks((currentList) => {
      const updated = currentList.filter(t => t.id !== id);
      
      // Correct indexes
      if (currentIndex >= updated.length) {
        setCurrentIndex(updated.length - 1);
      }
      return updated;
    });
  };

  const handleClearPlaylist = () => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setTracks([]);
    setCurrentIndex(0);
    setCurrentTime(0);
    setDuration(0);
  };

  const handleReorderTracks = (startIndex: number, endIndex: number) => {
    setTracks((currentList) => {
      const result = [...currentList];
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);

      // Restore active tract index highlighting
      if (currentIndex === startIndex) {
        setCurrentIndex(endIndex);
      } else if (currentIndex > startIndex && currentIndex <= endIndex) {
        setCurrentIndex(currentIndex - 1);
      } else if (currentIndex < startIndex && currentIndex >= endIndex) {
        setCurrentIndex(currentIndex + 1);
      }

      return result;
    });
  };

  // Manage playlist items auto-advance on track completion
  const handleAudioEnded = () => {
    if (playbackMode === 'repeat-one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
    } else if (playbackMode === 'repeat-all') {
      const nextIndex = (currentIndex + 1) % tracks.length;
      setCurrentIndex(nextIndex);
      setCurrentTime(0);
    } else if (playbackMode === 'shuffle') {
      const randomIndex = Math.floor(Math.random() * tracks.length);
      setCurrentIndex(randomIndex);
      setCurrentTime(0);
    } else {
      // Regular sequential playing (linear)
      if (currentIndex < tracks.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setCurrentTime(0);
      } else {
        // Last song, stop playing
        setIsPlaying(false);
        setCurrentTime(0);
      }
    }
  };

  // Trigger play on track changes if standard play flag is active
  useEffect(() => {
    if (isPlaying && currentTrack) {
      audioRef.current?.play().catch(() => {
        // Handle blocked auto-play policies when page hasn't had user interaction
        setIsPlaying(false);
      });
    }
  }, [currentIndex, currentTrack]);

  // Handle skin changes & store choice
  const handleSkinSelect = (id: SkinId) => {
    setSelectedSkinId(id);
    localStorage.setItem('winamp_skin_choice', id);
  };

  const activeSkin = SKINS[selectedSkinId] || SKINS.classic;

  return (
    <div 
      className={`min-h-screen py-10 px-4 transition-colors duration-500 bg-linear-to-b ${
        selectedSkinId === 'synthwave' 
          ? 'from-[#0a0014] via-[#1a0033] to-[#04000b] text-pink-100' 
          : selectedSkinId === 'retro-gold' 
          ? 'from-[#2c1a11] via-[#1f100a] to-[#0d0502] text-amber-100' 
          : selectedSkinId === 'cyberpunk'
          ? 'from-[#000000] via-[#050f05] to-[#000000] text-green-300'
          : 'from-[#1e1e24] via-[#121215] to-[#08080a] text-neutral-300'
      }`}
      id="retro-player-main-root"
    >
      {/* Hidden layout audio controller */}
      {currentTrack && (
        <audio 
          ref={audioRef}
          src={currentTrack.url}
          crossOrigin="anonymous"
          preload="auto"
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onDurationChange={(e) => setDuration(e.currentTarget.duration)}
          onEnded={handleAudioEnded}
          id="winamp-audio-tag"
        />
      )}

      {/* Decorative stars / geometric grids based on active skin */}
      {selectedSkinId === 'synthwave' && (
        <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(1px_1px_at_20px_20px,#ffffff40,transparent_1px)] bg-[size:40px_40px] opacity-25 z-0" id="stars-grid-fx" />
      )}
      {selectedSkinId === 'cyberpunk' && (
        <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90.1deg,rgba(0,255,0,0.06),rgba(0,0,0,0),rgba(0,255,0,0.06))] bg-[size:100%_4px,6px_100%] opacity-40 z-0" id="matrix-crt-fx" />
      )}

      <div className="max-w-5xl mx-auto relative z-10 flex flex-col p-2 md:p-4" id="main-content-column">
        
        {/* Retro Bento Application Header */}
        <header className="flex flex-col sm:flex-row items-center justify-between slot-none mb-6 border-b border-white/5 pb-4 gap-4" id="branding-header">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#00FF41] rounded shadow-[0_0_15px_rgba(0,255,65,0.4)] flex items-center justify-center text-black font-extrabold text-sm italic select-none">W</div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white uppercase select-none flex items-center gap-1.5">
                WinAmp <span className="text-[#00FF41] font-mono text-xs font-semibold px-2 py-0.5 rounded-sm bg-neutral-900 border border-neutral-850">v5.92 Premium</span>
              </h1>
              <p className="text-[10px] text-zinc-500 font-mono" id="p-subsubtitle">
                Spettrometro interattivo, playlist manager e skins responsive
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3" id="header-metadata-controls">
            <div className="flex gap-1 text-[9px] font-mono select-none">
              <span className="border border-zinc-800 bg-zinc-950/40 text-gray-400 px-2 py-1 rounded-sm">128 KBPS</span>
              <span className="border border-zinc-800 bg-zinc-950/40 text-[#00FF41] px-2 py-1 rounded-sm">44.1 KHZ</span>
              <span className="border border-zinc-800 bg-zinc-950/40 text-emerald-400 px-2 py-1 rounded-sm hidden sm:inline">STEREO</span>
            </div>

            {/* Quick Modern Skin Dropper Selector */}
            <div className="flex items-center gap-2 bg-neutral-950/90 py-1 px-2.5 rounded-lg border border-zinc-850">
              <span className="text-[10px] uppercase font-bold text-zinc-500 font-mono select-none">SKIN:</span>
              <select 
                value={selectedSkinId} 
                onChange={(e) => handleSkinSelect(e.target.value as SkinId)}
                className="bg-transparent text-xs text-[#00FF41] font-mono border-none focus:ring-0 focus:outline-none cursor-pointer pr-1 py-0.5"
                id="skin-picker-select"
              >
                {Object.values(SKINS).map(s => (
                  <option key={s.id} value={s.id} className="bg-neutral-950 text-white font-mono">{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </header>

        {/* Outer Bento Grid Layout Chassis */}
        <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-5" id="winamp-bento-grid-outer">
          
          {/* Main Left Columns Area (Spans 8 columns on large viewports for deck and track control) */}
          <div className="md:col-span-8 space-y-5 flex flex-col justify-start" id="bento-left-body-deck">
            
            {/* Deck 1: Main Control Panel */}
            <ControlPanel 
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              playbackMode={playbackMode}
              volume={volume}
              balance={balance}
              currentTime={currentTime}
              duration={duration}
              isMuted={isMuted}
              skin={activeSkin}
              audioRef={audioRef}
              
              onPlay={handlePlay}
              onPause={handlePause}
              onStop={handleStop}
              onNext={handleNext}
              onPrev={handlePrev}
              onVolumeChange={handleVolumeChange}
              onBalanceChange={handleBalanceChange}
              onSeek={handleSeek}
              onPlaybackModeToggle={handlePlaybackModeToggle}
              onShuffleToggle={handleShuffleToggle}
              onMuteToggle={handleMuteToggle}
              onAddFiles={handleAddFiles}
              onAddFolder={handleAddFolder}
            />

            {/* Deck 2: Playlist & Equalizer Shelf */}
            <PlaylistManager 
              tracks={tracks}
              currentIndex={currentIndex}
              skin={activeSkin}
              playbackMode={playbackMode}
              onTrackSelect={handleTrackSelect}
              onRemoveTrack={handleRemoveTrack}
              onClearPlaylist={handleClearPlaylist}
              onReorderTracks={handleReorderTracks}
              onAddTracksFromFiles={handleAddFiles}
            />

          </div>

          {/* Right Column Area (Spans 4 columns for interactive equalizer grid block) */}
          <div className="md:col-span-4 h-full flex flex-col" id="bento-right-body-deck">
            {/* Graphic Equalizer Sidebar block */}
            <div 
              className={`p-5 rounded-2xl border transition-all duration-300 select-none h-full flex flex-col justify-between ${
                selectedSkinId === 'bento' 
                  ? 'bg-[#141414] border-white/5 shadow-xl shadow-black/80 text-gray-300' 
                  : `${activeSkin.bgClass} border-2`
              }`}
              id="equalizer-bento-card"
            >
              <div>
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-neutral-900">
                  <div className="flex items-center gap-2">
                    <Sliders className={`w-4 h-4 ${selectedSkinId === 'bento' ? 'text-[#00FF41]' : 'text-neutral-400'}`} />
                    <span className={`text-xs uppercase font-extrabold tracking-widest ${activeSkin.textTitleClass}`}>EQUALIZER</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button 
                      onClick={() => setEqOn(!eqOn)}
                      className={`px-2 py-0.5 rounded text-[9px] font-mono border cursor-pointer transition ${
                        eqOn 
                          ? 'bg-[#00FF41]/10 text-[#00FF41] border-[#00FF41]/40 font-bold' 
                          : 'bg-transparent text-zinc-650 border-zinc-800'
                      }`}
                    >
                      ON
                    </button>
                    <button 
                      onClick={() => setEqAuto(!eqAuto)}
                      className={`px-2 py-0.5 rounded text-[9px] font-mono border cursor-pointer transition ${
                        eqAuto 
                          ? 'bg-[#00FF41]/10 text-[#00FF41] border-[#00FF41]/40 font-bold' 
                          : 'bg-transparent text-zinc-650 border-zinc-800'
                      }`}
                    >
                      AUTO
                    </button>
                  </div>
                </div>

                {/* Preset selectors list */}
                <div className="mb-4">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-2 font-mono">PRESETS PREDEFINITI:</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {Object.keys(EQ_PRESETS).map((p) => (
                      <button
                        key={p}
                        onClick={() => {
                          setEqPreset(p);
                          setEqValues(EQ_PRESETS[p]);
                        }}
                        className={`text-[9px] py-1 px-1.5 rounded font-mono transition text-center truncate cursor-pointer uppercase ${
                          eqPreset === p
                            ? 'bg-[#00FF41] text-black font-extrabold'
                            : 'bg-[#0A0A0A] border border-white/5 text-gray-400 hover:text-white hover:border-zinc-700'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Visual sliders block */}
                <div className="grid grid-cols-6 gap-2 pt-3 pb-3 h-44 items-end bg-[#070707] px-3.5 py-2.5 rounded-xl border border-white/5 shadow-inner">
                  {Object.entries(eqValues).map(([band, val]) => {
                    const numVal = val as number;
                    return (
                      <div key={band} className="flex flex-col items-center justify-end h-full relative group">
                        {/* DB tooltip feedback label */}
                        <span className="text-[8px] font-mono text-zinc-500 group-hover:text-[#00FF41] transition-all mb-1 select-none">
                          {eqOn ? `${Math.round((numVal - 50) / 4.1)}dB` : '0dB'}
                        </span>
                        <div className="w-1.5 flex-1 bg-neutral-900 rounded-full relative overflow-hidden flex items-end">
                          <div 
                            className="w-full rounded-full transition-all duration-100"
                            style={{ 
                              height: `${eqOn ? numVal : 50}%`,
                              backgroundColor: selectedSkinId === 'bento' ? '#00FF41' : activeSkin.visualizerColor 
                            }}
                          />
                          <input 
                            type="range"
                            min="0"
                            max="100"
                            value={eqOn ? numVal : 50}
                            disabled={!eqOn}
                            onChange={(e) => {
                              const newVal = parseInt(e.target.value);
                              setEqValues(prev => ({
                                ...prev,
                                [band]: newVal
                              }));
                              setEqPreset('Custom');
                            }}
                            className="absolute inset-x-[-8px] inset-y-0 opacity-0 cursor-ns-resize h-full w-auto"
                          />
                        </div>
                        <span className="text-[9px] font-mono font-bold mt-2 text-zinc-400 group-hover:text-white transition-colors">{band}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick info status line */}
              <div className="mt-4 pt-4 border-t border-neutral-900/40 flex justify-between items-center text-[10px] font-mono text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${eqOn ? 'bg-[#00FF41] animate-pulse shadow-[0_0_5px_#00FF41]' : 'bg-red-950 border border-red-500'}`} />
                  {eqOn ? 'EQ DSP ONLINE' : 'EQ BYPASS'}
                </span>
                <span className="text-zinc-650 tracking-tighter">OCTAVE EQUALIZZATO</span>
              </div>
            </div>
          </div>

        </div>

        {/* Retro Tips & Model details footer box */}
        <div 
          className="mt-8 max-w-2xl w-full p-4 bg-black/30 border border-neutral-900 rounded-lg text-xs font-mono space-y-2 text-neutral-500 shrink-0"
          id="help-tips-footer-card"
        >
          <div className="flex items-center gap-1.5 font-bold text-neutral-400" id="tips-box-header">
            <Info className="w-4 h-4 text-emerald-500" />
            <span>ISTRUZIONI E CONSIGLI UTILI</span>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-[11px] leading-relaxed" id="tips-ordered-list">
            <li>
              <strong className="text-neutral-400">Carica Cartelle Intere:</strong> Clicca sul pulsante <code className="bg-neutral-900 px-1 py-0.2 rounded text-neutral-300">+ Cartella</code> per caricare un'intera cartella locale dal tuo PC! L'app organizzerà i brani in ordine alfabetico.
            </li>
            <li>
              <strong className="text-neutral-400">Click sul Timer LED:</strong> Clicca sulle cifre verdi fluorescenti del timer per alternare tra tempo trascorso di riproduzione e tempo rimasto alla fine del brano.
            </li>
            <li>
              <strong className="text-neutral-400">Spettrometro Interattivo:</strong> Clicca direttamente sopra lo schermo del visualizzatore audio (spettrometro) per variare modalità di analisi tra Spettro di frequenze (Winamp classic), Oscilloscopio a onde o Nebula Orbitale!
            </li>
            <li>
              <strong className="text-neutral-400">Salva Playlist:</strong> Puoi salvare le tue code di riproduzione preferite digitando un nome e facendo clic su Salva. Le playlist rimarranno memorizzate nel browser per la prossima volta.
            </li>
          </ul>
        </div>

        {/* Nostalgic status footer badge */}
        <div className="mt-10 mb-4 text-center select-none" id="copyright-footer-ribbon">
          <div className="text-[10px] font-mono text-neutral-600 flex items-center justify-center gap-1" id="footer-greetings">
            <span>RetroPlayer model 5.92</span>
            <span>•</span>
            <span>Sviluppato con amore in Italia</span>
            <Heart className="w-3 h-3 text-red-700 animate-pulse fill-red-700" />
          </div>
        </div>

      </div>
    </div>
  );
}
