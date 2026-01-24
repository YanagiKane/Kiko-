import React, { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

// Safe registration check
if (typeof window !== 'undefined' && gsap && ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);
}

interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  ease?: string;
  from?: gsap.TweenVars;
  to?: gsap.TweenVars;
  threshold?: number;
  rootMargin?: string;
  textAlign?: 'left' | 'right' | 'center' | 'justify' | 'start' | 'end';
  tag?: string;
  onLetterAnimationComplete?: () => void;
}

const SplitText: React.FC<SplitTextProps> = ({
  text,
  className = '',
  delay = 50,
  duration = 1.25,
  ease = 'power3.out',
  from = { opacity: 0, y: 40 },
  to = { opacity: 1, y: 0 },
  threshold = 0.1,
  rootMargin = '-100px',
  textAlign = 'center',
  tag = 'p',
  onLetterAnimationComplete
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    if (document.fonts.status === 'loaded') {
      setFontsLoaded(true);
    } else {
      document.fonts.ready.then(() => {
        setFontsLoaded(true);
      });
    }
  }, []);

  useEffect(() => {
    if (!ref.current || !fontsLoaded) return;
    
    const el = ref.current;
    const targets = el.querySelectorAll('.split-char');
    
    if (targets.length === 0) return;

    const ctx = gsap.context(() => {
        gsap.fromTo(
            targets,
            from,
            {
            ...to,
            duration,
            ease,
            stagger: delay / 1000,
            scrollTrigger: {
                trigger: el,
                start: `top ${100 - (threshold * 100)}%`,
                once: true,
                fastScrollEnd: true,
            },
            onComplete: onLetterAnimationComplete,
            willChange: 'transform, opacity',
            force3D: true
            }
        );
    }, ref);

    return () => ctx.revert();
  }, [fontsLoaded, text, delay, duration, ease, threshold, onLetterAnimationComplete]);

  const Tag = tag as any;
  const words = text.split(' ');

  return (
    <Tag 
      ref={ref} 
      className={`${className} split-parent`} 
      style={{ textAlign, display: 'inline-block', overflow: 'hidden' }}
    >
      {words.map((word, i) => (
        <span key={i} style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
          {word.split('').map((char, j) => (
            <span 
              key={j} 
              className="split-char" 
              style={{ display: 'inline-block', willChange: 'transform, opacity' }}
            >
              {char}
            </span>
          ))}
          {i < words.length - 1 && (
            <span className="split-char" style={{ display: 'inline-block' }}>&nbsp;</span>
          )}
        </span>
      ))}
    </Tag>
  );
};

export default SplitText;