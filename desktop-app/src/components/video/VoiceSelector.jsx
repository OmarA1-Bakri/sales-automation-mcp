import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * Voice Selector Component
 * Dropdown voice picker with audio preview samples
 */
export default function VoiceSelector({ voices, selectedId, onChange }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [playingId, setPlayingId] = useState(null);
  const [loadingAudioId, setLoadingAudioId] = useState(null);
  const audioRef = useRef(null);

  // Cleanup audio on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  // Filter voices by search term
  const filteredVoices = voices.filter(voice =>
    voice.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    voice.language?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    voice.accent?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get selected voice for display
  const selectedVoice = voices.find(v => v.id === selectedId);

  // Play voice sample
  const playSample = (voice, e) => {
    e.stopPropagation();

    if (playingId === voice.id || loadingAudioId === voice.id) {
      // Stop playing or cancel loading
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      setPlayingId(null);
      setLoadingAudioId(null);
      return;
    }

    // Stop any current playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }

    if (voice.sampleUrl) {
      setLoadingAudioId(voice.id);
      const audio = new Audio(voice.sampleUrl);

      audio.oncanplaythrough = () => {
        setLoadingAudioId(null);
        setPlayingId(voice.id);
        audio.play().catch(() => {
          setPlayingId(null);
        });
      };

      audio.onended = () => {
        setPlayingId(null);
      };

      audio.onerror = () => {
        setLoadingAudioId(null);
        setPlayingId(null);
      };

      audioRef.current = audio;
      audio.load();
    }
  };

  // Get language flag emoji (simplified)
  const getLanguageFlag = (language) => {
    const flags = {
      'en': '🇺🇸',
      'en-us': '🇺🇸',
      'en-gb': '🇬🇧',
      'es': '🇪🇸',
      'fr': '🇫🇷',
      'de': '🇩🇪',
      'it': '🇮🇹',
      'pt': '🇵🇹',
      'zh': '🇨🇳',
      'ja': '🇯🇵',
      'ko': '🇰🇷',
      'ar': '🇸🇦'
    };
    const lang = (language || '').toLowerCase().split('-')[0];
    return flags[lang] || flags[(language || '').toLowerCase()] || '🌐';
  };

  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">
        AI Voice
      </label>

      {/* Selected voice display */}
      <div
        role="combobox"
        aria-expanded={expanded}
        aria-haspopup="listbox"
        aria-controls="voice-selector-listbox"
        aria-label="Select AI voice"
        tabIndex={0}
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => e.key === 'Enter' && setExpanded(!expanded)}
        className="flex items-center gap-3 p-3 bg-slate-800 border border-slate-600 rounded-lg cursor-pointer hover:border-amber-500/50 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
      >
        {selectedVoice ? (
          <>
            <div className="w-10 h-10 rounded-full bg-amber-600/30 flex items-center justify-center text-lg">
              {getLanguageFlag(selectedVoice.language)}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-white">{selectedVoice.name}</div>
              <div className="text-xs text-slate-400">
                {selectedVoice.language} • {selectedVoice.gender} • {selectedVoice.accent || 'Standard'}
              </div>
            </div>
            {selectedVoice.sampleUrl && (
              <button
                onClick={(e) => playSample(selectedVoice, e)}
                className="p-2 text-amber-400 hover:text-amber-300 transition-colors"
                title="Preview voice"
                aria-label={loadingAudioId === selectedVoice.id ? 'Loading audio' : playingId === selectedVoice.id ? 'Stop preview' : 'Preview voice'}
              >
                {loadingAudioId === selectedVoice.id ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : playingId === selectedVoice.id ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                )}
              </button>
            )}
          </>
        ) : (
          <div className="flex items-center gap-3 text-slate-400">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <span className="text-sm">Select a voice...</span>
          </div>
        )}
        <svg className={`w-5 h-5 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Expanded voice list */}
      {expanded && (
        <div className="mt-2 p-4 bg-slate-800 border border-slate-600 rounded-lg">
          {/* Search */}
          <input
            type="text"
            placeholder="Search by name, language, or accent..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search voices"
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 mb-3"
          />

          {/* Voice list */}
          <div id="voice-selector-listbox" role="listbox" aria-label="Available voices" className="max-h-48 overflow-y-auto space-y-1">
            {filteredVoices.map(voice => (
              <div
                key={voice.id}
                role="option"
                aria-selected={voice.id === selectedId}
                tabIndex={0}
                onClick={() => {
                  onChange(voice.id);
                  setExpanded(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onChange(voice.id);
                    setExpanded(false);
                  }
                }}
                className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                  voice.id === selectedId
                    ? 'bg-amber-600/30 border border-amber-500'
                    : 'hover:bg-slate-700/50 border border-transparent'
                } focus:outline-none focus:ring-2 focus:ring-amber-500`}
              >
                <div className="text-lg">{getLanguageFlag(voice.language)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{voice.name}</div>
                  <div className="text-xs text-slate-400 truncate">
                    {voice.language} • {voice.gender} • {voice.accent || 'Standard'}
                  </div>
                </div>
                {voice.sampleUrl && (
                  <button
                    onClick={(e) => playSample(voice, e)}
                    className="p-1 text-slate-400 hover:text-amber-400 transition-colors"
                    title="Preview voice"
                    aria-label={loadingAudioId === voice.id ? 'Loading audio' : playingId === voice.id ? 'Stop preview' : 'Preview voice'}
                  >
                    {loadingAudioId === voice.id ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : playingId === voice.id ? (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>

          {filteredVoices.length === 0 && (
            <p className="text-center text-slate-400 text-sm py-4">
              No voices found matching "{searchTerm}"
            </p>
          )}
        </div>
      )}
    </div>
  );
}

VoiceSelector.propTypes = {
  voices: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      language: PropTypes.string,
      gender: PropTypes.string,
      accent: PropTypes.string,
      sampleUrl: PropTypes.string
    })
  ).isRequired,
  selectedId: PropTypes.string,
  onChange: PropTypes.func.isRequired
};
