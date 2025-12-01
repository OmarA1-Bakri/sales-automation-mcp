import PropTypes from 'prop-types';

/**
 * Video Generation Status Component
 * Displays the current status of video generation with progress indicator
 */
export default function VideoGenerationStatus({ status, progress = 0 }) {
  // Status configuration
  const statusConfig = {
    draft: {
      label: 'Draft',
      color: 'slate',
      bgColor: 'bg-slate-600/20',
      borderColor: 'border-slate-500/30',
      textColor: 'text-slate-400',
      icon: (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      )
    },
    generating: {
      label: 'Generating',
      color: 'amber',
      bgColor: 'bg-amber-600/20',
      borderColor: 'border-amber-500/30',
      textColor: 'text-amber-400',
      icon: (
        <div className="animate-spin">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
      )
    },
    pending: {
      label: 'Pending',
      color: 'blue',
      bgColor: 'bg-blue-600/20',
      borderColor: 'border-blue-500/30',
      textColor: 'text-blue-400',
      icon: (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    processing: {
      label: 'Processing',
      color: 'amber',
      bgColor: 'bg-amber-600/20',
      borderColor: 'border-amber-500/30',
      textColor: 'text-amber-400',
      icon: (
        <div className="animate-pulse">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
      )
    },
    completed: {
      label: 'Ready',
      color: 'green',
      bgColor: 'bg-green-600/20',
      borderColor: 'border-green-500/30',
      textColor: 'text-green-400',
      icon: (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )
    },
    failed: {
      label: 'Failed',
      color: 'red',
      bgColor: 'bg-red-600/20',
      borderColor: 'border-red-500/30',
      textColor: 'text-red-400',
      icon: (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )
    }
  };

  const config = statusConfig[status] || statusConfig.draft;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.borderColor} ${config.textColor} border`}>
      {config.icon}
      <span>{config.label}</span>
      {(status === 'generating' || status === 'processing') && progress > 0 && (
        <span className="ml-1 opacity-75">{progress}%</span>
      )}
    </div>
  );
}

VideoGenerationStatus.propTypes = {
  status: PropTypes.oneOf(['draft', 'generating', 'pending', 'processing', 'completed', 'failed']),
  progress: PropTypes.number
};

VideoGenerationStatus.defaultProps = {
  status: 'draft',
  progress: 0
};
