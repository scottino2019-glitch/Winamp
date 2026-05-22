export interface Track {
  id: string;
  title: string;
  artist: string;
  url: string;
  duration: number; // in seconds, 0 if unknown
  file?: File;      // optional file object if uploaded locally
}

export type PlaybackMode = 'linear' | 'shuffle' | 'repeat-one' | 'repeat-all';

export type SkinId = 'classic' | 'synthwave' | 'retro-gold' | 'cyberpunk' | 'bento';

export interface Skin {
  id: SkinId;
  name: string;
  bgClass: string;          // Main background of the windows
  borderClass: string;      // Border colors/styles
  textTitleClass: string;   // Color for the active headers/text titles
  textLedsClass: string;    // Styled LED color (green, neon pink, gold, green)
  textNormalClass: string;  // Normal text styling
  visualizerColor: string;  // Canvas visualization colors
  visualizerPeakColor: string;
  accentClass: string;      // Button background hover states or sliders
  sliderBg: string;         // Track background for sliders
  thumbClass: string;       // Custom thumb style for ranges
  playlistActiveBg: string; // Dynamic highlight in playlist
}

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
}
