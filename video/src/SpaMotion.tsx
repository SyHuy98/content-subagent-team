import React from 'react';
import { AbsoluteFill, Audio, Series, useVideoConfig } from 'remotion';
import { Disclaimer, Logo, SceneFade } from './parts/common';
import { SceneView } from './parts/scenes';
import { brandOf, media, SIZES } from './theme';
import type { SpaMotionProps } from './types';

/** Video motion từ ảnh + chữ: chuỗi cảnh (tiêu đề, ảnh, gạch đầu dòng, ưu đãi, CTA…). */
export const SpaMotion: React.FC<SpaMotionProps> = ({ scenes, brand: b, music, disclaimer }) => {
  const brand = brandOf(b);
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: brand.background }}>
      <Series>
        {scenes.map((scene, i) => (
          <Series.Sequence key={i} durationInFrames={Math.max(1, Math.round(scene.duration * fps))}>
            <SceneFade><SceneView scene={scene} brand={brand} /></SceneFade>
          </Series.Sequence>
        ))}
      </Series>
      <Logo brand={brand} />
      <Disclaimer text={disclaimer} brand={brand} />
      {music?.src && <Audio src={media(music.src)!} volume={music.volume ?? 0.6} loop />}
    </AbsoluteFill>
  );
};

export const spaMotionMetadata = ({ props }: { props: SpaMotionProps }) => {
  const fps = props.fps || 30;
  const total = props.scenes.reduce((s, sc) => s + Math.max(0.5, Number(sc.duration) || 3), 0);
  const [width, height] = SIZES[props.ratio] || SIZES['9:16'];
  return { fps, width, height, durationInFrames: Math.max(1, Math.round(total * fps)) };
};
