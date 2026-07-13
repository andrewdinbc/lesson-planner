import React, { useState } from 'react';

export default function Tooltip({ children, text, position = 'top' }) {
  const [visible, setVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2',
    right: 'left-full ml-2'
  };

  return (
    <div className="relative inline-block group">
      <div
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
      >
        {children}
      </div>
      {visible && (
        <div
          className={`absolute ${positionClasses[position]} left-1/2 -translate-x-1/2 
            bg-gray-900 text-white text-xs rounded px-3 py-2 whitespace-nowrap z-50
            pointer-events-none`}
        >
          {text}
        </div>
      )}
    </div>
  );
}