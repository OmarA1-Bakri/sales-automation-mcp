import { useState } from 'react';
import PropTypes from 'prop-types';

/**
 * Avatar Selector Component
 * Grid-based avatar picker with preview images and search
 */
export default function AvatarSelector({ avatars, selectedId, onChange }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expanded, setExpanded] = useState(false);

  // Filter avatars by search term
  const filteredAvatars = avatars.filter(avatar =>
    avatar.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    avatar.gender?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get selected avatar for display
  const selectedAvatar = avatars.find(a => a.id === selectedId);

  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">
        AI Avatar
      </label>

      {/* Selected avatar display */}
      <div
        role="combobox"
        aria-expanded={expanded}
        aria-haspopup="listbox"
        aria-controls="avatar-selector-listbox"
        aria-label="Select AI avatar"
        tabIndex={0}
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => e.key === 'Enter' && setExpanded(!expanded)}
        className="flex items-center gap-3 p-3 bg-slate-800 border border-slate-600 rounded-lg cursor-pointer hover:border-amber-500/50 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
      >
        {selectedAvatar ? (
          <>
            <img
              src={selectedAvatar.previewUrl}
              alt={selectedAvatar.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-amber-500"
            />
            <div className="flex-1">
              <div className="text-sm font-medium text-white">{selectedAvatar.name}</div>
              <div className="text-xs text-slate-400 capitalize">{selectedAvatar.gender}</div>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3 text-slate-400">
            <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <span className="text-sm">Select an avatar...</span>
          </div>
        )}
        <svg className={`w-5 h-5 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Expanded avatar grid */}
      {expanded && (
        <div className="mt-2 p-4 bg-slate-800 border border-slate-600 rounded-lg">
          {/* Search */}
          <input
            type="text"
            placeholder="Search avatars..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search avatars"
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 mb-3"
          />

          {/* Avatar grid */}
          <div id="avatar-selector-listbox" role="listbox" aria-label="Available avatars" className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
            {filteredAvatars.map(avatar => (
              <button
                key={avatar.id}
                role="option"
                aria-selected={avatar.id === selectedId}
                aria-label={`Select ${avatar.name} avatar`}
                onClick={() => {
                  onChange(avatar.id);
                  setExpanded(false);
                }}
                className={`p-2 rounded-lg transition-all ${
                  avatar.id === selectedId
                    ? 'bg-amber-600/30 border-2 border-amber-500'
                    : 'bg-slate-700/50 border-2 border-transparent hover:border-slate-500'
                }`}
              >
                <img
                  src={avatar.previewUrl}
                  alt={avatar.name}
                  className="w-full aspect-square rounded object-cover mb-1"
                />
                <div className="text-xs text-white truncate">{avatar.name}</div>
              </button>
            ))}
          </div>

          {filteredAvatars.length === 0 && (
            <p className="text-center text-slate-400 text-sm py-4">
              No avatars found matching "{searchTerm}"
            </p>
          )}
        </div>
      )}
    </div>
  );
}

AvatarSelector.propTypes = {
  avatars: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      gender: PropTypes.string,
      previewUrl: PropTypes.string
    })
  ).isRequired,
  selectedId: PropTypes.string,
  onChange: PropTypes.func.isRequired
};
