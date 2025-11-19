import React from 'react';
import PropTypes from 'prop-types';
import { Loader2 } from 'lucide-react';

/**
 * Reusable button component
 * Consistent styling and behavior across the app
 */
function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  className = '',
}) {
  const baseClasses =
    'inline-flex items-center justify-center space-x-2 font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    primary:
      'bg-gradient-primary text-white hover:shadow-lg hover:shadow-blue-500/20 disabled:hover:shadow-none',
    secondary:
      'bg-slate-700 text-white hover:bg-slate-600 border border-slate-600',
    danger:
      'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30',
    success:
      'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30',
    ghost:
      'text-slate-400 hover:text-white hover:bg-slate-800',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {loading ? (
        <Loader2 size={size === 'sm' ? 14 : size === 'md' ? 16 : 18} className="animate-spin" />
      ) : (
        Icon && <Icon size={size === 'sm' ? 14 : size === 'md' ? 16 : 18} />
      )}
      <span>{children}</span>
    </button>
  );
}

Button.propTypes = {
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger', 'success', 'ghost']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  loading: PropTypes.bool,
  disabled: PropTypes.bool,
  icon: PropTypes.elementType,
  className: PropTypes.string,
};

Button.defaultProps = {
  onClick: undefined,
  type: 'button',
  variant: 'primary',
  size: 'md',
  loading: false,
  disabled: false,
  icon: null,
  className: '',
};

export default Button;
