import { Composition } from 'remotion';
import { RemediationDemo, DEMO } from './RemediationDemo';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="RemediationDemo"
        component={RemediationDemo}
        durationInFrames={DEMO.durationInFrames}
        fps={DEMO.fps}
        width={1920}
        height={1080}
      />
    </>
  );
};
