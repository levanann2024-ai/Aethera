import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';

export function ActionTile({ icon, title, text, onClick }: { icon: ReactNode; title: string; text: string; onClick: () => void }) {
  return (
    <button className="action-tile" onClick={onClick}>
      <span className="action-icon">{icon}</span>
      <span className="action-copy"><strong>{title}</strong><span>{text}</span></span>
      <ArrowRight size={17} />
    </button>
  );
}
