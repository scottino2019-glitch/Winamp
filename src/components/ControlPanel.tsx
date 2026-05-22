import React, { useEffect, useRef, useState } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  SkipBack, 
  SkipForward, 
  FolderOpen, 
  Volume2, 
  VolumeX, 
  RefreshCcw, 
  Shuffle, 
  Maximize2,
  FolderUp,
  Sliders,
  Sparkles
} from 'lucide-react';
import { Track, PlaybackMode, Skin } from '../types.ts';
import Visualizer from './Visualizer.tsx';

interface ControlPanelProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  playbackMode: PlaybackMode;
  volume: number;
  balance: number; // -1 (left) to 1 (right)
  currentTime: number;
  duration: number;
  isMuted: boolean;
  skin: Skin;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onNext: () => void;
  onPrev: () => void;
  onVolumeChange: (vol: number) => void;
  onBalanceChange: (bal: number) => void;
  onSeek: (time: number) => void;
  onPlaybackModeToggle: () => void; // Cycles repeat modes
  onShuffleToggle: () => void;
  onMuteToggle: () => void;
  onAddFiles: (files: FileList) => void;
  onAddFolder: (files: FileList) => void;
}

export default function ControlPanel({
  currentTrack,
  isPlaying,
  playbackMode,
  volume,
  balance,
  currentTime,
  duration,
  isMuted,
  skin,
  audioRef,
  
  onPlay,
  onPause,
  onStop,
  onNext,
  onPrev,
  onVolumeChange,
  onBalanceChange,
  onSeek,
  onPlaybackModeToggle,
  onShuffleToggle,
  onMuteToggle,
  onAddFiles,
  onAddFolder,
}: ControlPanelProps) {
  const [timeMode, setTimeMode] = useState<'elapsed' | 'remaining'>('elapsed');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  
  // Format seconds to MM:SS
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs === Infinity) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getDisplayTime = () => {
    if (timeMode === 'elapsed') {
      return formatTime(currentTime);
    } else {
      const remaining = Math.max(0, duration - currentTime);
      return `-${formatTime(remaining)}`;
    }
  };

  // Marquee scrolling effect for current track title
  const [marqueeOffset, setMarqueeOffset] = useState(0);
  const titleText = currentTrack 
    ? `*** RIPRODUZIONE: ${currentTrack.title.toUpperCase()} di ${currentTrack.artist.toUpperCase()} - ${currentTrack.file ? 'FILE LOCALE' : 'DIGITAL STREAM'} *** ` 
    : '*** WINAMP 2026: CARICA TRACCE O CARTELLE PER INIZIARE ***';

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setMarqueeOffset((prev) => (prev + 1) % (titleText.length * 8));
    }, 120);
    return () => clearInterval(interval);
  }, [isPlaying, titleText]);

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSeek(parseFloat(e.target.value));
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onVolumeChange(parseFloat(e.target.value));
  };

  const handleBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onBalanceChange(parseFloat(e.target.value));
  };

  const handleEjectClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFiles(e.target.files);
    }
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFolder(e.target.files);
    }
  };

  const triggerFolderUpload = () => {
    folderInputRef.current?.click();
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;

    // Create a virtual file mock track or handle directly
    const newTrack: Track = {
      id: 'url_' + Date.now(),
      title: customTitle.trim() || 'Custom Network Stream',
      artist: 'Web Stream',
      url: customUrl.trim(),
      duration: 0
    };

    // We can emit this via mimicking file addition
    if (audioRef.current) {
      // Just inject it into the track array by invoking a custom event or callback
      // We will handle this nicely in custom storage
      const event = new CustomEvent('add-web-track', { detail: newTrack });
      window.dispatchEvent(event);
    }

    setCustomUrl('');
    setCustomTitle('');
    setShowUrlInput(false);
  };

  // Generate dynamic stats simulating bitrates
  const simulatedKbps = currentTrack ? (currentTrack.file ? '320' : '192') : '---';
  const simulatedKhz = currentTrack ? '44' : '--';

  return (
    <div 
      className={`p-4 rounded-md transition-all select-none ${skin.bgClass}`}
      id="winamp-main-control-panel"
    >
      {/* Invisible inputs */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        multiple 
        accept="audio/*" 
        className="hidden" 
        id="winamp-file-uploader"
      />
      <input 
        type="file" 
        ref={folderInputRef} 
        onChange={handleFolderChange} 
        multiple 
        // @ts-ignore
        webkitdirectory="true"
        directory="true" 
        className="hidden" 
        id="winamp-folder-uploader"
      />

      {/* Retro Header Bar */}
      <div 
        className={`flex justify-between items-center mb-3 pb-1 border-b border-white/10`}
        id="control-panel-header"
      >
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" id="winamp-status-dot"></div>
          <span className={`tracking-widest capitalize ${skin.textTitleClass}`} id="winamp-title-span">
            WINAMP <span className="text-[10px] font-mono opacity-60">v5.92</span>
          </span>
        </div>
        <div className="flex gap-1" id="window-decorative-controls">
          <div className="w-2.5 h-2.5 bg-neutral-600 border border-neutral-500 rounded-sm cursor-pointer hover:bg-neutral-500" title="Riduci a icona"></div>
          <div className="w-2.5 h-2.5 bg-neutral-600 border border-neutral-500 rounded-sm cursor-pointer hover:bg-neutral-500" title="Ingrandisci"></div>
          <button 
            onClick={onStop}
            className="w-2.5 h-2.5 bg-red-800 border border-red-700 rounded-sm cursor-pointer hover:bg-red-600" 
            title="Chiudi"
          ></button>
        </div>
      </div>

      {/* Main Panel Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4" id="main-panel-grid">
        
        {/* Left Column: LCD Metrics & Sliders (7 Cols) */}
        <div className="md:col-span-7 flex flex-col justify-between space-y-3" id="panel-left-column">
          
          {/* LCD Panel Display */}
          <div 
            className="p-3 bg-black/95 rounded border border-neutral-800 flex justify-between items-center relative"
            id="winamp-lcd-display"
          >
            {/* LED Time Display */}
            <div 
              className="cursor-pointer flex flex-col select-none"
              onClick={() => setTimeMode(p => p === 'elapsed' ? 'remaining' : 'elapsed')}
              title={`Clicca per vedere il tempo ${timeMode === 'elapsed' ? 'rimanente' : 'trascorso'}`}
              id="led-time-toggle"
            >
              <span className="text-[8px] uppercase tracking-wider text-neutral-500 font-mono" id="time-mode-lbl">
                {timeMode === 'elapsed' ? 'Tempo Trascorso' : 'Tempo Rimanente'}
              </span>
              <span className={`text-3xl font-mono leading-none ${skin.textLedsClass}`} id="led-clock-digits">
                {getDisplayTime()}
              </span>
            </div>

            {/* Simulated Digital LED Pixels (O-Mono-Stereo) */}
            <div className="flex flex-col items-end justify-between self-stretch text-[9px] font-mono" id="simulated-led-pixels">
              <div className="flex gap-1.5 items-center bg-black px-1.5 py-0.5 rounded border border-neutral-900" id="kbps-khz-display">
                <span className="text-[#39ff14]/70">{simulatedKbps} <span className="text-[7px] text-neutral-500">kbps</span></span>
                <span className="text-amber-500/70">{simulatedKhz} <span className="text-[7px] text-neutral-500">kHz</span></span>
              </div>
              <div className="flex gap-1 mt-1 text-[8px]" id="stereo-mono-pills">
                <span className={`px-1 rounded-sm ${currentTrack ? 'text-green-400 bg-green-950/40 border border-green-500/20' : 'text-neutral-700 bg-neutral-950 border border-transparent'}`}>ST</span>
                <span className={`px-1 rounded-sm ${!currentTrack ? 'text-green-500 bg-green-950/20' : 'text-neutral-700'}`}>MO</span>
              </div>
            </div>
          </div>

          {/* Title Marquee Slider */}
          <div 
            className="bg-black/90 p-1.5 h-8 rounded border border-neutral-800 overflow-hidden relative flex items-center"
            id="title-marquee-window"
          >
            <div 
              className={`${skin.textLedsClass} text-xs uppercase font-mono whitespace-nowrap absolute select-none duration-75`}
              style={{
                transform: `translateX(${-marqueeOffset}px)`,
                minWidth: '100%',
              }}
              id="title-marquee-element"
            >
              {titleText}{titleText}
            </div>
          </div>

          {/* Sliders Area (Volume & Balance) */}
          <div className="grid grid-cols-2 gap-3" id="sliders-controls-grid">
            {/* Volume */}
            <div className="flex flex-col" id="volume-slider-container">
              <div className="flex justify-between items-center text-[10px] font-mono text-neutral-400 mb-1">
                <span className="flex items-center gap-1">
                  {isMuted || volume === 0 ? <VolumeX className="w-3 h-3 text-red-500" /> : <Volume2 className="w-3 h-3 text-green-500" />}
                  VOL: {isMuted ? 'Muto' : Math.round(volume * 100) + '%'}
                </span>
                <button 
                  onClick={onMuteToggle} 
                  className="text-[9px] hover:text-white underline cursor-pointer"
                  id="mute-toggle-btn"
                >
                  {isMuted ? 'Unmute' : 'Muto'}
                </button>
              </div>
              <div className={`p-1 rounded ${skin.sliderBg}`} id="volume-slider-bar">
                <input 
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className={`w-full h-2 rounded cursor-pointer ${skin.thumbClass}`}
                  style={{ background: 'linear-gradient(to right, #22c55e, #eab308, #ef4444)' }}
                  id="volume-range-input"
                />
              </div>
            </div>

            {/* Balance */}
            <div className="flex flex-col" id="balance-slider-container">
              <div className="flex justify-between items-center text-[10px] font-mono text-neutral-400 mb-1">
                <span>BILANCIAMENTO (L/R)</span>
                <span>
                  {balance === 0 ? 'C' : balance < 0 ? `L${Math.round(Math.abs(balance) * 100)}` : `R${Math.round(balance * 100)}`}
                </span>
              </div>
              <div className={`p-1 rounded ${skin.sliderBg}`} id="balance-slider-bar">
                <input 
                  type="range"
                  min="-1"
                  max="1"
                  step="0.1"
                  value={balance}
                  onChange={handleBalanceChange}
                  className={`w-full h-2 rounded cursor-pointer ${skin.thumbClass}`}
                  style={{ background: 'linear-gradient(to right, #ef4444, #eab308, #ef4444)' }}
                  id="balance-range-input"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Audio Visualizer & Sub controls (5 Cols) */}
        <div className="md:col-span-5 flex flex-col justify-between space-y-3" id="panel-right-column">
          {/* Interactive Visualizer Canvas */}
          <Visualizer 
            audioRef={audioRef} 
            isPlaying={isPlaying} 
            skin={skin}
            volume={volume}
          />

          {/* Quick Loading Utility Boxes */}
          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono" id="folder-import-quick-buttons">
            <button
              onClick={handleEjectClick}
              className={`py-1.5 px-2 rounded flex items-center justify-center gap-1.5 text-center cursor-pointer font-semibold shadow-inner ${skin.accentClass}`}
              title="Carica singoli file audio locali"
              id="upload-files-cmd"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>+ Files</span>
            </button>
            <button
              onClick={triggerFolderUpload}
              className={`py-1.5 px-2 rounded flex items-center justify-center gap-1.5 text-center cursor-pointer font-semibold shadow-inner ${skin.accentClass}`}
              title="Carica un'intera cartella locale con file musicali"
              id="upload-folder-cmd"
            >
              <FolderUp className="w-3.5 h-3.5" />
              <span>+ Cartella</span>
            </button>
          </div>

          <button
            onClick={() => setShowUrlInput(!showUrlInput)}
            className={`w-full py-1 text-center rounded border border-neutral-700/60 transition bg-black/40 hover:bg-black/60 cursor-pointer ${skin.textNormalClass} text-[9px] flex items-center justify-center gap-1`}
            id="url-stream-dialog-trigger"
          >
            <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
            <span>Aggiungi Stream Audio URL o Traccia Web</span>
          </button>
        </div>

      </div>

      {/* Network Stream Loader Popup Form */}
      {showUrlInput && (
        <form 
          onSubmit={handleUrlSubmit} 
          className="mt-3 p-3 bg-neutral-980/90 border border-amber-500/50 rounded-md text-xs font-mono space-y-2"
          id="custom-stream-loader-popup"
        >
          <div className="text-[10px] text-amber-500 font-bold uppercase" id="popup-title">INSERISCI STREAM DIGITAL WEB</div>
          <div className="flex flex-col gap-1" id="custom-title-row">
            <label className="text-[9px] text-neutral-400">Titolo Traccia:</label>
            <input 
              type="text" 
              placeholder="E.g., Synthwave Chillwave Beats" 
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="bg-black text-white p-1 rounded border border-neutral-700 focus:outline-none focus:border-green-500 text-xs w-full"
              id="stream-title-text-field"
            />
          </div>
          <div className="flex flex-col gap-1" id="custom-url-row">
            <label className="text-[9px] text-neutral-400">Indirizzo URL Audio (MP3/WAV/etc.):</label>
            <input 
              type="url" 
              placeholder="https://server.com/musica.mp3" 
              required
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              className="bg-black text-white p-1 rounded border border-neutral-700 focus:outline-none focus:border-green-500 text-xs w-full"
              id="stream-url-text-field"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1" id="popup-actions-row">
            <button 
              type="button" 
              onClick={() => setShowUrlInput(false)}
              className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 cursor-pointer text-neutral-300 transform active:scale-95 text-[10px]"
              id="cancel-stream-loader"
            >
              Annulla
            </button>
            <button 
              type="submit" 
              className="px-2 py-1 rounded bg-green-700 hover:bg-green-600 text-white cursor-pointer transform active:scale-95 text-[10px]"
              id="submit-stream-loader"
            >
              Aggiungi
            </button>
          </div>
        </form>
      )}

      {/* Seek/Track Progress Slider bar (Full Width) */}
      <div className="mt-4" id="seek-bar-section">
        <div className="flex justify-between items-center text-[10px] font-mono text-neutral-400 mb-1">
          <span>PROGRESSO TRACCIA</span>
          <span className="bg-black/40 px-1 py-0.5 rounded text-[9px] font-mono text-neutral-300">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
        <div className={`p-1.5 rounded relative flex items-center ${skin.sliderBg}`} id="seek-bar-wrapper">
          {/* Styled progress ticks background */}
          <div className="absolute inset-x-3 flex justify-between pointer-events-none opacity-20" id="seek-ticks">
            {Array(15).fill(0).map((_, i) => (
              <div key={i} className="w-0.5 h-1.5 bg-white" />
            ))}
          </div>
          <input 
            type="range"
            min="0"
            max={duration || 100}
            step="0.1"
            value={currentTime}
            onChange={handleSeekChange}
            disabled={!currentTrack}
            className={`w-full h-2 rounded cursor-pointer relative z-10 disabled:opacity-30 ${skin.thumbClass}`}
            style={{
              background: `linear-gradient(to right, ${skin.visualizerColor} ${duration ? (currentTime / duration) * 100 : 0}%, #232326 0%)`
            }}
            id="track-playback-seeker"
          />
        </div>
      </div>

      {/* Main Playback Audio Keys (Controls Deck) */}
      <div 
        className="mt-4 p-2 bg-black/40 rounded border border-neutral-800/60 flex flex-wrap justify-between items-center gap-2"
        id="playback-key-controls"
      >
        {/* Buttons Grid */}
        <div className="flex items-center gap-1.5" id="deck-left-controls">
          <button
            onClick={onPrev}
            className={`p-2 rounded cursor-pointer transition shadow border border-black/80 hover:scale-105 active:scale-95 ${skin.accentClass}`}
            title="Traccia precedente"
            id="prev-btn"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          
          <button
            onClick={onPlay}
            className={`p-2 rounded cursor-pointer transition shadow border border-black/80 hover:scale-105 active:scale-95 ${
              isPlaying ? 'bg-green-600 hover:bg-green-500 text-white shadow-green-500/50' : skin.accentClass
            }`}
            title="Riproduci"
            id="play-btn"
          >
            <Play className="w-4 h-4 fill-current" />
          </button>

          <button
            onClick={onPause}
            className={`p-2 rounded cursor-pointer transition shadow border border-black/80 hover:scale-105 active:scale-95 ${
              !isPlaying && currentTime > 0 && currentTrack ? 'bg-yellow-600 hover:bg-yellow-500 text-white' : skin.accentClass
            }`}
            title="Pausa"
            id="pause-btn"
          >
            <Pause className="w-4 h-4" />
          </button>

          <button
            onClick={onStop}
            className={`p-2 rounded cursor-pointer transition shadow border border-black/80 hover:scale-105 active:scale-95 ${skin.accentClass}`}
            title="Ferma"
            id="stop-btn"
          >
            <Square className="w-4 h-4 fill-current" />
          </button>

          <button
            onClick={onNext}
            className={`p-2 rounded cursor-pointer transition shadow border border-black/80 hover:scale-105 active:scale-95 ${skin.accentClass}`}
            title="Traccia successiva"
            id="next-btn"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <button
            onClick={handleEjectClick}
            className={`p-2 rounded cursor-pointer transition shadow border border-black/80 hover:scale-105 active:scale-95 ${skin.accentClass}`}
            title="Carica File Locale (Eject)"
            id="eject-btn"
          >
            <FolderOpen className="w-4 h-4" />
          </button>
        </div>

        {/* Playback Settings Group (Repeat + Shuffle Toggle pills) */}
        <div className="flex items-center gap-2 font-mono text-xs" id="deck-right-toggles">
          {/* Repeat Mode Pill Button */}
          <button
            onClick={onPlaybackModeToggle}
            className={`px-2.5 py-1.5 rounded cursor-pointer flex items-center gap-1.5 uppercase transition font-bold select-none border border-black/80 ${
              playbackMode !== 'linear' 
                ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow shadow-orange-500/30' 
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
            }`}
            title="Cambia modalità di ripetizione (Lineare, Ripeti Traccia, Ripeti Tutto)"
            id="repeat-mode-pill"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            <span>
              {playbackMode === 'linear' && 'Normale'}
              {playbackMode === 'repeat-one' && 'Ripeti: 1'}
              {playbackMode === 'repeat-all' && 'Ripeti: Tutto'}
            </span>
          </button>

          {/* Shuffle Toggle Pill Button */}
          <button
            onClick={onShuffleToggle}
            className={`px-2.5 py-1.5 rounded cursor-pointer flex items-center gap-1.5 uppercase transition font-bold select-none border border-black/80 ${
              playbackMode === 'shuffle' 
                ? 'bg-gradient-to-r from-green-600 to-emerald-500 text-white shadow shadow-green-500/30 font-black' 
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
            }`}
            title="Attiva/Disattiva Shuffle (Riproduzione casuale)"
            id="shuffle-mode-pill"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Shuffle</span>
          </button>
        </div>
      </div>
    </div>
  );
}
