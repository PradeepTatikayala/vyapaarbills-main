import React from 'react';
import { motion } from 'framer-motion';

interface UiCardProps {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
}

export const UiCard: React.FC<UiCardProps> = ({ 
  children, 
  className = '', 
  interactive = false 
}) => {
  const Component = interactive ? motion.div : 'div';
  const motionProps = interactive ? {
    whileHover: { y: -4 },
    transition: { type: 'spring', stiffness: 300, damping: 20 }
  } : {};

  return (
    <Component 
      className={`ui-card overflow-hidden relative ${className}`}
      {...motionProps as any}
    >
      {children}
    </Component>
  );
};
