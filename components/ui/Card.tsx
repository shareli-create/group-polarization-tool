
import React from 'react';

// FIX: Extend with React.HTMLAttributes<HTMLDivElement> to allow passing DOM props like onDragOver and onDrop.
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '', ...props }) => {
  return (
    <div className={`bg-white shadow-md rounded-lg p-6 ${className}`} {...props}>
      {children}
    </div>
  );
};

export default Card;
