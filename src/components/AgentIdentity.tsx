'use client';

import type { AgentIdentity as AgentIdentityType } from '@/lib/ens/identity';

interface AgentIdentityProps {
  identity: AgentIdentityType;
  compact?: boolean;
}

export function AgentIdentityCard({ identity, compact }: AgentIdentityProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full overflow-hidden bg-nova-accent/20 flex-shrink-0">
          {identity.avatar ? (
            <img src={identity.avatar} alt={identity.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-nova-accent">
              N
            </div>
          )}
        </div>
        <span className="text-xs font-medium text-nova-accent-light">{identity.name}</span>
      </div>
    );
  }

  return (
    <div className="nova-card space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl overflow-hidden bg-nova-accent/20 flex-shrink-0">
          {identity.avatar ? (
            <img src={identity.avatar} alt={identity.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-lg font-bold text-nova-accent">
              N
            </div>
          )}
        </div>
        <div>
          <p className="text-sm font-medium nova-gradient-text">{identity.name}</p>
          <p className="text-[10px] font-mono text-nova-muted">
            {identity.address.slice(0, 6)}...{identity.address.slice(-4)}
          </p>
        </div>
      </div>

      {identity.description && (
        <p className="text-xs text-nova-muted">{identity.description}</p>
      )}

      {identity.skills && identity.skills.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {identity.skills.map(skill => (
            <span
              key={skill}
              className="px-2 py-0.5 rounded-full bg-nova-accent/10 text-[10px] text-nova-accent-light border border-nova-accent/20"
            >
              {skill}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
