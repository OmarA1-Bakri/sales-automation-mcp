import PropTypes from 'prop-types';
import AvatarSelector from './AvatarSelector';
import VoiceSelector from './VoiceSelector';
import VideoScriptEditor from './VideoScriptEditor';
import VideoGenerationStatus from './VideoGenerationStatus';

/**
 * Video Step Card Component
 * Renders a single video step within the sequence editor
 * with avatar/voice selection, script editing, and preview generation
 */
export default function VideoStepCard({
  step,
  index,
  isFirst,
  isLast,
  avatars,
  voices,
  onUpdate,
  onDelete,
  onMove,
  onGeneratePreview
}) {
  // Video icon component
  const VideoIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );

  return (
    <div
      className="rounded-lg p-6 bg-amber-900/20 border border-amber-500/30"
      role="article"
      aria-label={`Video step ${step.step}`}
    >
      {/* Step header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500 text-white font-bold text-sm">
            {step.step}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <div className="text-amber-300">
                <VideoIcon />
              </div>
              <div className="text-sm font-medium text-white">
                Video Message
              </div>
              <VideoGenerationStatus status={step.status} progress={step.progress} />
            </div>
            <div className="text-xs text-slate-400">
              {step.delay === 0 ? 'Immediate' : `${step.delay} days after previous step`}
            </div>
          </div>
        </div>

        {/* Step actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onMove(index, 'up')}
            disabled={isFirst}
            className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Move up"
            aria-label="Move step up"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            onClick={() => onMove(index, 'down')}
            disabled={isLast}
            className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Move down"
            aria-label="Move step down"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(index)}
            className="p-1 text-red-400 hover:text-red-300 transition-colors"
            title="Delete step"
            aria-label="Delete step"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Step form */}
      <div className="grid grid-cols-2 gap-6">
        {/* Left column: Avatar & Voice */}
        <div className="space-y-4">
          <AvatarSelector
            avatars={avatars}
            selectedId={step.avatarId}
            onChange={(id) => onUpdate(index, 'avatarId', id)}
          />
          <VoiceSelector
            voices={voices}
            selectedId={step.voiceId}
            onChange={(id) => onUpdate(index, 'voiceId', id)}
          />
        </div>

        {/* Right column: Script & Preview */}
        <div className="space-y-4">
          <VideoScriptEditor
            script={step.script}
            onChange={(script) => onUpdate(index, 'script', script)}
            maxLength={2000}
          />

          {/* Preview button & thumbnail */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => onGeneratePreview(index)}
              disabled={step.status === 'generating' || !step.avatarId || !step.voiceId || !step.script}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              aria-busy={step.status === 'generating'}
            >
              {step.status === 'generating' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Generate Preview
                </>
              )}
            </button>

            {/* Thumbnail preview */}
            {step.thumbnailUrl && (
              <div className="relative group">
                <img
                  src={step.thumbnailUrl}
                  alt="Video thumbnail"
                  className="h-16 w-24 object-cover rounded border border-slate-600"
                />
                {step.videoUrl && (
                  <a
                    href={step.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                    aria-label="Watch generated video"
                  >
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delay input */}
      <div className="mt-4 pt-4 border-t border-amber-500/20">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Delay (days)
        </label>
        <input
          type="number"
          min="0"
          max="30"
          value={step.delay}
          onChange={(e) => onUpdate(index, 'delay', parseInt(e.target.value) || 0)}
          className="w-32 px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          aria-label="Delay in days before sending this video"
        />
        <p className="text-xs text-slate-500 mt-1">
          Days to wait before sending this video
        </p>
      </div>
    </div>
  );
}

VideoStepCard.propTypes = {
  step: PropTypes.shape({
    id: PropTypes.string.isRequired,
    step: PropTypes.number.isRequired,
    avatarId: PropTypes.string,
    voiceId: PropTypes.string,
    script: PropTypes.string,
    delay: PropTypes.number,
    status: PropTypes.string,
    videoId: PropTypes.string,
    videoUrl: PropTypes.string,
    thumbnailUrl: PropTypes.string,
    progress: PropTypes.number
  }).isRequired,
  index: PropTypes.number.isRequired,
  isFirst: PropTypes.bool.isRequired,
  isLast: PropTypes.bool.isRequired,
  avatars: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      gender: PropTypes.string,
      previewUrl: PropTypes.string
    })
  ).isRequired,
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
  onUpdate: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onMove: PropTypes.func.isRequired,
  onGeneratePreview: PropTypes.func.isRequired
};
