---
description: End-to-End Frontend UX/UI Modernization
---

# Frontend UX/UI Modernization Workflow

This workflow performs a comprehensive review of the frontend application to identify opportunities for UX/UI modernization, performance optimization, and code quality improvements.

## Steps

1. **Project Structure Analysis**
   - Analyze the `desktop-app` directory structure.
   - Review `package.json` for dependencies and scripts.
   - Check `vite.config.js` and `electron` setup.

2. **Design System & Styling Review**
   - Review `tailwind.config.js` for theme configuration.
   - Analyze global styles (e.g., `src/index.css` or `styles/`).
   - Check for consistency in color palette, typography, and spacing.

3. **Component Architecture Review**
   - List key components in `src/components`.
   - Review a sample of components for:
     - Component structure and reusability.
     - Usage of Tailwind classes vs custom CSS.
     - Accessibility (ARIA attributes, semantic HTML).
     - State management patterns.

4. **UX/UI Heuristic Evaluation**
   - Evaluate the application against modern design trends (Glassmorphism, Dark Mode, Micro-interactions).
   - Identify areas where the UI looks outdated or "basic".
   - Propose specific visual improvements.

5. **Generate Modernization Report**
   - Compile findings into a `FRONTEND_REVIEW.md` file.
   - Create a prioritized list of tasks for modernization.
