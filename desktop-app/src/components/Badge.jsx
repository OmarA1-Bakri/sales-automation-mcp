import React from 'react';
import PropTypes from 'prop-types';

/**
 * Reusable badge component
 * Used for status indicators, tags, and labels
 */
function Badge({ children, variant = 'default', size = 'md', icon: Icon }) {
  const variantClasses = {
    default: 'bg-slate-700/50 text-slate-300 border-slate-600/50',
    success: 'bg-green-500/20 text-green-400 border-green-500/30',
    warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    error: 'bg-red-500/20 text-red-400 border-red-500/30',
    info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <span
      className={`inline-flex items-center space-x-1 rounded-full border font-medium ${variantClasses[variant]} ${sizeClasses[size]}`}
    >
      {Icon && <Icon size={size === 'sm' ? 12 : size === 'md' ? 14 : 16} />}
      <span>{children}</span>
    </span>
  );
}

Badge.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['default', 'success', 'warning', 'error', 'info', 'purple']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  icon: PropTypes.elementType,
};

Badge.defaultProps = {
  variant: 'default',
  size: 'md',
  icon: null,
};

export default Badge;
