import { MechanicalCounter } from "./MechanicalCounter";

interface Props {
  score: number;
}

export function EfficiencyCore({ score }: Props) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return "text-energy-green";
    if (s >= 60) return "text-idle-amber";
    if (s >= 40) return "text-funding-blue";
    return "text-risk-red";
  };

  const getRiskWeight = (s: number) => {
    if (s >= 80) return "risk-low";
    if (s >= 60) return "risk-medium";
    if (s >= 40) return "risk-high";
    return "risk-critical";
  };

  const getLabel = (s: number) => {
    if (s >= 80) return "OPTIMAL";
    if (s >= 60) return "MODERATE";
    if (s >= 40) return "SUBOPTIMAL";
    return "CRITICAL";
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-[0.6rem] font-grotesk text-muted-foreground tracking-[0.3em] uppercase">
        Capital Efficiency
      </div>
      <div className={`${getScoreColor(score)} ${getRiskWeight(score)}`}>
        <MechanicalCounter value={score} decimals={0} className="text-4xl" />
      </div>
      <div className={`text-[0.55rem] tracking-[0.25em] ${getScoreColor(score)} opacity-60`}>
        {getLabel(score)}
      </div>
    </div>
  );
}
