import React from 'react';
import PropTypes from 'prop-types';

/**
 * Reusable stats card component
 * Used across dashboard, campaigns, and ICP pages
 */
function StatsCard({ title, value, subtitle, icon: Icon, trend, color = 'blue' }) {
  const colorClasses = {
    blue: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-400',
    green: 'from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-400',
    amber: 'from-amber-500/20 to-yellow-500/20 border-amber-500/30 text-amber-400',
    red: 'from-red-500/20 to-rose-500/20 border-red-500/30 text-red-400',
    purple: 'from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-400',
    slate: 'from-slate-500/20 to-slate-600/20 border-slate-500/30 text-slate-400',
  };

  const trendColors = {
    up: 'text-green-400',
    down: 'text-red-400',
    neutral: 'text-slate-400',
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-lg p-4`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-slate-400 mb-1">{title}</p>
          <p className="text-2xl font-semibold text-white mb-1">{value}</p>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
          {trend && (
            <p className={`text-xs mt-2 ${trendColors[trend.direction] || trendColors.neutral}`}>
              {trend.value} {trend.label}
            </p>
          )}
        </div>
        {Icon && (
          <div className={`p-2 rounded-lg bg-slate-900/50`}>
            <Icon size={20} className={colorClasses[color].split(' ')[2]} />
          </div>
        )}
      </div>
    </div>
  );
}

StatsCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  subtitle: PropTypes.string,
  icon: PropTypes.elementType,
  trend: PropTypes.shape({
    direction: PropTypes.oneOf(['up', 'down', 'neutral']),
    value: PropTypes.string.isRequired,
    label: PropTypes.string,
  }),
  color: PropTypes.oneOf(['blue', 'green', 'amber', 'red', 'purple', 'slate']),
};

StatsCard.defaultProps = {
  color: 'blue',
  subtitle: null,
  icon: null,
  trend: null,
};

export default StatsCard;
