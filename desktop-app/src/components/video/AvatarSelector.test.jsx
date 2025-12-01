/**
 * AvatarSelector Component Tests
 *
 * Tests for the avatar selection grid component used in video creation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AvatarSelector from './AvatarSelector';

// Sample avatar data
const mockAvatars = [
  { id: 'avatar-1', name: 'Alex', gender: 'male', previewUrl: 'https://example.com/alex.jpg' },
  { id: 'avatar-2', name: 'Sarah', gender: 'female', previewUrl: 'https://example.com/sarah.jpg' },
  { id: 'avatar-3', name: 'Jordan', gender: 'non-binary', previewUrl: 'https://example.com/jordan.jpg' }
];

describe('AvatarSelector', () => {
  let mockOnChange;

  beforeEach(() => {
    mockOnChange = vi.fn();
  });

  describe('initial render', () => {
    it('should render with "Select an avatar" placeholder when no avatar selected', () => {
      render(
        <AvatarSelector
          avatars={mockAvatars}
          selectedId={null}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Select an avatar...')).toBeInTheDocument();
    });

    it('should render the label', () => {
      render(
        <AvatarSelector
          avatars={mockAvatars}
          selectedId={null}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('AI Avatar')).toBeInTheDocument();
    });

    it('should display selected avatar when selectedId is provided', () => {
      render(
        <AvatarSelector
          avatars={mockAvatars}
          selectedId="avatar-2"
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Sarah')).toBeInTheDocument();
      expect(screen.getByText('female')).toBeInTheDocument();
    });

    it('should render combobox with correct aria attributes', () => {
      render(
        <AvatarSelector
          avatars={mockAvatars}
          selectedId={null}
          onChange={mockOnChange}
        />
      );

      const combobox = screen.getByRole('combobox');
      expect(combobox).toHaveAttribute('aria-expanded', 'false');
      expect(combobox).toHaveAttribute('aria-haspopup', 'listbox');
      expect(combobox).toHaveAttribute('aria-controls', 'avatar-selector-listbox');
    });
  });

  describe('dropdown interaction', () => {
    it('should expand dropdown when clicked', async () => {
      const user = userEvent.setup();
      render(
        <AvatarSelector
          avatars={mockAvatars}
          selectedId={null}
          onChange={mockOnChange}
        />
      );

      const combobox = screen.getByRole('combobox');
      await user.click(combobox);

      expect(combobox).toHaveAttribute('aria-expanded', 'true');
    });

    it('should show avatar grid when expanded', async () => {
      const user = userEvent.setup();
      render(
        <AvatarSelector
          avatars={mockAvatars}
          selectedId={null}
          onChange={mockOnChange}
        />
      );

      await user.click(screen.getByRole('combobox'));

      // Check all avatars are displayed
      const listbox = screen.getByRole('listbox');
      expect(listbox).toBeInTheDocument();
      expect(screen.getAllByRole('option')).toHaveLength(3);
    });

    it('should close dropdown when avatar is selected', async () => {
      const user = userEvent.setup();
      render(
        <AvatarSelector
          avatars={mockAvatars}
          selectedId={null}
          onChange={mockOnChange}
        />
      );

      await user.click(screen.getByRole('combobox'));

      const options = screen.getAllByRole('option');
      await user.click(options[1]); // Select Sarah

      expect(mockOnChange).toHaveBeenCalledWith('avatar-2');
      expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false');
    });

    it('should toggle dropdown with keyboard Enter', async () => {
      const user = userEvent.setup();
      render(
        <AvatarSelector
          avatars={mockAvatars}
          selectedId={null}
          onChange={mockOnChange}
        />
      );

      const combobox = screen.getByRole('combobox');
      combobox.focus();
      await user.keyboard('{Enter}');

      expect(combobox).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('search functionality', () => {
    it('should filter avatars by name', async () => {
      const user = userEvent.setup();
      render(
        <AvatarSelector
          avatars={mockAvatars}
          selectedId={null}
          onChange={mockOnChange}
        />
      );

      await user.click(screen.getByRole('combobox'));

      const searchInput = screen.getByPlaceholderText('Search avatars...');
      await user.type(searchInput, 'alex');

      expect(screen.getAllByRole('option')).toHaveLength(1);
      expect(screen.getByLabelText('Select Alex avatar')).toBeInTheDocument();
    });

    it('should filter avatars by gender', async () => {
      const user = userEvent.setup();
      render(
        <AvatarSelector
          avatars={mockAvatars}
          selectedId={null}
          onChange={mockOnChange}
        />
      );

      await user.click(screen.getByRole('combobox'));

      const searchInput = screen.getByPlaceholderText('Search avatars...');
      await user.type(searchInput, 'female');

      expect(screen.getAllByRole('option')).toHaveLength(1);
    });

    it('should show no results message when no matches', async () => {
      const user = userEvent.setup();
      render(
        <AvatarSelector
          avatars={mockAvatars}
          selectedId={null}
          onChange={mockOnChange}
        />
      );

      await user.click(screen.getByRole('combobox'));

      const searchInput = screen.getByPlaceholderText('Search avatars...');
      await user.type(searchInput, 'nonexistent');

      expect(screen.getByText(/No avatars found matching "nonexistent"/)).toBeInTheDocument();
    });

    it('should be case-insensitive', async () => {
      const user = userEvent.setup();
      render(
        <AvatarSelector
          avatars={mockAvatars}
          selectedId={null}
          onChange={mockOnChange}
        />
      );

      await user.click(screen.getByRole('combobox'));

      const searchInput = screen.getByPlaceholderText('Search avatars...');
      await user.type(searchInput, 'SARAH');

      expect(screen.getAllByRole('option')).toHaveLength(1);
    });
  });

  describe('selection state', () => {
    it('should highlight selected avatar in grid', async () => {
      const user = userEvent.setup();
      render(
        <AvatarSelector
          avatars={mockAvatars}
          selectedId="avatar-2"
          onChange={mockOnChange}
        />
      );

      await user.click(screen.getByRole('combobox'));

      const selectedOption = screen.getByRole('option', { selected: true });
      expect(selectedOption).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('empty state', () => {
    it('should handle empty avatars array', () => {
      render(
        <AvatarSelector
          avatars={[]}
          selectedId={null}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Select an avatar...')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have accessible search input', async () => {
      const user = userEvent.setup();
      render(
        <AvatarSelector
          avatars={mockAvatars}
          selectedId={null}
          onChange={mockOnChange}
        />
      );

      await user.click(screen.getByRole('combobox'));

      const searchInput = screen.getByLabelText('Search avatars');
      expect(searchInput).toBeInTheDocument();
    });

    it('should label each avatar option', async () => {
      const user = userEvent.setup();
      render(
        <AvatarSelector
          avatars={mockAvatars}
          selectedId={null}
          onChange={mockOnChange}
        />
      );

      await user.click(screen.getByRole('combobox'));

      expect(screen.getByLabelText('Select Alex avatar')).toBeInTheDocument();
      expect(screen.getByLabelText('Select Sarah avatar')).toBeInTheDocument();
      expect(screen.getByLabelText('Select Jordan avatar')).toBeInTheDocument();
    });
  });
});
