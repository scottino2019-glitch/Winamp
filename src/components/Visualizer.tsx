import React, { useEffect, useRef, useState } from 'react';
import { Skin } from '../types.ts';

interface VisualizerProps {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  skin: Skin;
  volume: number; // 0 to 1
}

export type VisualizerMode = 'spectrum' | 'oscilloscope' | 'nebula';

export default function Visualizer({ audioRef, isPlaying, skin, volume }: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visMode, setVisMode] = useState<VisualizerMode>('spectrum');
  
  // Web Audio Context states
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const [isRealAudioAvailable, setIsRealAudioAvailable] = useState(false);

  // High-performance procedural animation variables
  const proceduralBars = useRef<number[]>(Array(30).fill(2));
  const proceduralPeaks = useRef<number[]>(Array(30).fill(10));
  const waveOffset = useRef<number>(0);

  // Initialize Web Audio API on first user play interaction
  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

    const setupAnalyser = () => {
      try {
        if (!audioContextRef.current) {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (!AudioContextClass) return;
          audioContextRef.current = new AudioContextClass();
        }

        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') {
          ctx.resume();
        }

        if (!analyserRef.current) {
          const analyzer = ctx.createAnalyser();
          analyzer.fftSize = 256;
          analyserRef.current = analyzer;
        }

        if (!sourceRef.current) {
          // Attempt to connect the HTMLAudioElement to Web Audio API
          const source = ctx.createMediaElementSource(audioEl);
          source.connect(analyserRef.current);
          analyserRef.current.connect(ctx.destination);
          sourceRef.current = source;
          setIsRealAudioAvailable(true);
        }
      } catch (err) {
        console.warn('Real Web Audio node binding blocked (likely CORS or dual connection): fallback to procedural visualizer', err);
        setIsRealAudioAvailable(false);
      }
    };

    const handlePlay = () => {
      setupAnalyser();
    };

    audioEl.addEventListener('play', handlePlay);
    // If it's already playing, try initializing
    if (isPlaying) {
      setupAnalyser();
    }

    return () => {
      audioEl.removeEventListener('play', handlePlay);
    };
  }, [audioRef, isPlaying]);

  // Main canvas animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserRef.current ? analyserRef.current.frequencyBinCount : 128;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const isActuallyPlaying = isPlaying && volume > 0.02;

      // Draw subtle retro grid background for skin customization
      ctx.fillStyle = skin.id === 'cyberpunk' ? 'rgba(0,0,0,1)' : 'rgba(10, 10, 15, 0.4)';
      ctx.fillRect(0, 0, width, height);
      
      if (skin.id === 'synthwave') {
        // Draw grid lines
        ctx.strokeStyle = 'rgba(236, 72, 153, 0.1)';
        ctx.lineWidth = 1;
        for (let x = 0; x < width; x += 15) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y < height; y += 10) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
      }

      // 1. Get audio spectrum/time domain data
      let processedData: number[] = [];
      let maxSignalStrength = 0;

      if (isRealAudioAvailable && analyserRef.current) {
        try {
          if (visMode === 'oscilloscope') {
            analyserRef.current.getByteTimeDomainData(dataArray);
            processedData = Array.from(dataArray).map(val => (val - 128) / 128);
          } else {
            analyserRef.current.getByteFrequencyData(dataArray);
            processedData = Array.from(dataArray).map(val => val / 255);
          }
          maxSignalStrength = processedData.reduce((acc, v) => acc + Math.abs(v), 0) / processedData.length;
        } catch (e) {
          // fallback on error
          processedData = [];
        }
      }

      // FALLBACK / PROCEDURAL ENGINE
      const isUsingFallback = processedData.length === 0;
      if (isUsingFallback) {
        waveOffset.current += isActuallyPlaying ? 0.08 : 0.01;
        
        if (visMode === 'oscilloscope') {
          // Create simulated sine wave
          const numSamples = 60;
          for (let i = 0; i < numSamples; i++) {
            const tempVal = isActuallyPlaying
              ? Math.sin(i * 0.2 + waveOffset.current) * 0.4 * volume * (0.8 + Math.random() * 0.3)
              : Math.sin(i * 0.1) * 0.04;
            processedData.push(tempVal);
          }
        } else {
          // Spectrum procedural update
          const numBars = 30;
          for (let i = 0; i < numBars; i++) {
            if (isActuallyPlaying) {
              const frequencyFactor = 1.0 - (i / numBars) * 0.6; // lower high freqs
              const speedMultiplier = 1 + (i % 3) * 0.4;
              const soundWaveVal = Math.sin(waveOffset.current * speedMultiplier + i) * 0.5 + 0.5;
              const randomNoise = Math.random() * 0.4;
              const target = (soundWaveVal * 0.6 + randomNoise * 0.4) * frequencyFactor * volume;
              // Smooth transition
              proceduralBars.current[i] += (target - proceduralBars.current[i]) * 0.35;
            } else {
              proceduralBars.current[i] *= 0.85; // Decelerate to rest
            }
            if (proceduralBars.current[i] < 0.01) proceduralBars.current[i] = 0.01;
            processedData.push(proceduralBars.current[i]);
          }
        }
      }

      // 2. Render Selected Mode
      if (visMode === 'spectrum') {
        const barCount = processedData.length;
        const totalGap = (barCount - 1) * 1.5;
        const barWidth = Math.max(1.5, (width - totalGap) / barCount);
        
        for (let i = 0; i < barCount; i++) {
          const rawValue = processedData[i];
          const barHeight = Math.max(2, rawValue * height * 0.9);
          const x = i * (barWidth + 1.5);
          const y = height - barHeight;

          // Spectrum Bar Gradient
          const gradient = ctx.createLinearGradient(x, height, x, y);
          gradient.addColorStop(0, skin.visualizerColor);
          if (skin.id === 'synthwave') {
            gradient.addColorStop(0.5, '#ec4899');
            gradient.addColorStop(1, '#00ffff');
          } else if (skin.id === 'retro-gold') {
            gradient.addColorStop(0.5, '#f59e0b');
            gradient.addColorStop(1, '#fef3c7');
          } else {
            gradient.addColorStop(0.6, '#00ff00');
            gradient.addColorStop(1, skin.visualizerPeakColor);
          }

          ctx.fillStyle = gradient;
          ctx.fillRect(x, y, barWidth, barHeight);

          // Render Winamp Peak falling indicators
          if (isUsingFallback) {
            const targetPeak = y - 2;
            if (targetPeak < proceduralPeaks.current[i]) {
              proceduralPeaks.current[i] = targetPeak;
            } else {
              proceduralPeaks.current[i] += 0.8; // Gravity fall
            }
            // limit boundaries
            if (proceduralPeaks.current[i] > height - 3) {
              proceduralPeaks.current[i] = height - 3;
            }
            
            // Draw peak dot
            ctx.fillStyle = skin.visualizerPeakColor;
            ctx.fillRect(x, proceduralPeaks.current[i], barWidth, 1.5);
          }
        }
      } else if (visMode === 'oscilloscope') {
        // Draw centered zero-line in background
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();

        ctx.strokeStyle = skin.visualizerColor;
        ctx.lineWidth = 2;
        ctx.shadowColor = skin.visualizerColor;
        ctx.shadowBlur = skin.id === 'synthwave' || skin.id === 'cyberpunk' ? 6 : 0;
        ctx.beginPath();

        const sliceWidth = width / (processedData.length - 1);
        for (let i = 0; i < processedData.length; i++) {
          const x = i * sliceWidth;
          // Scale wave
          const waveVal = processedData[i];
          const y = (height / 2) + (waveVal * (height / 2) * 0.85);

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
        ctx.shadowBlur = 0; // Reset canvas shadows
      } else if (visMode === 'nebula') {
        const centerX = width / 2;
        const centerY = height / 2;
        const baseRadius = Math.min(centerX, centerY) * 0.55;
        
        ctx.strokeStyle = skin.visualizerColor;
        ctx.lineWidth = 2;
        ctx.shadowBlur = skin.id === 'synthwave' ? 8 : 0;
        ctx.shadowColor = skin.visualizerColor;

        ctx.beginPath();
        const segments = processedData.length;
        
        for (let i = 0; i <= segments; i++) {
          const index = i % segments;
          const angle = (i / segments) * Math.PI * 2;
          const amplitude = processedData[index] * (baseRadius * 0.6) * (isPlaying ? 1 : 0.2);
          const r = baseRadius + amplitude;
          const x = centerX + Math.cos(angle) * r;
          const y = centerY + Math.sin(angle) * r;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        ctx.stroke();

        // Inner glowing core
        ctx.shadowBlur = 0;
        const pulseRatio = (isActuallyPlaying ? (maxSignalStrength > 0 ? maxSignalStrength : 0.4) : 0.1) * volume;
        const pulseRadius = baseRadius * 0.3 + (pulseRatio * 8);
        ctx.fillStyle = skin.visualizerPeakColor + '20';
        ctx.beginPath();
        ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = skin.visualizerPeakColor + '60';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      animationFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [visMode, isRealAudioAvailable, isPlaying, skin, volume]);

  const cycleVisMode = () => {
    setVisMode((current) => {
      if (current === 'spectrum') return 'oscilloscope';
      if (current === 'oscilloscope') return 'nebula';
      return 'spectrum';
    });
  };

  return (
    <div 
      className="relative cursor-pointer select-none group border border-black/70 overflow-hidden"
      style={{ height: '70px', minWidth: '150px' }}
      onClick={cycleVisMode}
      title="Clicca per cambiare modalità visiva"
      id="winamp-visualizer-container"
    >
      <canvas 
        ref={canvasRef} 
        width={310} 
        height={70} 
        className="w-full h-full block"
        style={{ imageRendering: 'pixelated' }}
        id="visualizer-canvas"
      />
      
      {/* Visualizer Floating Badge */}
      <div 
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-black/80 px-1.5 py-0.5 text-[8px] font-mono rounded text-white/90 border border-white/20 transition-opacity uppercase"
        id="vis-mode-badge"
      >
        {visMode}
      </div>
    </div>
  );
}
