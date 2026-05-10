import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { TechniqueDetailScreen } from '@/components/mma/TechniqueDetailScreen';
import { getTechniqueById } from '@/services/mmaService';
import type { Technique } from '@/types/mma';

export default function MmaTechniqueDetail() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  // Accept technique from navigation state (fast) or fetch from DB
  const stateData = location.state as { technique?: Technique; sportSlug?: string; experienceLevel?: string } | null;
  const [technique, setTechnique] = useState<Technique | null>(stateData?.technique || null);

  useEffect(() => {
    if (!technique && id) {
      getTechniqueById(id).then(t => { if (t) setTechnique(t); });
    }
  }, [id, technique]);

  if (!technique) {
    return (
      <div style={{ background: '#0d0d0d', minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
        Loading...
      </div>
    );
  }

  return (
    <TechniqueDetailScreen
      technique={technique}
      sportSlug={stateData?.sportSlug || 'boxing'}
      experienceLevel={stateData?.experienceLevel}
      onBack={() => navigate(-1)}
    />
  );
}
