/**
 * MagicBento Component
 * A highly interactive bento grid with spotlight effects, particle stars,
 * 3D tilt, magnetism, and border glow.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { gsap } from 'gsap';

export interface BentoCardProps {
    color?: string;
    title?: string;
    description?: string;
    label?: string;
    textAutoHide?: boolean;
}

export interface BentoProps {
    textAutoHide?: boolean;
    enableStars?: boolean;
    enableSpotlight?: boolean;
    enableBorderGlow?: boolean;
    disableAnimations?: boolean;
    spotlightRadius?: number;
    particleCount?: number;
    enableTilt?: boolean;
    glowColor?: string;
    clickEffect?: boolean;
    enableMagnetism?: boolean;
}

const DEFAULT_PARTICLE_COUNT = 10;
const DEFAULT_SPOTLIGHT_RADIUS = 300;
const DEFAULT_GLOW_COLOR = '255, 200, 70';
const MOBILE_BREAKPOINT = 768;

const cardData: BentoCardProps[] = [
    {
        color: '#0f0f0f',
        title: 'Q2 Objectives',
        description: '5/12 Milestones Complete',
        label: 'Goals'
    },
{
    color: '#0f0f0f',
    title: 'Quote of Day',
    description: 'Precision in thought, speed in execution.',
    label: 'Wisdom'
},
{
    color: '#0f0f0f',
    title: 'Sports Hub',
    description: 'LAD vs NYY · 2-1 · Final',
    label: 'Live'
},
{
    color: '#0f0f0f',
    title: 'Weather',
    description: 'Jenkintown, PA · 75°F, Partly Cloudy',
    label: 'Current'
},
{
    color: '#0f0f0f',
    title: 'Activity Feed',
    description: 'Recent tasks and milestones completed.',
    label: 'Timeline'
},
{
    color: '#0f0f0f',
    title: 'System Status',
    description: 'Uptime: 99.98% · Active Nodes: 4.122',
    label: 'Status'
}
];

const createParticleElement = (x: number, y: number, color: string = DEFAULT_GLOW_COLOR): HTMLDivElement => {
    const el = document.createElement('div');
    el.className = 'particle';
    // Variable size per firefly for organic variation
    const size = 4 + Math.random() * 4;
    el.style.cssText = `
    position: absolute;
    width: ${size}px;
    height: ${size}px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(${color}, 1) 0%, rgba(${color}, 0.5) 40%, transparent 70%);
    box-shadow:
        0 0 ${size * 1.5}px rgba(${color}, 1),
        0 0 ${size * 4}px rgba(${color}, 0.55),
        0 0 ${size * 9}px rgba(${color}, 0.25),
        0 0 ${size * 16}px rgba(${color}, 0.08);
    pointer-events: none;
    z-index: 100;
    left: ${x - size / 2}px;
    top: ${y - size / 2}px;
    `;
    return el;
};

const ParticleCard: React.FC<{
    children: React.ReactNode;
    className?: string;
    disableAnimations?: boolean;
    style?: React.CSSProperties;
    particleCount?: number;
    glowColor?: string;
    enableTilt?: boolean;
    clickEffect?: boolean;
    enableMagnetism?: boolean;
}> = ({
    children,
    className = '',
    disableAnimations = false,
    style,
    particleCount = DEFAULT_PARTICLE_COUNT,
    glowColor = DEFAULT_GLOW_COLOR,
    enableTilt = true,
    clickEffect = false,
    enableMagnetism = false
}) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const particlesRef = useRef<HTMLDivElement[]>([]);
    const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    const isHoveredRef = useRef(false);
    const magnetismAnimationRef = useRef<gsap.core.Tween | null>(null);

    const clearAllParticles = useCallback(() => {
        timeoutsRef.current.forEach(clearTimeout);
        timeoutsRef.current = [];
        magnetismAnimationRef.current?.kill();
        particlesRef.current.forEach(particle => {
            gsap.killTweensOf(particle);
            gsap.to(particle, {
                opacity: 0,
                scale: 0.4,
                duration: 1.2 + Math.random() * 0.6,
                ease: 'power1.in',
                onComplete: () => {
                    particle.parentNode?.removeChild(particle);
                }
            });
        });
        particlesRef.current = [];
    }, []);

    const animateParticles = useCallback(() => {
        if (!cardRef.current || !isHoveredRef.current) return;
        const { width, height } = cardRef.current.getBoundingClientRect();

        for (let i = 0; i < particleCount; i++) {
            // Stagger emergence — fireflies drift in one by one, not all at once
            const timeoutId = setTimeout(() => {
                if (!isHoveredRef.current || !cardRef.current) return;
                const x = Math.random() * width;
                const y = Math.random() * height;
                const particle = createParticleElement(x, y, glowColor);
                cardRef.current.appendChild(particle);
                particlesRef.current.push(particle);

                // Slow, soft fade-in — fireflies don't pop into existence
                gsap.fromTo(particle,
                    { scale: 0, opacity: 0 },
                    { scale: 1, opacity: 0.85 + Math.random() * 0.15, duration: 1.4 + Math.random() * 0.8, ease: 'power1.out' }
                );

                // Horizontal drift — independent from vertical so paths feel unscripted
                gsap.to(particle, {
                    x: (Math.random() - 0.5) * 75,
                    duration: 3.5 + Math.random() * 3.5,
                    ease: 'sine.inOut',
                    repeat: -1,
                    yoyo: true,
                    delay: Math.random() * 1.5,
                });

                // Vertical drift with upward bias — real fireflies tend to float up
                gsap.to(particle, {
                    y: -(18 + Math.random() * 38),
                    duration: 4.5 + Math.random() * 4,
                    ease: 'sine.inOut',
                    repeat: -1,
                    yoyo: true,
                    delay: Math.random() * 2,
                });

                // Bioluminescent pulse — the signature firefly blink/breathe
                gsap.to(particle, {
                    opacity: 0.04 + Math.random() * 0.18,
                    duration: 0.7 + Math.random() * 1.6,
                    ease: 'sine.inOut',
                    repeat: -1,
                    yoyo: true,
                    delay: Math.random() * 3.5,
                });
            }, i * 180 + Math.random() * 120);
            timeoutsRef.current.push(timeoutId);
        }
    }, [particleCount, glowColor]);

    useEffect(() => {
        if (disableAnimations || !cardRef.current) return;
        const element = cardRef.current;

        const handleMouseEnter = () => {
            isHoveredRef.current = true;
            animateParticles();
        };

        const handleMouseLeave = () => {
            isHoveredRef.current = false;
            clearAllParticles();
            gsap.to(element, { rotateX: 0, rotateY: 0, x: 0, y: 0, duration: 0.3, ease: 'power2.out' });
        };

        const handleMouseMove = (e: MouseEvent) => {
            const rect = element.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            if (enableTilt) {
                const rotateX = ((y - centerY) / centerY) * -8;
                const rotateY = ((x - centerX) / centerX) * 8;
                gsap.to(element, { rotateX, rotateY, duration: 0.1, ease: 'power2.out', transformPerspective: 1000 });
            }

            if (enableMagnetism) {
                const magnetX = (x - centerX) * 0.05;
                const magnetY = (y - centerY) * 0.05;
                magnetismAnimationRef.current = gsap.to(element, { x: magnetX, y: magnetY, duration: 0.3, ease: 'power2.out' });
            }
        };

        const handleClick = (e: MouseEvent) => {
            if (!clickEffect) return;
            const rect = element.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const ripple = document.createElement('div');
            ripple.style.cssText = `
            position: absolute;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: rgba(${glowColor}, 0.5);
            left: ${x}px;
            top: ${y}px;
            pointer-events: none;
            z-index: 1000;
            `;
            element.appendChild(ripple);
            gsap.fromTo(ripple, { scale: 0, opacity: 1 }, { scale: 50, opacity: 0, duration: 0.8, ease: 'power2.out', onComplete: () => ripple.remove() });
        };

        element.addEventListener('mouseenter', handleMouseEnter);
        element.addEventListener('mouseleave', handleMouseLeave);
        element.addEventListener('mousemove', handleMouseMove);
        element.addEventListener('click', handleClick);

        return () => {
            element.removeEventListener('mouseenter', handleMouseEnter);
            element.removeEventListener('mouseleave', handleMouseLeave);
            element.removeEventListener('mousemove', handleMouseMove);
            element.removeEventListener('click', handleClick);
            clearAllParticles();
        };
    }, [animateParticles, clearAllParticles, disableAnimations, enableTilt, enableMagnetism, clickEffect, glowColor]);

    return (
        <div ref={cardRef} className={className} style={{ ...style, position: 'relative', overflow: 'hidden' }}>
        {children}
        </div>
    );
};

export const MagicBento: React.FC<BentoProps> = ({
    textAutoHide = true,
    enableStars = true,
    enableSpotlight = true,
    enableBorderGlow = true,
    disableAnimations = false,
    spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
    particleCount = DEFAULT_PARTICLE_COUNT,
    enableTilt = true,
    glowColor = DEFAULT_GLOW_COLOR,
    clickEffect = true,
    enableMagnetism = true
}) => {
    const gridRef = useRef<HTMLDivElement>(null);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const shouldDisableAnimations = disableAnimations || isMobile;

    useEffect(() => {
        if (!enableSpotlight || shouldDisableAnimations) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!gridRef.current) return;
            const cards = gridRef.current.querySelectorAll('.bento-card');

            cards.forEach(card => {
                const rect = (card as HTMLElement).getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                (card as HTMLElement).style.setProperty('--mouse-x', `${x}px`);
                (card as HTMLElement).style.setProperty('--mouse-y', `${y}px`);
                (card as HTMLElement).style.setProperty('--spotlight-radius', `${spotlightRadius}px`);
                (card as HTMLElement).style.setProperty('--glow-color', `rgba(${glowColor}, 0.15)`);
            });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [enableSpotlight, shouldDisableAnimations, spotlightRadius, glowColor]);

    return (
        <div className="w-full h-full flex items-center justify-center p-8 bg-transparent">
        <style>
        {`
            .bento-grid {
                display: grid;
                gap: 1rem;
                width: 100%;
                max-width: 1000px;
                grid-template-columns: repeat(1, 1fr);
            }

            @media (min-width: 640px) {
                .bento-grid {
                    grid-template-columns: repeat(2, 1fr);
                }
            }

            @media (min-width: 1024px) {
                .bento-grid {
                    grid-template-columns: repeat(4, 1fr);
                    grid-template-rows: repeat(2, 200px);
                }
                .card-0 { grid-column: span 2; grid-row: span 1; }
                .card-1 { grid-column: span 1; grid-row: span 1; }
                .card-2 { grid-column: span 1; grid-row: span 2; }
                .card-3 { grid-column: span 1; grid-row: span 1; }
                .card-4 { grid-column: span 2; grid-row: span 1; }
                .card-5 { grid-column: span 1; grid-row: span 1; }
            }

            .bento-card {
                background: rgba(8, 8, 8, 0.40);
                backdrop-filter: blur(20px) saturate(150%);
                -webkit-backdrop-filter: blur(20px) saturate(150%);
                border: 1px solid rgba(184, 115, 51, 0.20);
                border-radius: 16px;
                position: relative;
                overflow: hidden;
                transition: border-color 0.2s ease, box-shadow 0.2s ease;
                box-shadow: 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04);
            }

            .bento-card:hover {
                border-color: rgba(184, 115, 51, 0.60);
                box-shadow: 0 8px 40px rgba(0,0,0,0.5), 0 0 20px rgba(184,115,51,0.15), inset 0 1px 0 rgba(255,255,255,0.06);
            }

            .spotlight-overlay {
                position: absolute;
                inset: 0;
                pointer-events: none;
                background: radial-gradient(
                    var(--spotlight-radius) circle at var(--mouse-x) var(--mouse-y),
                                            var(--glow-color),
                                            transparent 80%
                );
                opacity: 0;
                transition: opacity 0.3s ease;
            }

            .bento-card:hover .spotlight-overlay {
                opacity: 1;
            }

            .border-glow {
                position: absolute;
                inset: 0;
                pointer-events: none;
                border-radius: inherit;
                padding: 1px;
                background: radial-gradient(
                    var(--spotlight-radius) circle at var(--mouse-x) var(--mouse-y),
                                            rgba(${glowColor}, 0.8),
                                            transparent 40%
                );
                -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
                mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
                -webkit-mask-composite: xor;
                mask-composite: exclude;
                opacity: 0;
                transition: opacity 0.3s ease;
            }

            .bento-card:hover .border-glow {
                opacity: 1;
            }
            `}
            </style>

            <div ref={gridRef} className="bento-grid">
            {cardData.map((card, index) => {
                const Content = (
                    <div className="bento-card h-full w-full p-6 flex flex-col justify-between group">
                    <div className="spotlight-overlay" />
                    {enableBorderGlow && <div className="border-glow" />}

                    <div className="relative z-10">
                    <span className="text-xs font-medium tracking-wider text-[#d4a373] uppercase opacity-70 group-hover:opacity-100 transition-opacity">
                    {card.label}
                    </span>
                    <h3 className="text-xl font-semibold text-white mt-2">
                    {card.title}
                    </h3>
                    </div>

                    <div className="relative z-10">
                    <p className={`text-sm text-gray-400 leading-relaxed ${textAutoHide ? 'line-clamp-2' : ''}`}>
                    {card.description}
                    </p>
                    </div>
                    </div>
                );

                if (enableStars) {
                    return (
                        <ParticleCard
                        key={index}
                        className={`bento-card card-${index}`}
                        particleCount={particleCount}
                        glowColor={glowColor}
                        enableTilt={enableTilt}
                        enableMagnetism={enableMagnetism}
                        clickEffect={clickEffect}
                        disableAnimations={shouldDisableAnimations}
                        >
                        {Content}
                        </ParticleCard>
                    );
                }

                return (
                    <div key={index} className={`bento-card card-${index}`}>
                    {Content}
                    </div>
                );
            })}
            </div>
            </div>
    );
};

export default MagicBento;
