import WORKING_WITH_US from '../../data/workingWithUs.json';
import { InteractiveConsole } from '@ui/widgets/InteractiveConsole.jsx';

export function TechStackConsole({
  className = '',
  data = WORKING_WITH_US.whyUs.techStackConsole,
  initialCommands,
  animate = false,
  animationPreset = 'fade-up',
  animationOrder,
}) {
  return (
    <InteractiveConsole
      className={className}
      data={data}
      initialCommands={initialCommands}
      animate={animate}
      animationPreset={animationPreset}
      animationOrder={animationOrder}
    />
  );
}
