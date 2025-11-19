import { useState } from 'react';
import PropTypes from 'prop-types';

/**
 * LinkedIn Sequence Editor
 * Allows editing LinkedIn sequence steps (connection requests and messages)
 */
export default function LinkedInSequenceEditor({ linkedinSequence, onChange }) {
  const [steps, setSteps] = useState(linkedinSequence.map(li => ({
    step: li.step,
    type: li.type,
    message: li.message,
    delay: li.delay || 0
  })));

  const addStep = (type = 'connection') => {
    const newStep = {
      step: steps.length + 1,
      type,
      message: '',
      delay: steps.length === 0 ? 0 : 2
    };
    const newSteps = [...steps, newStep];
    setSteps(newSteps);
    onChange(newSteps);
  };

  const updateStep = (index, field, value) => {
    const newSteps = [...steps];
    newSteps[index][field] = value;
    setSteps(newSteps);
    onChange(newSteps);
  };

  const deleteStep = (index) => {
    const newSteps = steps.filter((_, i) => i !== index);
    // Renumber steps
    newSteps.forEach((step, i) => {
      step.step = i + 1;
    });
    setSteps(newSteps);
    onChange(newSteps);
  };

  const moveStep = (index, direction) => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === steps.length - 1)
    ) {
      return;
    }

    const newSteps = [...steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];

    // Renumber steps
    newSteps.forEach((step, i) => {
      step.step = i + 1;
    });

    setSteps(newSteps);
    onChange(newSteps);
  };

  const getStepIcon = (type) => {
    if (type === 'connection') {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
    } else {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">LinkedIn Sequence Steps</h3>
          <p className="text-sm text-slate-400 mt-1">
            Configure LinkedIn connection requests and follow-up messages
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => addStep('connection')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Add Connection
          </button>
          <button
            onClick={() => addStep('message')}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Add Message
          </button>
        </div>
      </div>

      {steps.length === 0 ? (
        <div className="text-center py-12 bg-slate-700/50 rounded-lg border-2 border-dashed border-slate-600">
          <svg className="w-12 h-12 mx-auto text-slate-500 mb-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
          </svg>
          <p className="text-slate-400 mb-4">No LinkedIn steps configured</p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => addStep('connection')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Add Connection Request
            </button>
            <button
              onClick={() => addStep('message')}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              Add Message
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={index} className={`rounded-lg p-6 border ${
              step.type === 'connection'
                ? 'bg-blue-900/20 border-blue-500/30'
                : 'bg-green-900/20 border-green-500/30'
            }`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-white font-bold text-sm ${
                    step.type === 'connection' ? 'bg-blue-500' : 'bg-green-500'
                  }`}>
                    {step.step}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <div className={step.type === 'connection' ? 'text-blue-300' : 'text-green-300'}>
                        {getStepIcon(step.type)}
                      </div>
                      <div className="text-sm font-medium text-white">
                        {step.type === 'connection' ? 'Connection Request' : 'LinkedIn Message'}
                      </div>
                    </div>
                    <div className="text-xs text-slate-400">
                      {step.delay === 0 ? 'Immediate' : `${step.delay} days after previous step`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => moveStep(index, 'up')}
                    disabled={index === 0}
                    className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Move up"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => moveStep(index, 'down')}
                    disabled={index === steps.length - 1}
                    className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Move down"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => deleteStep(index)}
                    className="p-1 text-red-400 hover:text-red-300 transition-colors"
                    title="Delete step"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Step Type
                  </label>
                  <select
                    value={step.type}
                    onChange={(e) => updateStep(index, 'type', e.target.value)}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="connection">Connection Request</option>
                    <option value="message">LinkedIn Message</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {step.type === 'connection' ? 'Connection Note (optional, 300 chars max)' : 'Message'}
                  </label>
                  <textarea
                    value={step.message}
                    onChange={(e) => updateStep(index, 'message', e.target.value)}
                    rows={4}
                    maxLength={step.type === 'connection' ? 300 : 8000}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder={
                      step.type === 'connection'
                        ? "Hi {{firstName}}, I noticed that {{companyName}}..."
                        : "Thanks for connecting! Given your role at {{companyName}}..."
                    }
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {step.message.length} / {step.type === 'connection' ? '300' : '8000'} characters
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Delay (days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={step.delay}
                    onChange={(e) => updateStep(index, 'delay', parseInt(e.target.value) || 0)}
                    className="w-32 px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Days to wait before sending this {step.type === 'connection' ? 'connection request' : 'message'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mt-6">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-300">
            <div className="font-medium mb-1">LinkedIn Best Practices</div>
            <ul className="text-blue-400 text-xs space-y-1 list-disc list-inside">
              <li>Connection notes are limited to 300 characters</li>
              <li>Wait for connection acceptance before sending messages</li>
              <li>Keep messages personalized and conversational</li>
              <li>Avoid salesy language in connection requests</li>
              <li>Reference shared interests or mutual connections when possible</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

LinkedInSequenceEditor.propTypes = {
  linkedinSequence: PropTypes.arrayOf(
    PropTypes.shape({
      step: PropTypes.number.isRequired,
      type: PropTypes.oneOf(['connection', 'message']).isRequired,
      message: PropTypes.string.isRequired,
      delay: PropTypes.number
    })
  ).isRequired,
  onChange: PropTypes.func.isRequired
};
