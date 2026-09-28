import { getProgressBarClass } from "@/utils";
import { getProgressLevel } from "@/utils/progress";

export const ProgressBar = ({
  value,
  offline = false,
  h = "h-3",
  className,
}: {
  value: number;
  offline?: boolean;
  h?: string;
  className?: string;
}) => {
  const clampedValue = Math.max(0, Math.min(100, value));
  const progressRoundedClass =
    clampedValue < 10 ? "rounded-sm" : "rounded-full";
  const level = getProgressLevel(clampedValue, offline);

  return (
    <div
      className={`purcarte-progress w-full bg-(--accent-4)/50 dark:bg-(--accent-a5) rounded-full ${h} overflow-hidden`}
      data-level={level}>
      <div
        className={`purcarte-progress-fill ${h} ${progressRoundedClass} transition-all duration-500 ${getProgressBarClass(
          clampedValue
        )} ${className}`}
        style={{ width: `${clampedValue}%` }}></div>
    </div>
  );
};
