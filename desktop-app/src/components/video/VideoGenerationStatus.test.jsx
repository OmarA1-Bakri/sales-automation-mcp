/**
 * VideoGenerationStatus Component Tests
 *
 * Tests for the video generation status badge component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import VideoGenerationStatus from './VideoGenerationStatus';

describe('VideoGenerationStatus', () => {
  describe('status labels', () => {
    it('should display "Draft" for draft status', () => {
      render(<VideoGenerationStatus status="draft" />);
      expect(screen.getByText('Draft')).toBeInTheDocument();
    });

    it('should display "Generating" for generating status', () => {
      render(<VideoGenerationStatus status="generating" />);
      expect(screen.getByText('Generating')).toBeInTheDocument();
    });

    it('should display "Pending" for pending status', () => {
      render(<VideoGenerationStatus status="pending" />);
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('should display "Processing" for processing status', () => {
      render(<VideoGenerationStatus status="processing" />);
      expect(screen.getByText('Processing')).toBeInTheDocument();
    });

    it('should display "Ready" for completed status', () => {
      render(<VideoGenerationStatus status="completed" />);
      expect(screen.getByText('Ready')).toBeInTheDocument();
    });

    it('should display "Failed" for failed status', () => {
      render(<VideoGenerationStatus status="failed" />);
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });
  });

  describe('default behavior', () => {
    it('should default to draft status when no status provided', () => {
      render(<VideoGenerationStatus />);
      expect(screen.getByText('Draft')).toBeInTheDocument();
    });

    it('should default to draft for unknown status', () => {
      render(<VideoGenerationStatus status="unknown" />);
      expect(screen.getByText('Draft')).toBeInTheDocument();
    });
  });

  describe('progress display', () => {
    it('should show progress percentage for generating status', () => {
      render(<VideoGenerationStatus status="generating" progress={45} />);
      expect(screen.getByText('Generating')).toBeInTheDocument();
      expect(screen.getByText('45%')).toBeInTheDocument();
    });

    it('should show progress percentage for processing status', () => {
      render(<VideoGenerationStatus status="processing" progress={80} />);
      expect(screen.getByText('Processing')).toBeInTheDocument();
      expect(screen.getByText('80%')).toBeInTheDocument();
    });

    it('should not show progress when progress is 0', () => {
      render(<VideoGenerationStatus status="generating" progress={0} />);
      expect(screen.getByText('Generating')).toBeInTheDocument();
      expect(screen.queryByText('0%')).not.toBeInTheDocument();
    });

    it('should not show progress for draft status', () => {
      render(<VideoGenerationStatus status="draft" progress={50} />);
      expect(screen.getByText('Draft')).toBeInTheDocument();
      expect(screen.queryByText('50%')).not.toBeInTheDocument();
    });

    it('should not show progress for completed status', () => {
      render(<VideoGenerationStatus status="completed" progress={100} />);
      expect(screen.getByText('Ready')).toBeInTheDocument();
      expect(screen.queryByText('100%')).not.toBeInTheDocument();
    });

    it('should not show progress for failed status', () => {
      render(<VideoGenerationStatus status="failed" progress={25} />);
      expect(screen.getByText('Failed')).toBeInTheDocument();
      expect(screen.queryByText('25%')).not.toBeInTheDocument();
    });

    it('should not show progress for pending status', () => {
      render(<VideoGenerationStatus status="pending" progress={10} />);
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.queryByText('10%')).not.toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should have green styling for completed status', () => {
      const { container } = render(<VideoGenerationStatus status="completed" />);
      const badge = container.firstChild;
      expect(badge).toHaveClass('bg-green-600/20');
      expect(badge).toHaveClass('text-green-400');
    });

    it('should have red styling for failed status', () => {
      const { container } = render(<VideoGenerationStatus status="failed" />);
      const badge = container.firstChild;
      expect(badge).toHaveClass('bg-red-600/20');
      expect(badge).toHaveClass('text-red-400');
    });

    it('should have amber styling for generating status', () => {
      const { container } = render(<VideoGenerationStatus status="generating" />);
      const badge = container.firstChild;
      expect(badge).toHaveClass('bg-amber-600/20');
      expect(badge).toHaveClass('text-amber-400');
    });

    it('should have blue styling for pending status', () => {
      const { container } = render(<VideoGenerationStatus status="pending" />);
      const badge = container.firstChild;
      expect(badge).toHaveClass('bg-blue-600/20');
      expect(badge).toHaveClass('text-blue-400');
    });

    it('should have slate styling for draft status', () => {
      const { container } = render(<VideoGenerationStatus status="draft" />);
      const badge = container.firstChild;
      expect(badge).toHaveClass('bg-slate-600/20');
      expect(badge).toHaveClass('text-slate-400');
    });
  });

  describe('icon presence', () => {
    it('should render an icon for each status', () => {
      const statuses = ['draft', 'generating', 'pending', 'processing', 'completed', 'failed'];

      statuses.forEach((status) => {
        const { container, unmount } = render(<VideoGenerationStatus status={status} />);
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
        unmount();
      });
    });
  });
});
