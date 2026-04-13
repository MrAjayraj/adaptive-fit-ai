import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useFitness } from '@/context/FitnessContext';
import { runIntegrityCheck } from '@/services/api';

// ── Helpers ────────────────────────────────────────────────────────────────────
function SectionCard({ title, children, danger }: { title: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <div
      className={`rounded-xl p-5 mb-4 ${
        danger
          ? 'border-2 border-red-500/60 bg-red-950/20'
          : 'bg-[#0E1117] border border-[#1E2330]'
      }`}
    >
      <h2
        className={`text-xs font-bold uppercase tracking-widest mb-3 ${
          danger ? 'text-red-400' : 'text-[#00E676]'
        }`}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 mb-1.5">
      <span className="text-[#6B7280] text-xs w-40 shrink-0 pt-0.5">{label}</span>
      <span className="text-[#E5E7EB] text-xs font-mono break-all">{value ?? <em className="text-[#4B5563]">—</em>}</span>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function DebugPanel() {
  const [searchParams] = useSearchParams();
  const { session } = useAuth();
  const {
    profile,
    workouts,
    gamification,
    weightLogs,
    seasonalRank,
    refreshProfile,
  } = useFitness();

  const [integrityResult, setIntegrityResult] = useState<Record<string, unknown> | null>(null);
  const [integrityLoading, setIntegrityLoading] = useState(false);
  const [integrityError, setIntegrityError] = useState<string | null>(null);
  const [reloadingProfile, setReloadingProfile] = useState(false);

  // ── Access guard ─────────────────────────────────────────────────────────────
  if (searchParams.get('key') !== 'fitpulse2026') {
    return (
      <div className="min-h-screen bg-[#06090D] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-red-400 mb-2">Access Denied</h1>
          <p className="text-[#6B7280] text-sm">Missing or invalid debug key.</p>
        </div>
      </div>
    );
  }

  const user = session?.user;

  // Derived workout stats
  const totalWorkouts = workouts.length;
  const completedWorkouts = workouts.filter(w => w.completed).length;
  const latestThree = [...workouts]
    .sort((a, b) => (b.date > a.date ? 1 : -1))
    .slice(0, 3);

  // Derived weight log stats
  const latestThreeWeightLogs = [...weightLogs]
    .sort((a, b) => (b.logged_at > a.logged_at ? 1 : -1))
    .slice(0, 3);

  // Integrity check color logic
  function integrityColor(result: Record<string, unknown>): 'green' | 'red' {
    const values = Object.values(result);
    // Check recursively for any false
    function hasAnyFalse(val: unknown): boolean {
      if (val === false) return true;
      if (typeof val === 'object' && val !== null) {
        return Object.values(val as Record<string, unknown>).some(hasAnyFalse);
      }
      return false;
    }
    return values.some(hasAnyFalse) ? 'red' : 'green';
  }

  async function handleIntegrityCheck() {
    if (!user?.id) return;
    setIntegrityLoading(true);
    setIntegrityError(null);
    try {
      const result = await runIntegrityCheck(user.id);
      setIntegrityResult(result);
    } catch (e) {
      setIntegrityError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIntegrityLoading(false);
    }
  }

  async function handleReloadProfile() {
    setReloadingProfile(true);
    try {
      await refreshProfile();
    } finally {
      setReloadingProfile(false);
    }
  }

  function handleExportData() {
    const exportPayload = {
      exportedAt: new Date().toISOString(),
      profile,
      workouts,
      gamification,
      weightLogs,
      seasonalRank,
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fitpulse-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-[#06090D] text-[#E5E7EB] pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#06090D]/90 backdrop-blur border-b border-[#1E2330] px-4 py-3 flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-[#00E676] animate-pulse" />
        <h1 className="text-sm font-bold text-[#00E676] font-mono tracking-widest uppercase">
          Debug Panel
        </h1>
        <span className="ml-auto text-[10px] text-[#4B5563] font-mono">fitpulse2026</span>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5">

        {/* 1. Auth Info */}
        <SectionCard title="Auth Info">
          <Row label="User ID" value={user?.id} />
          <Row label="Email" value={user?.email} />
          <Row
            label="Created At"
            value={user?.created_at ? new Date(user.created_at).toLocaleString() : undefined}
          />
          <Row
            label="Last Sign In"
            value={
              user?.last_sign_in_at
                ? new Date(user.last_sign_in_at).toLocaleString()
                : undefined
            }
          />
        </SectionCard>

        {/* 2. Profile Data */}
        <SectionCard title="Profile Data">
          <Row label="Name" value={profile?.name} />
          <Row label="Goal" value={profile?.goal} />
          <Row label="Experience" value={profile?.experience} />
          <Row
            label="Onboarding Complete"
            value={
              profile?.onboardingComplete !== undefined ? (
                <span
                  className={profile.onboardingComplete ? 'text-[#00E676]' : 'text-red-400'}
                >
                  {profile.onboardingComplete ? 'true' : 'false'}
                </span>
              ) : undefined
            }
          />
          <div className="mt-3">
            <button
              onClick={handleReloadProfile}
              disabled={reloadingProfile}
              className="text-xs px-3 py-1.5 rounded-lg bg-[#00E676]/10 text-[#00E676] border border-[#00E676]/30 hover:bg-[#00E676]/20 transition disabled:opacity-50"
            >
              {reloadingProfile ? 'Reloading…' : 'Reload Profile'}
            </button>
          </div>
        </SectionCard>

        {/* 3. Workout Stats */}
        <SectionCard title="Workout Stats">
          <Row label="Total Workouts" value={String(totalWorkouts)} />
          <Row label="Completed Workouts" value={String(completedWorkouts)} />
          {latestThree.length > 0 && (
            <div className="mt-2">
              <p className="text-[#6B7280] text-xs mb-1.5">Latest 3</p>
              {latestThree.map(w => (
                <div key={w.id} className="flex gap-2 mb-1">
                  <span className="text-[#E5E7EB] text-xs font-mono flex-1 truncate">{w.name}</span>
                  <span className="text-[#6B7280] text-xs font-mono">{w.date}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* 4. Rank Data */}
        <SectionCard title="Rank Data">
          <Row label="Season ID" value={seasonalRank.userRank.seasonId} />
          <Row label="RP" value={String(seasonalRank.userRank.rp)} />
          <Row label="Tier" value={seasonalRank.userRank.tier} />
          <Row label="Division" value={String(seasonalRank.userRank.division)} />
        </SectionCard>

        {/* 5. Gamification */}
        <SectionCard title="Gamification">
          <Row label="XP" value={String(gamification.xp)} />
          <Row label="Level" value={String(gamification.level)} />
          <Row label="Streak" value={`${gamification.streak} days`} />
          <Row label="Total Steps" value={String(gamification.totalSteps)} />
        </SectionCard>

        {/* 6. Weight Logs */}
        <SectionCard title="Weight Logs">
          <Row label="Total Logs" value={String(weightLogs.length)} />
          {latestThreeWeightLogs.length > 0 && (
            <div className="mt-2">
              <p className="text-[#6B7280] text-xs mb-1.5">Latest 3</p>
              {latestThreeWeightLogs.map(log => (
                <div key={log.id} className="flex gap-2 mb-1">
                  <span className="text-[#E5E7EB] text-xs font-mono">{log.weight} kg</span>
                  <span className="text-[#6B7280] text-xs font-mono">{log.logged_at}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* 7. Integrity Check */}
        <SectionCard title="Integrity Check">
          <button
            onClick={handleIntegrityCheck}
            disabled={integrityLoading || !user?.id}
            className="text-xs px-3 py-1.5 rounded-lg bg-[#00E676]/10 text-[#00E676] border border-[#00E676]/30 hover:bg-[#00E676]/20 transition disabled:opacity-50 mb-3"
          >
            {integrityLoading ? 'Checking…' : 'Run Integrity Check'}
          </button>
          {integrityError && (
            <p className="text-red-400 text-xs mb-2 font-mono">{integrityError}</p>
          )}
          {integrityResult && (
            <pre
              className={`text-xs font-mono rounded-lg p-3 overflow-x-auto whitespace-pre-wrap border ${
                integrityColor(integrityResult) === 'green'
                  ? 'bg-green-950/30 border-green-700/40 text-green-300'
                  : 'bg-red-950/30 border-red-700/40 text-red-300'
              }`}
            >
              {JSON.stringify(integrityResult, null, 2)}
            </pre>
          )}
        </SectionCard>

        {/* 8. Data Operations */}
        <SectionCard title="Data Operations" danger>
          <p className="text-[#9CA3AF] text-xs mb-3">
            Export a full JSON backup of your current state. This does not modify any data.
          </p>
          <button
            onClick={handleExportData}
            className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition"
          >
            Export My Data
          </button>
        </SectionCard>

      </div>
    </div>
  );
}
