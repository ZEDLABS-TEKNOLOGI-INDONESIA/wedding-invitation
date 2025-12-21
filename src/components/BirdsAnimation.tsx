import React, { useEffect, useState } from "react";
interface Petal {
  id: number;
  left: string;
  delay: string;
  duration: string;
  size: string;
  rotation: string;
}
const FloatingPetals: React.FC = () => {
  const [petals, setPetals] = useState<Petal[]>([]);
  useEffect(() => {
    const petalCount = 15;
    const newPetals = Array.from({ length: petalCount }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 10}s`,
      duration: `${10 + Math.random() * 10}s`,
      size: `${10 + Math.random() * 20}px`,
      rotation: `${Math.random() * 360}deg`,
    }));
    setPetals(newPetals);
  }, []);
  return (
    <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden">
      {petals.map((p) => (
        <div
          key={p.id}
          className="absolute top-[-50px] bg-accent/20 dark:bg-accent/10 rounded-full blur-[1px]"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            opacity: 0.6,
            animation: `fall ${p.duration} linear infinite`,
            animationDelay: p.delay,
            transform: `rotate(${p.rotation})`,
          }}
        >
          <div className="w-full h-full rounded-[100%_0%_100%_0%_/_100%_0%_100%_0%] shadow-inner bg-accent/10"></div>
        </div>
      ))}
      <style>{`
        @keyframes fall {
          0% { transform: translateY(-10vh) translateX(0) rotate(0deg); opacity: 0; }
          10% { opacity: 0.6; }
          90% { opacity: 0.6; }
          100% { transform: translateY(110vh) translateX(100px) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
};
export default FloatingPetals;
