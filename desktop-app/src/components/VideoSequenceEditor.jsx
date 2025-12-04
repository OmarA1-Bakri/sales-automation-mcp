import { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import toast from 'react-hot-toast';
import api from '../services/api';
import VideoStepCard from './video/VideoStepCard';

// Generate unique ID for steps
let stepIdCounter = 0;
const generateStepId = () => `step-${Date.now()}-${++stepIdCounter}`;

/**
 * Video Sequence Editor
 * Allows editing HeyGen video sequence steps with avatar/voice selection
 * and real-time video generation preview
 *
 * Color scheme: Amber/Orange (to differentiate from blue=LinkedIn, purple=email)
 */
export default function VideoSequenceEditor({ videoSequence, onChange }) {
  // Initialize steps from props with unique IDs
  const [steps, setSteps] = useState(() =>
    videoSequence.map(step => ({
      id: step.id || generateStepId(),
      step: step.step,
      avatarId: step.avatarId || '',
      voiceId: step.voiceId || '',
      script: step.script || '',
      delay: step.delay || 0,
      // Video generation state
      status: step.status || 'draft',
      videoId: step.videoId || null,
      videoUrl: step.videoUrl || null,
      thumbnailUrl: step.thumbnailUrl || null,
      progress: step.progress || 0
    }))
  );

  // Track if we need to notify parent of changes
  const pendingChangeRef = useRef(false);

  // AbortController for canceling async operations on unmount
  const abortControllerRef = useRef(null);

  // Sync changes to parent - called outside state updaters
  useEffect(() => {
    if (pendingChangeRef.current) {
      pendingChangeRef.current = false;
      onChange(steps);
    }
  }, [steps, onChange]);

  // Cleanup AbortController on unmount to prevent state updates on unmounted component
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Available avatars and voices (loaded from API)
  const [avatars, setAvatars] = useState([]);
  const [voices, setVoices] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [assetsError, setAssetsError] = useState(null);

  // Load avatars and voices on mount
  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    try {
      setLoadingAssets(true);
      setAssetsError(null);

      const [avatarRes, voiceRes] = await Promise.all([
        api.getHeyGenAvatars(),
        api.getHeyGenVoices()
      ]);

      setAvatars(avatarRes.data?.avatars || []);
      setVoices(voiceRes.data?.voices || []);
    } catch (error) {
      // Only log errors in development mode to prevent E2E test failures
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to load HeyGen assets:', error);
      }
      setAssetsError(error.message);
    } finally {
      setLoadingAssets(false);
    }
  };

  // CRUD Operations - using functional updates to avoid stale closures
  const addStep = useCallback(() => {
    pendingChangeRef.current = true;
    setSteps(prev => {
      const newStep = {
        id: generateStepId(),
        step: prev.length + 1,
        avatarId: avatars[0]?.id || '',
        voiceId: voices[0]?.id || '',
        script: '',
        delay: prev.length === 0 ? 0 : 3,
        status: 'draft',
        videoId: null,
        videoUrl: null,
        thumbnailUrl: null,
        progress: 0
      };
      return [...prev, newStep];
    });
  }, [avatars, voices]);

  const updateStep = useCallback((index, field, value) => {
    pendingChangeRef.current = true;
    setSteps(prev => {
      const newSteps = [...prev];
      const updatedStep = { ...newSteps[index], [field]: value };

      // If avatar or voice changed, reset video state to draft
      if (field === 'avatarId' || field === 'voiceId' || field === 'script') {
        updatedStep.status = 'draft';
        updatedStep.videoId = null;
        updatedStep.videoUrl = null;
        updatedStep.thumbnailUrl = null;
        updatedStep.progress = 0;
      }

      newSteps[index] = updatedStep;
      return newSteps;
    });
  }, []);

  const deleteStep = useCallback((index) => {
    pendingChangeRef.current = true;
    setSteps(prev => {
      const newSteps = prev.filter((_, i) => i !== index);
      // Renumber steps
      return newSteps.map((step, i) => ({ ...step, step: i + 1 }));
    });
  }, []);

  const moveStep = useCallback((index, direction) => {
    setSteps(prev => {
      if (
        (direction === 'up' && index === 0) ||
        (direction === 'down' && index === prev.length - 1)
      ) {
        return prev; // No change - React won't trigger effect since reference unchanged
      }

      const newSteps = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];

      // Renumber steps
      return newSteps.map((step, i) => ({ ...step, step: i + 1 }));
    });
    // Set flag outside updater - useEffect only fires if steps actually changed
    pendingChangeRef.current = true;
  }, []);

  // Video preview generation with AbortController for cleanup
  const generatePreview = async (index) => {
    const step = steps[index];

    if (!step.avatarId || !step.voiceId || !step.script) {
      toast.error('Please select an avatar, voice, and write a script before generating a preview.');
      return;
    }

    // Cancel any existing generation before starting a new one
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    // Update status to generating (functional update to avoid stale closure)
    setSteps(prev => {
      const newSteps = [...prev];
      newSteps[index] = { ...newSteps[index], status: 'generating', progress: 10 };
      return newSteps;
    });

    try {
      // Check if aborted before API call
      if (signal.aborted) return;

      const response = await api.generateHeyGenPreview({
        avatarId: step.avatarId,
        voiceId: step.voiceId,
        script: step.script.substring(0, 500) // Limit for preview
      });

      // Check if aborted after API call
      if (signal.aborted) return;

      const videoId = response.data?.videoId;

      if (!videoId) {
        throw new Error('No video ID returned from API');
      }

      // Update with video ID (functional update)
      setSteps(prev => {
        const newSteps = [...prev];
        newSteps[index] = { ...newSteps[index], videoId, progress: 30 };
        return newSteps;
      });

      // Poll for completion with abort signal checking
      const finalStatus = await api.pollHeyGenVideoUntilComplete(videoId, {
        interval: 3000,
        timeout: 300000,
        onProgress: (status) => {
          // Check if aborted before updating state
          if (signal.aborted) return;
          // Functional update to avoid stale closure in callback
          setSteps(prev => {
            const newSteps = [...prev];
            newSteps[index] = { ...newSteps[index], progress: status.progress || 50 };
            return newSteps;
          });
        }
      });

      // Check if aborted after polling completes
      if (signal.aborted) return;

      // Update with final status (functional update)
      pendingChangeRef.current = true;
      setSteps(prev => {
        const newSteps = [...prev];
        newSteps[index] = {
          ...newSteps[index],
          status: finalStatus.status,
          videoUrl: finalStatus.videoUrl,
          thumbnailUrl: finalStatus.thumbnailUrl,
          progress: finalStatus.status === 'completed' ? 100 : 0
        };
        return newSteps;
      });

      toast.success('Video preview generated successfully!');

    } catch (error) {
      // Silently exit if aborted (component unmounted or new generation started)
      if (signal.aborted || error.name === 'AbortError') return;

      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to generate preview:', error);
      }
      // Functional update for error state
      setSteps(prev => {
        const newSteps = [...prev];
        newSteps[index] = { ...newSteps[index], status: 'failed', progress: 0 };
        return newSteps;
      });
      toast.error(`Failed to generate preview: ${error.message}`);
    }
  };

  // Video icon
  const VideoIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );

  // Loading state
  if (loadingAssets) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-500"></div>
          <p className="text-slate-400">Loading HeyGen avatars and voices...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (assetsError) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 text-center">
        <svg className="w-12 h-12 mx-auto text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p className="text-red-400 font-medium mb-2">Failed to load HeyGen assets</p>
        <p className="text-red-500 text-sm mb-4">{assetsError}</p>
        <button
          onClick={loadAssets}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Video Sequence Steps</h3>
          <p className="text-sm text-slate-400 mt-1">
            Configure personalized AI-generated videos for your campaign
          </p>
        </div>
        <button
          onClick={addStep}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
        >
          <VideoIcon />
          Add Video Step
        </button>
      </div>

      {/* Empty state */}
      {steps.length === 0 ? (
        <div className="text-center py-12 bg-slate-700/50 rounded-lg border-2 border-dashed border-slate-600">
          <svg className="w-12 h-12 mx-auto text-slate-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <p className="text-slate-400 mb-4">No video steps configured</p>
          <button
            onClick={addStep}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
          >
            Add Video Step
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {steps.map((step, index) => (
            <VideoStepCard
              key={step.id}
              step={step}
              index={index}
              isFirst={index === 0}
              isLast={index === steps.length - 1}
              avatars={avatars}
              voices={voices}
              onUpdate={updateStep}
              onDelete={deleteStep}
              onMove={moveStep}
              onGeneratePreview={generatePreview}
            />
          ))}
        </div>
      )}

      {/* Best practices info */}
      <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4 mt-6">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-amber-300">
            <div className="font-medium mb-1">Video Best Practices</div>
            <ul className="text-amber-400 text-xs space-y-1 list-disc list-inside">
              <li>Keep videos under 60 seconds for best engagement</li>
              <li>Use personalization variables like {"{{firstName}}"} and {"{{companyName}}"}</li>
              <li>Choose avatars and voices that match your brand tone</li>
              <li>Test previews before launching campaigns</li>
              <li>Videos are generated on-demand during campaign execution</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

VideoSequenceEditor.propTypes = {
  videoSequence: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string, // Optional - will be generated if not provided
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
    })
  ).isRequired,
  onChange: PropTypes.func.isRequired
};
