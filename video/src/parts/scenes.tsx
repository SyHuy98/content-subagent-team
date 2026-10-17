import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONTS, type brandOf } from '../theme';
import type { Scene } from '../types';
import { Background, CaptionBox, CoverImage, useEnter, useUnit } from './common';

type B = ReturnType<typeof brandOf>;

const Center: React.FC<{ children: React.ReactNode; gap?: number }> = ({ children, gap = 40 }) => {
  const u = useUnit();
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: `${140 * u}px ${90 * u}px`, gap: gap * u, textAlign: 'center' }}>
      {children}
    </AbsoluteFill>
  );
};

const Heading: React.FC<{ text: string; color: string; size?: number; delay?: number }> = ({ text, color, size = 96, delay = 0 }) => {
  const u = useUnit();
  return <div style={{ fontFamily: FONTS.heading, fontWeight: 700, fontSize: size * u, lineHeight: 1.15, color, ...useEnter(delay) }}>{text}</div>;
};

const Sub: React.FC<{ text: string; color: string; delay?: number; size?: number }> = ({ text, color, delay = 0.25, size = 46 }) => {
  const u = useUnit();
  return <div style={{ fontFamily: FONTS.body, fontWeight: 400, fontSize: size * u, lineHeight: 1.4, color, opacity: 0.9, ...useEnter(delay) }}>{text}</div>;
};

const Divider: React.FC<{ color: string; delay?: number }> = ({ color, delay = 0.15 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const u = useUnit();
  const w = spring({ frame: frame - delay * fps, fps, config: { damping: 200 } }) * 160 * u;
  return <div style={{ width: w, height: 6 * u, borderRadius: 3 * u, background: color }} />;
};

export const SceneView: React.FC<{ scene: Scene; brand: B }> = ({ scene, brand }) => {
  const u = useUnit();
  switch (scene.type) {
    case 'title':
      return (
        <AbsoluteFill>
          {scene.image ? <CoverImage src={scene.image} dim={0.65} /> : <Background brand={brand} />}
          <Center>
            <Heading text={scene.heading} color={scene.image ? '#fff' : brand.text} size={110} />
            <Divider color={brand.accent} />
            {scene.sub && <Sub text={scene.sub} color={scene.image ? '#fff' : brand.text} />}
          </Center>
        </AbsoluteFill>
      );
    case 'image':
      return (
        <AbsoluteFill>
          <CoverImage src={scene.image} zoom={scene.zoom} dim={scene.caption ? 0.25 : 0} />
          {scene.caption && <CaptionBox text={scene.caption} brand={brand} />}
        </AbsoluteFill>
      );
    case 'bullets':
      return (
        <AbsoluteFill>
          {scene.image ? <CoverImage src={scene.image} dim={0.7} /> : <Background brand={brand} />}
          <Center gap={34}>
            <Heading text={scene.heading} color={scene.image ? '#fff' : brand.text} size={84} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 26 * u, alignItems: 'stretch', width: '100%' }}>
              {scene.items.map((it, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 24 * u, background: 'rgba(255,255,255,.92)', borderRadius: 26 * u,
                  padding: `${22 * u}px ${30 * u}px`, fontFamily: FONTS.body, fontWeight: 600, fontSize: 44 * u, color: brand.text,
                  textAlign: 'left', boxShadow: '0 8px 24px rgba(0,0,0,.08)', ...useEnter(0.35 + i * 0.25),
                }}>
                  <span style={{ flex: 'none', width: 56 * u, height: 56 * u, borderRadius: '50%', background: brand.primary, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 34 * u }}>✓</span>
                  <span>{it}</span>
                </div>
              ))}
            </div>
          </Center>
        </AbsoluteFill>
      );
    case 'steps':
      return (
        <AbsoluteFill>
          <Background brand={brand} />
          <Center gap={34}>
            <Heading text={scene.heading} color={brand.text} size={84} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 30 * u, width: '100%' }}>
              {scene.steps.map((st, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 28 * u, textAlign: 'left', ...useEnter(0.35 + i * 0.3) }}>
                  <span style={{
                    flex: 'none', width: 92 * u, height: 92 * u, borderRadius: 28 * u, background: brand.accent, color: '#fff',
                    display: 'grid', placeItems: 'center', fontFamily: FONTS.heading, fontWeight: 700, fontSize: 52 * u,
                  }}>{i + 1}</span>
                  <span style={{ fontFamily: FONTS.body, fontWeight: 600, fontSize: 46 * u, color: brand.text, lineHeight: 1.3 }}>{st}</span>
                </div>
              ))}
            </div>
          </Center>
        </AbsoluteFill>
      );
    case 'offer': {
      return (
        <AbsoluteFill>
          <Background brand={brand} />
          <Center gap={30}>
            {scene.badge && (
              <div style={{
                fontFamily: FONTS.body, fontWeight: 800, fontSize: 40 * u, color: '#fff', background: brand.primary,
                padding: `${14 * u}px ${34 * u}px`, borderRadius: 999, letterSpacing: 2 * u, ...useEnter(0),
              }}>{scene.badge}</div>
            )}
            <Heading text={scene.heading} color={brand.text} size={88} delay={0.1} />
            {scene.oldPrice && <div style={{ fontFamily: FONTS.body, fontSize: 52 * u, color: brand.text, opacity: 0.55, textDecoration: 'line-through', ...useEnter(0.3) }}>{scene.oldPrice}</div>}
            {scene.price && <PricePop text={scene.price} color={brand.accent} />}
            {scene.note && <Sub text={scene.note} color={brand.text} delay={0.6} size={40} />}
          </Center>
        </AbsoluteFill>
      );
    }
    case 'quote':
      return (
        <AbsoluteFill>
          <Background brand={brand} />
          <Center gap={30}>
            <div style={{ fontFamily: FONTS.heading, fontSize: 220 * u, lineHeight: 0.6, color: brand.accent, ...useEnter(0) }}>“</div>
            <div style={{ fontFamily: FONTS.heading, fontStyle: 'italic', fontSize: 68 * u, lineHeight: 1.35, color: brand.text, ...useEnter(0.15) }}>{scene.text}</div>
            {scene.author && <Sub text={`— ${scene.author}`} color={brand.text} delay={0.4} />}
          </Center>
        </AbsoluteFill>
      );
    case 'cta':
      return (
        <AbsoluteFill>
          <AbsoluteFill style={{ background: `linear-gradient(160deg, ${brand.primary} 0%, ${brand.accent} 100%)` }} />
          <Center gap={36}>
            <Heading text={scene.heading} color="#fff" size={100} />
            {scene.sub && <Sub text={scene.sub} color="#fff" />}
            {scene.contact && <Pulse text={scene.contact} brand={brand} />}
          </Center>
        </AbsoluteFill>
      );
    default:
      return <Background brand={brand} />;
  }
};

const PricePop: React.FC<{ text: string; color: string }> = ({ text, color }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const u = useUnit();
  const s = spring({ frame: frame - 0.45 * fps, fps, config: { damping: 9, stiffness: 120 } });
  return <div style={{ fontFamily: FONTS.heading, fontWeight: 700, fontSize: 150 * u, color, transform: `scale(${s})` }}>{text}</div>;
};

const Pulse: React.FC<{ text: string; brand: B }> = ({ text, brand }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const u = useUnit();
  const s = 1 + Math.sin(frame / (fps / 3)) * 0.03;
  const enter = useEnter(0.45);
  return (
    <div style={{ ...enter, transform: `${enter.transform} scale(${interpolate(s, [0.97, 1.03], [0.97, 1.03])})` }}>
      <div style={{
        fontFamily: FONTS.body, fontWeight: 800, fontSize: 50 * u, color: brand.text, background: '#fff',
        padding: `${24 * u}px ${48 * u}px`, borderRadius: 999, boxShadow: '0 12px 30px rgba(0,0,0,.2)',
      }}>{text}</div>
    </div>
  );
};
