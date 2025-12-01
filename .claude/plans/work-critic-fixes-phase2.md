# Work-Critic Fixes Phase 2 - Implementation Plan

## Overview
Address 4 issues identified in the work-critic code review for HeyGen Video UI components.

## Priority Order
1. 🔴 **Critical**: AbortController for async operations
2. 🟡 **Important**: aria-controls attributes
3. 🟡 **Important**: moveStep race condition fix
4. 🟢 **Minor**: PropTypes strengthening

---

## Issue #1: AbortController for Async Operations
**File:** `desktop-app/src/components/VideoSequenceEditor.jsx`
**Severity:** 🔴 Critical

### Problem
The `generatePreview` function calls `api.pollHeyGenVideoUntilComplete` which can run for up to 5 minutes. If the component unmounts during polling, state updates will attempt on an unmounted component.

### Implementation Steps
1. Add `abortControllerRef` using `useRef(null)`
2. Add cleanup `useEffect` that calls `abort()` on unmount
3. Modify `generatePreview` to:
   - Create new AbortController at start
   - Pass signal to API call (if supported) OR use ref to check if aborted
   - Handle AbortError silently in catch block
4. Also abort any in-progress generation when starting a new one

### Code Changes
```javascript
// Add ref
const abortControllerRef = useRef(null);

// Add cleanup effect
useEffect(() => {
  return () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };
}, []);

// Modify generatePreview
const generatePreview = async (index) => {
  // Cancel any existing generation
  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
  }
  abortControllerRef.current = new AbortController();
  const { signal } = abortControllerRef.current;

  // ... existing validation ...

  try {
    // Check if aborted before each async operation
    if (signal.aborted) return;

    const response = await api.generateHeyGenPreview({...});

    if (signal.aborted) return;

    // ... polling with abort check ...

  } catch (error) {
    if (error.name === 'AbortError' || signal.aborted) return;
    // ... existing error handling ...
  }
};
```

### Verification
- [ ] Component unmount during generation doesn't cause warnings
- [ ] Starting new preview cancels previous one
- [ ] Normal flow still works

---

## Issue #2: Missing aria-controls Attribute
**Files:**
- `desktop-app/src/components/video/VoiceSelector.jsx`
- `desktop-app/src/components/video/AvatarSelector.jsx`

**Severity:** 🟡 Important

### Problem
The combobox pattern requires `aria-controls` to link the trigger to the listbox for screen reader navigation.

### Implementation Steps
1. Add unique ID to the listbox container in each component
2. Add `aria-controls` attribute to the combobox div referencing that ID

### Code Changes

**VoiceSelector.jsx:**
```javascript
<div
  role="combobox"
  aria-expanded={expanded}
  aria-haspopup="listbox"
  aria-controls="voice-selector-listbox"
  aria-label="Select AI voice"
  // ...
>

{expanded && (
  <div className="mt-2 p-4 bg-slate-800 ...">
    {/* ... search input ... */}
    <div
      id="voice-selector-listbox"
      role="listbox"
      aria-label="Available voices"
      // ...
    >
```

**AvatarSelector.jsx:**
```javascript
<div
  role="combobox"
  aria-expanded={expanded}
  aria-haspopup="listbox"
  aria-controls="avatar-selector-listbox"
  aria-label="Select AI avatar"
  // ...
>

{expanded && (
  <div className="mt-2 p-4 bg-slate-800 ...">
    {/* ... search input ... */}
    <div
      id="avatar-selector-listbox"
      role="listbox"
      aria-label="Available avatars"
      // ...
    >
```

### Verification
- [ ] Screen reader correctly announces listbox relationship
- [ ] No duplicate ID warnings in console

---

## Issue #3: moveStep Race Condition Fix
**File:** `desktop-app/src/components/VideoSequenceEditor.jsx`
**Severity:** 🟡 Important

### Problem
`pendingChangeRef.current = true` is set inside the state updater function, which is inconsistent with other CRUD operations and could behave unpredictably with React's concurrent features.

### Implementation Steps
1. Move boundary check outside the state updater
2. Set `pendingChangeRef.current = true` before calling `setSteps`
3. Add `steps.length` to dependency array since we reference it outside

### Code Changes
```javascript
const moveStep = useCallback((index, direction) => {
  // Early return for boundary conditions - check current state
  setSteps(prev => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === prev.length - 1)
    ) {
      return prev; // No change, useEffect won't fire
    }

    const newSteps = [...prev];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];

    // Renumber steps
    return newSteps.map((step, i) => ({ ...step, step: i + 1 }));
  });

  // Always set flag - useEffect only fires if state actually changed
  pendingChangeRef.current = true;
}, []);
```

**Note:** Setting the flag after is safe because:
1. If the boundary check returns `prev` unchanged, React won't trigger a re-render
2. The useEffect comparing steps won't fire since the reference is the same
3. The flag will be reset on next actual change

### Verification
- [ ] Moving steps still works correctly
- [ ] Boundary moves (first up, last down) don't trigger parent onChange
- [ ] Consistent pattern across all CRUD operations

---

## Issue #4: PropTypes Strengthening
**File:** `desktop-app/src/components/video/VideoStepCard.jsx`
**Severity:** 🟢 Minor

### Problem
The `avatars` and `voices` PropTypes are too generic (`PropTypes.array`).

### Implementation Steps
1. Define specific shape for avatars array
2. Define specific shape for voices array

### Code Changes
```javascript
VideoStepCard.propTypes = {
  // ... existing props ...
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
  // ... rest of props ...
};
```

### Verification
- [ ] No PropTypes warnings in console
- [ ] TypeScript/IDE provides better autocomplete (if applicable)

---

## Implementation Order

1. **Issue #1 (AbortController)** - Critical for production stability
2. **Issue #3 (moveStep fix)** - Quick fix, improves code consistency
3. **Issue #2 (aria-controls)** - Accessibility improvement
4. **Issue #4 (PropTypes)** - Minor enhancement

## Estimated Effort
- Issue #1: ~15 minutes (requires careful async handling)
- Issue #2: ~5 minutes (simple attribute additions)
- Issue #3: ~5 minutes (refactor existing code)
- Issue #4: ~5 minutes (type definitions)

**Total: ~30 minutes**

## Testing Checklist
- [ ] Generate preview, unmount component mid-generation - no warnings
- [ ] Start new preview while one is generating - old one cancels
- [ ] Move steps up/down works correctly
- [ ] Boundary moves don't trigger unnecessary parent updates
- [ ] Screen reader correctly navigates avatar/voice selectors
- [ ] All PropTypes pass validation with real API data
