import React, { useState, useEffect } from 'react';
import { 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Search, 
  Music, 
  Save, 
  FolderDown, 
  Play, 
  Plus, 
  Sparkles,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { Track, Skin, Playlist } from '../types.ts';

interface PlaylistManagerProps {
  tracks: Track[];
  currentIndex: number;
  skin: Skin;
  playbackMode: string;
  onTrackSelect: (index: number) => void;
  onRemoveTrack: (id: string) => void;
  onClearPlaylist: () => void;
  onReorderTracks: (startIndex: number, endIndex: number) => void;
  onAddTracksFromFiles: (files: FileList) => void;
}

export default function PlaylistManager({
  tracks,
  currentIndex,
  skin,
  playbackMode,
  onTrackSelect,
  onRemoveTrack,
  onClearPlaylist,
  onReorderTracks,
  onAddTracksFromFiles,
}: PlaylistManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [playlistNameInput, setPlaylistNameInput] = useState('');
  const [savedPlaylists, setSavedPlaylists] = useState<Playlist[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Load saved playlists from localStorage on mount
  useEffect(() => {
    const loaded = localStorage.getItem('winamp_saved_playlists');
    if (loaded) {
      try {
        setSavedPlaylists(JSON.parse(loaded));
      } catch (e) {
        console.error('Error loading playlists', e);
      }
    }
  }, []);

  // Save playlist to localStorage
  const handleSavePlaylist = () => {
    if (!playlistNameInput.trim()) return;
    if (tracks.length === 0) return;

    // We store partial URLs or metadata, files can't be deep serialized so we save URL/Title
    const cleanTracksToSave = tracks.map(track => ({
      id: track.id,
      title: track.title,
      artist: track.artist,
      url: track.file ? '' : track.url, // files can't be loaded back after page refresh unless re-uploaded
      duration: track.duration,
      // Note: we can flag file-source tracks as local so that the user knows they need re-upload
    }));

    const newPlaylist: Playlist = {
      id: 'pl_' + Date.now(),
      name: playlistNameInput.trim(),
      tracks: cleanTracksToSave,
    };

    const updated = [...savedPlaylists, newPlaylist];
    setSavedPlaylists(updated);
    localStorage.setItem('winamp_saved_playlists', JSON.stringify(updated));
    setPlaylistNameInput('');
  };

  const handleDeleteSavedPlaylist = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedPlaylists.filter(pl => pl.id !== id);
    setSavedPlaylists(updated);
    localStorage.setItem('winamp_saved_playlists', JSON.stringify(updated));
  };

  const handleLoadSavedPlaylist = (playlist: Playlist) => {
    // Dispatch custom event to App to load these tracks
    const event = new CustomEvent('load-custom-tracks', { detail: playlist.tracks });
    window.dispatchEvent(event);
  };

  const moveTrack = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= tracks.length) return;
    onReorderTracks(index, targetIndex);
  };

  // Drag-and-drop file upload receivers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onAddTracksFromFiles(e.dataTransfer.files);
    }
  };

  // Filtered tracks based on query
  const filteredTracksWithOriginalIndex = tracks
    .map((track, originalIndex) => ({ track, originalIndex }))
    .filter(item => 
      item.track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.track.artist.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const formatTrackDuration = (secs: number) => {
    if (!secs || isNaN(secs) || secs === Infinity) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className={`p-4 rounded-md flex flex-col transition-all h-[420px] ${skin.bgClass}`}
      id="playlist-manager-box"
    >
      {/* Header bar */}
      <div className="flex justify-between items-center mb-3 pb-1 border-b border-white/10" id="playlist-header">
        <div className="flex items-center gap-1.5">
          <Music className={`w-4 h-4 ${skin.id === 'synthwave' ? 'text-pink-400' : 'text-neutral-400'}`} />
          <span className={skin.textTitleClass}>EDITOR PLAYLIST</span>
        </div>
        <span className="text-[10px] uppercase font-mono text-neutral-500" id="playlist-tracks-count">
          {tracks.length} {tracks.length === 1 ? 'Brano' : 'Brani'} caricati
        </span>
      </div>

      {/* Drag & Drop Overlay / Banner Zone */}
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border border-dashed rounded flex flex-col flex-1 min-h-0 ${
          isDragging 
            ? 'border-green-500 bg-green-950/20 shadow-[0_0_10px_rgba(34,197,94,0.3)]' 
            : 'border-neutral-800 bg-black/50'
        }`}
        id="playlist-drag-drop-zone"
      >
        
        {/* Search bar inside editor box */}
        <div className="p-2 border-b border-neutral-900 bg-black/70 flex items-center justify-between" id="search-bar-row">
          <div className="relative flex-1" id="search-input-container">
            <Search className="absolute left-2 top-2 w-3.5 h-3.5 text-neutral-500" />
            <input 
              type="text" 
              placeholder="Cerca un brano nella playlist..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-950 text-white rounded text-xs pl-8 pr-3 py-1.5 border border-neutral-800 focus:outline-none focus:border-green-500/50"
              id="search-tracks-textfield"
            />
          </div>
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="ml-2 text-xs text-neutral-500 hover:text-white underline cursor-pointer"
              id="clear-search-btn"
            >
              Annulla
            </button>
          )}
        </div>

        {/* Scrollable Track Queue */}
        <div 
          className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent select-none custom-audio-scrollbar"
          style={{ contentVisibility: 'auto' }}
          id="winamp-tracks-queue"
        >
          {filteredTracksWithOriginalIndex.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-xs p-6" id="empty-playlist-view">
              <span className={`text-[11px] font-mono leading-relaxed mb-2 opacity-50 ${skin.id === 'cyberpunk' ? 'text-green-600' : 'text-neutral-400'}`}>
                {isDragging ? 'Rilascia qui i file!' : 'La playlist è vuota.'}
              </span>
              {!isDragging && (
                <div className="text-[10px] text-neutral-500 font-serif leading-normal max-w-xs" id="empty-playlist-instructions">
                  Trascina e rilascia qui file MP3/WAV o intere cartelle musicali, oppure usa i pulsanti di upload in alto.
                </div>
              )}
            </div>
          ) : (
            filteredTracksWithOriginalIndex.map(({ track, originalIndex }) => {
              const remainsSelected = originalIndex === currentIndex;
              return (
                <div 
                  key={track.id}
                  onClick={() => onTrackSelect(originalIndex)}
                  className={`p-1.5 flex items-center justify-between group rounded transition cursor-pointer text-xs ${
                    remainsSelected 
                      ? skin.playlistActiveBg 
                      : 'hover:bg-neutral-900 text-neutral-300'
                  }`}
                  id={`track-item-row-${track.id}`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1" id="track-item-details">
                    <span className="font-mono text-[10px] text-neutral-500 w-5 text-right font-semibold" id="track-item-num">
                      {originalIndex + 1}.
                    </span>
                    <div className="truncate flex-1 font-mono" id="track-item-text">
                      <span className="font-bold mr-1" id="track-item-artist">
                        {track.artist}:
                      </span>
                      <span id="track-item-title">{track.title}</span>
                      {track.file && (
                        <span className="ml-1.5 px-1 py-0.2 bg-neutral-800 text-neutral-400 rounded text-[8px] font-mono select-none" id="track-item-tag-local">
                          LOCALE
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e=>e.stopPropagation()} id="track-item-quick-actions">
                    <button 
                      onClick={() => onTrackSelect(originalIndex)} 
                      className="p-1 hover:text-green-500 rounded cursor-pointer hover:bg-black/50" 
                      title="Riproduci traccia"
                      id="track-play-shortcut"
                    >
                      <Play className="w-3 h-3 fill-current" />
                    </button>
                    <button 
                      onClick={() => moveTrack(originalIndex, 'up')} 
                      disabled={originalIndex === 0}
                      className="p-1 hover:text-amber-500 rounded cursor-pointer hover:bg-black/50 disabled:opacity-30 disabled:pointer-events-none" 
                      title="Sposta Su"
                      id="track-move-up-shortcut"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => moveTrack(originalIndex, 'down')} 
                      disabled={originalIndex === tracks.length - 1}
                      className="p-1 hover:text-amber-500 rounded cursor-pointer hover:bg-black/50 disabled:opacity-30 disabled:pointer-events-none" 
                      title="Sposta Giù"
                      id="track-move-down-shortcut"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => onRemoveTrack(track.id)} 
                      className="p-1 hover:text-red-500 rounded cursor-pointer hover:bg-black/50" 
                      title="Rimuovi dalla playlist"
                      id="track-remove-shortcut"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Desktop Static view Duration */}
                  <span className="font-mono text-[10px] ml-2 text-neutral-500 group-hover:hidden select-none" id="track-item-fixed-duration">
                    {formatTrackDuration(track.duration)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Playlist Actions toolbar */}
      <div className="mt-2 text-[10px] font-mono grid grid-cols-2 md:grid-cols-4 gap-2 border-t border-neutral-900 pt-2" id="playlist-aux-actions">
        <button
          onClick={onClearPlaylist}
          disabled={tracks.length === 0}
          className={`py-1 rounded text-center cursor-pointer transition flex items-center justify-center gap-1 bg-red-950/20 border border-red-900/40 text-red-400 hover:bg-red-950/40 disabled:opacity-35`}
          title="Ripristina e svuota la playlist corrente"
          id="clear-queue-cmd"
        >
          <Trash2 className="w-3 h-3" />
          <span>Svuota Lista</span>
        </button>

        {/* Dynamic event trigger custom mock tracks */}
        <button
          onClick={() => {
            const ev = new CustomEvent('restore-demo-tracks');
            window.dispatchEvent(ev);
          }}
          className={`py-1 rounded text-center cursor-pointer transition flex items-center justify-center gap-1 ${skin.accentClass}`}
          title="Carica le tracce Synthwave demo precaricate"
          id="load-demo-cmd"
        >
          <RefreshCw className="w-3 h-3 animate-spin" style={{ animationDuration: '6s' }} />
          <span>Tracce Demo</span>
        </button>

        <div className="col-span-2 flex gap-1 items-center" id="save-playlist-form-wrapper">
          <input 
            type="text" 
            placeholder="Nome Playlist..." 
            value={playlistNameInput}
            onChange={(e) => setPlaylistNameInput(e.target.value)}
            disabled={tracks.length === 0}
            className="flex-1 bg-black text-white text-[9.5px] p-1 rounded border border-neutral-800 disabled:opacity-40 focus:outline-none focus:border-green-500/50"
            id="save-playlist-name-field"
          />
          <button
            onClick={handleSavePlaylist}
            disabled={!playlistNameInput.trim() || tracks.length === 0}
            className={`py-1 px-2.5 rounded cursor-pointer flex items-center justify-center gap-1 bg-green-950/40 border border-green-900/50 text-green-400 hover:bg-green-900/20 disabled:opacity-35`}
            title="Salva questa playlist in memoria sul browser"
            id="save-cur-playlist-btn"
          >
            <Save className="w-3 h-3" />
            <span>Salva</span>
          </button>
        </div>
      </div>

      {/* LocalStorage Memory Playlists Shelf */}
      {savedPlaylists.length > 0 && (
        <div className="mt-3 border-t border-neutral-900 pt-2" id="saved-playlists-shelf">
          <div className="text-[8px] uppercase tracking-wider text-neutral-500 mb-1 font-mono font-bold" id="saved-shelf-title">
            PLAYLIST SALVATE NEL BROWSER ({savedPlaylists.length})
          </div>
          <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1 max-h-[80px]" id="saved-lists-container">
            {savedPlaylists.map(pl => (
              <div 
                key={pl.id}
                onClick={() => handleLoadSavedPlaylist(pl)}
                className="py-1 px-2 rounded bg-neutral-950 hover:bg-neutral-900 text-neutral-300 flex items-center gap-1.5 cursor-pointer border border-neutral-800 hover:border-neutral-700 font-mono text-[9px] select-none group/pill relative"
                title={`Carica ${pl.name} (${pl.tracks.length} brani)`}
                id={`saved-playlist-pill-${pl.id}`}
              >
                <FolderOpen className="w-2.5 h-2.5 text-amber-500" />
                <span className="truncate max-w-[80px] font-bold">{pl.name}</span>
                <span className="text-[8px] text-neutral-500 font-mono">({pl.tracks.length})</span>
                <button
                  onClick={(e) => handleDeleteSavedPlaylist(pl.id, e)}
                  className="ml-1 opacity-0 group-hover/pill:opacity-100 hover:text-red-500 p-0.2"
                  title="Elimina playlist salvata"
                  id={`saved-list-delete-shortcut-${pl.id}`}
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
