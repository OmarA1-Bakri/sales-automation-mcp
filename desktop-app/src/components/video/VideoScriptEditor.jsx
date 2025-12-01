import { useState, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';

/**
 * Video Script Editor Component
 * Rich textarea with variable insertion and character count
 */
export default function VideoScriptEditor({ script, onChange, maxLength = 2000 }) {
  const [showVariables, setShowVariables] = useState(false);
  const textareaRef = useRef(null);

  // Available personalization variables
  const variables = [
    { name: 'firstName', description: 'Contact first name', example: 'John' },
    { name: 'lastName', description: 'Contact last name', example: 'Smith' },
    { name: 'fullName', description: 'Contact full name', example: 'John Smith' },
    { name: 'companyName', description: 'Company name', example: 'Acme Corp' },
    { name: 'jobTitle', description: 'Job title', example: 'VP of Sales' },
    { name: 'industry', description: 'Industry', example: 'Technology' },
    { name: 'city', description: 'City', example: 'San Francisco' }
  ];

  // Insert variable at cursor position
  const insertVariable = useCallback((varName) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = script;
    const before = text.substring(0, start);
    const after = text.substring(end);
    const newText = `${before}{{${varName}}}${after}`;

    onChange(newText);

    // Restore cursor position after variable
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + varName.length + 4;
      textarea.focus();
    }, 0);
  }, [script, onChange]);

  // Calculate estimated video duration (rough: ~150 words per minute)
  const estimateDuration = (text) => {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const minutes = words / 150;
    const seconds = Math.round(minutes * 60);
    return seconds < 60 ? `~${seconds}s` : `~${Math.floor(minutes)}m ${seconds % 60}s`;
  };

  // Character and word stats
  const charCount = script.length;
  const wordCount = script.trim().split(/\s+/).filter(Boolean).length;
  const duration = estimateDuration(script);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-slate-300">
          Video Script
        </label>
        <button
          onClick={() => setShowVariables(!showVariables)}
          className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          Insert Variable
        </button>
      </div>

      {/* Variable picker */}
      {showVariables && (
        <div className="mb-2 p-3 bg-slate-700/50 border border-slate-600 rounded-lg">
          <div className="text-xs text-slate-400 mb-2">Click to insert:</div>
          <div className="flex flex-wrap gap-1">
            {variables.map(v => (
              <button
                key={v.name}
                onClick={() => {
                  insertVariable(v.name);
                  setShowVariables(false);
                }}
                className="px-2 py-1 bg-amber-600/20 border border-amber-500/30 rounded text-xs text-amber-300 hover:bg-amber-600/30 transition-colors"
                title={`${v.description} (e.g., "${v.example}")`}
              >
                {`{{${v.name}}}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Script textarea */}
      <textarea
        ref={textareaRef}
        value={script}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        maxLength={maxLength}
        className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-sm resize-none"
        placeholder="Hi {{firstName}}, I noticed {{companyName}} is doing great work in your industry. I wanted to share how we've helped similar companies..."
      />

      {/* Stats bar */}
      <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <span className={charCount > maxLength * 0.9 ? 'text-amber-400' : ''}>
            {charCount} / {maxLength} chars
          </span>
          <span>{wordCount} words</span>
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {duration}
          </span>
        </div>
        {charCount > maxLength * 0.9 && (
          <span className="text-amber-400">Approaching limit</span>
        )}
      </div>

      {/* Tips */}
      <div className="mt-2 text-xs text-slate-500">
        <span className="font-medium">Tip:</span> Use variables like {`{{firstName}}`} to personalize each video.
      </div>
    </div>
  );
}

VideoScriptEditor.propTypes = {
  script: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  maxLength: PropTypes.number
};
