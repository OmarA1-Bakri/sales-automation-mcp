import { useState } from 'react';
import PropTypes from 'prop-types';

/**
 * Email Sequence Editor
 * Allows editing email sequence steps with subject and body
 */
export default function EmailSequenceEditor({ emailSequence, onChange }) {
  const [steps, setSteps] = useState(emailSequence.map(email => ({
    step: email.step,
    subject: email.subject,
    body: email.body || 'Email body not available in current data',
    delay: email.delay || 0
  })));

  const addStep = () => {
    const newStep = {
      step: steps.length + 1,
      subject: '',
      body: '',
      delay: steps.length === 0 ? 0 : 3
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Email Sequence Steps</h3>
          <p className="text-sm text-slate-400 mt-1">
            Configure your email follow-up sequence. Use variables like {'{'}firstName{'}'}, {'{'}companyName{'}'}
          </p>
        </div>
        <button
          onClick={addStep}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Step
        </button>
      </div>

      {steps.length === 0 ? (
        <div className="text-center py-12 bg-slate-700/50 rounded-lg border-2 border-dashed border-slate-600">
          <svg className="w-12 h-12 mx-auto text-slate-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <p className="text-slate-400 mb-4">No email steps configured</p>
          <button
            onClick={addStep}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Add First Email
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={index} className="bg-slate-700 rounded-lg p-6 border border-slate-600">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-purple-500 rounded-full text-white font-bold text-sm">
                    {step.step}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">Email Step {step.step}</div>
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
                    Subject Line
                  </label>
                  <input
                    type="text"
                    value={step.subject}
                    onChange={(e) => updateStep(index, 'subject', e.target.value)}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Quick question about {{companyName}}"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Email Body
                  </label>
                  <textarea
                    value={step.body}
                    onChange={(e) => updateStep(index, 'body', e.target.value)}
                    rows={6}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder="Hi {{firstName}},&#10;&#10;I noticed that {{companyName}}...&#10;&#10;Best regards"
                  />
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
                    Days to wait before sending this email
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
            <div className="font-medium mb-1">Available Variables</div>
            <div className="text-blue-400 font-mono text-xs space-y-1">
              <div>{'{'}firstName{'}'} - Contact first name</div>
              <div>{'{'}lastName{'}'} - Contact last name</div>
              <div>{'{'}companyName{'}'} - Company name</div>
              <div>{'{'}personalizationHook{'}'} - Custom hook from enrichment</div>
              <div>{'{'}painPoint{'}'} - Identified pain point</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

EmailSequenceEditor.propTypes = {
  emailSequence: PropTypes.arrayOf(
    PropTypes.shape({
      step: PropTypes.number.isRequired,
      subject: PropTypes.string.isRequired,
      body: PropTypes.string,
      delay: PropTypes.number
    })
  ).isRequired,
  onChange: PropTypes.func.isRequired
};
