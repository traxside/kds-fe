'use client';

import { useEffect, useState } from 'react';

export default function StyleLoader({ children }: { children: React.ReactNode }) {
  const [stylesLoaded, setStylesLoaded] = useState(false);

  useEffect(() => {
    const checkStyles = () => {
      // Check if Tailwind CSS has loaded by testing for a known class
      const testElement = document.createElement('div');
      testElement.className = 'opacity-0 bg-surface text-primary';
      testElement.style.position = 'absolute';
      testElement.style.top = '-9999px';
      testElement.style.left = '-9999px';
      document.body.appendChild(testElement);

      const computedStyle = window.getComputedStyle(testElement);
      const opacity = computedStyle.opacity;
      const backgroundColor = computedStyle.backgroundColor;
      
      document.body.removeChild(testElement);

      // Check if both Tailwind utilities and custom CSS variables are loaded
      const isStylesLoaded = opacity === '0' && backgroundColor.includes('18'); // #121212 contains rgb(18, 18, 18)

      if (isStylesLoaded) {
        setStylesLoaded(true);
        // Add css-loaded class to html for CSS-based loading control
        document.documentElement.classList.add('css-loaded');
      } else {
        // Retry after a short delay, but don't wait forever
        setTimeout(checkStyles, 50);
      }
    };

    // Initial check
    checkStyles();

    // Cleanup: remove css-loaded class when component unmounts
    return () => {
      document.documentElement.classList.remove('css-loaded');
    };
  }, []);

  // Don't show loading state as CSS handles it now
  return <>{children}</>;
} 