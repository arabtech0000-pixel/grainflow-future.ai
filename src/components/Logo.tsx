import React, { useState } from 'react';
import { Wheat } from 'lucide-react';

interface LogoProps {
  className?: string;
  iconClassName?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = "", iconClassName = "w-8 h-8" }) => {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className={`flex items-center justify-center overflow-hidden ${className}`}>
      {!imgFailed ? (
        <img 
          src="/logo.png" 
          alt="Grain Flow Logo" 
          className={`object-contain ${iconClassName}`}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <Wheat className={`text-slate-950 ${iconClassName}`} strokeWidth={2.5} />
      )}
    </div>
  );
};
