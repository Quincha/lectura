import { useState } from 'react';
import { AlignLeft, Eye, Target } from 'lucide-react';
import { TablaSchulte } from './TablaSchulte';
import { SangriaVisual } from './SangriaVisual';
import { t } from '@/i18n/es';

type Vista = 'schulte' | 'sangria';

export function GimnasioPage() {
  const [vista, setVista] = useState<Vista>('schulte');

  return (
    <div className="pagina">
      <header className="encabezado-pagina">
        <div>
          <h1>{t.gimnasio.titulo}</h1>
          <p>{t.gimnasio.subtitulo}</p>
        </div>
        <div className="segmentado" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={vista === 'schulte'}
            className={vista === 'schulte' ? 'activo' : ''}
            onClick={() => setVista('schulte')}
          >
            <Target size={14} /> {t.gimnasio.schulte.titulo}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={vista === 'sangria'}
            className={vista === 'sangria' ? 'activo' : ''}
            onClick={() => setVista('sangria')}
          >
            <AlignLeft size={14} /> {t.gimnasio.sangria.titulo}
          </button>
        </div>
      </header>

      <div className="aviso" style={{ marginBottom: 'var(--s4)' }}>
        <Eye size={15} />
        <span>
          {vista === 'schulte' ? t.gimnasio.schulte.descripcion : t.gimnasio.sangria.descripcion}
        </span>
      </div>

      {vista === 'schulte' ? <TablaSchulte /> : <SangriaVisual />}
    </div>
  );
}
