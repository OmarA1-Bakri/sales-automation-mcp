import PropTypes from 'prop-types';

/**
 * Multi-Channel Flow Visualization
 * Shows combined email + LinkedIn sequence steps in a visual timeline
 */
export default function MultiChannelFlow({ emailPerformance, linkedinPerformance }) {
  // Ensure arrays are defined
  const safeEmailPerformance = emailPerformance || [];
  const safeLinkedInPerformance = linkedinPerformance || [];

  // Combine and sort by step number
  const allSteps = [];

  // Add email steps
  safeEmailPerformance.forEach(email => {
    allSteps.push({
      step: email.step,
      channel: 'email',
      type: 'email',
      subject: email.subject,
      sent: email.sent,
      opened: email.opened,
      clicked: email.clicked,
      replied: email.replied,
      bounced: email.bounced,
      openRate: email.openRate,
      clickRate: email.clickRate,
      replyRate: email.replyRate
    });
  });

  // Add LinkedIn steps
  safeLinkedInPerformance.forEach(li => {
    allSteps.push({
      step: li.step,
      channel: 'linkedin',
      type: li.type,
      message: li.message,
      sent: li.sent,
      accepted: li.accepted,
      replied: li.replied,
      acceptRate: li.acceptRate,
      replyRate: li.replyRate
    });
  });

  // Sort by step number
  allSteps.sort((a, b) => a.step - b.step);

  const formatPercentage = (value) => {
    if (value === undefined || value === null) return '0%';
    return `${(value * 100).toFixed(1)}%`;
  };

  const getChannelIcon = (channel) => {
    if (channel === 'email') {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    } else {
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
        </svg>
      );
    }
  };

  const getChannelColor = (channel) => {
    return channel === 'email' ? 'bg-purple-500' : 'bg-blue-500';
  };

  const getChannelTextColor = (channel) => {
    return channel === 'email' ? 'text-purple-400' : 'text-blue-400';
  };

  if (allSteps.length === 0) {
    return (
      <div className="text-center text-slate-400 py-8">
        No sequence steps configured
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {allSteps.map((step, index) => (
        <div key={`${step.channel}-${step.step}`} className="relative">
          {/* Connector line */}
          {index < allSteps.length - 1 && (
            <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-slate-700 -mb-4" />
          )}

          <div className="flex items-start gap-4">
            {/* Step indicator */}
            <div className={`flex-shrink-0 w-12 h-12 rounded-full ${getChannelColor(step.channel)} flex items-center justify-center relative z-10`}>
              {getChannelIcon(step.channel)}
            </div>

            {/* Step content */}
            <div className="flex-1 bg-slate-800 rounded-lg p-4 border border-slate-700">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-slate-500">
                      Step {step.step}
                    </span>
                    <span className={`text-xs font-medium ${getChannelTextColor(step.channel)}`}>
                      {step.channel === 'email' ? 'Email' : step.type === 'connection' ? 'LinkedIn Connection' : 'LinkedIn Message'}
                    </span>
                  </div>
                  <div className="text-sm text-white">
                    {step.channel === 'email' ? step.subject : step.message}
                  </div>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-4 gap-4 mt-3 pt-3 border-t border-slate-700">
                {step.channel === 'email' ? (
                  <>
                    <div>
                      <div className="text-xs text-slate-500">Sent</div>
                      <div className="text-lg font-semibold text-white">{step.sent}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Open Rate</div>
                      <div className="text-lg font-semibold text-green-400">{formatPercentage(step.openRate)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Click Rate</div>
                      <div className="text-lg font-semibold text-blue-400">{formatPercentage(step.clickRate)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Reply Rate</div>
                      <div className="text-lg font-semibold text-purple-400">{formatPercentage(step.replyRate)}</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <div className="text-xs text-slate-500">Sent</div>
                      <div className="text-lg font-semibold text-white">{step.sent}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">{step.type === 'connection' ? 'Accepted' : 'Replied'}</div>
                      <div className="text-lg font-semibold text-white">
                        {step.type === 'connection' ? step.accepted : step.replied}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">{step.type === 'connection' ? 'Accept Rate' : 'Reply Rate'}</div>
                      <div className="text-lg font-semibold text-green-400">
                        {formatPercentage(step.type === 'connection' ? step.acceptRate : step.replyRate)}
                      </div>
                    </div>
                    <div>
                      {/* Empty cell for alignment */}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

MultiChannelFlow.propTypes = {
  emailPerformance: PropTypes.arrayOf(
    PropTypes.shape({
      step: PropTypes.number.isRequired,
      subject: PropTypes.string.isRequired,
      sent: PropTypes.number.isRequired,
      opened: PropTypes.number.isRequired,
      clicked: PropTypes.number.isRequired,
      replied: PropTypes.number.isRequired,
      bounced: PropTypes.number.isRequired,
      openRate: PropTypes.number.isRequired,
      clickRate: PropTypes.number.isRequired,
      replyRate: PropTypes.number.isRequired
    })
  ),
  linkedinPerformance: PropTypes.arrayOf(
    PropTypes.shape({
      step: PropTypes.number.isRequired,
      type: PropTypes.oneOf(['connection', 'message']).isRequired,
      message: PropTypes.string.isRequired,
      sent: PropTypes.number.isRequired,
      accepted: PropTypes.number,
      replied: PropTypes.number,
      acceptRate: PropTypes.number,
      replyRate: PropTypes.number
    })
  )
};
