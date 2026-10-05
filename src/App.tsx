import { useCallback, useEffect, useState } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { Shell } from '@/components/layout/Shell';
import { InicioPage } from '@/modulos/inicio/InicioPage';
import { RsvpPage } from '@/modulos/rsvp/RsvpPage';
import { TestPage } from '@/modulos/test/TestPage';
import { GimnasioPage } from '@/modulos/gimnasio/GimnasioPage';
import { ProgresoPage } from '@/modulos/progreso/ProgresoPage';
import { obtenerStore } from '@/db/factory';
import { guardarConfig, leerConfig } from '@/db/repo';
import { Boton } from '@/components/ui';
import { t } from '@/i18n/es';

type Tema = 'oscuro' | 'claro';

export default function App() {
  const [tema, setTema] = useState<Tema>('oscuro');
  const [motor, setMotor] = useState<'sqljs' | 'tauri-sql' | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);

  const preparar = useCallback(async () => {
    setFallo(null);
    try {
      const store = await obtenerStore();
      setMotor(store.motor);
      const guardado = await leerConfig('tema');
      if (guardado === 'claro' || guardado === 'oscuro') setTema(guardado);
    } catch (e) {
      setFallo((e as Error).message ?? String(e));
    }
  }, []);

  useEffect(() => {
    void preparar();
  }, [preparar]);

  useEffect(() => {
    document.documentElement.dataset.tema = tema;
  }, [tema]);

  const cambiarTema = (nuevo: Tema) => {
    setTema(nuevo);
    void guardarConfig('tema', nuevo).catch(() => undefined);
  };

  if (fallo) {
    return (
      <div className="pagina" style={{ paddingTop: '12vh' }}>
        <div className="vacio">
          <AlertCircle size={30} />
          <strong>{t.errores.baseDatos}</strong>
          <span>{fallo}</span>
          <Boton variante="primario" onClick={() => window.location.reload()}>
            {t.errores.recargar}
          </Boton>
        </div>
      </div>
    );
  }

  return (
    <HashRouter>
      <Shell tema={tema} onCambiarTema={cambiarTema} conectado={motor}>
        <Routes>
          <Route path="/" element={<InicioPage />} />
          <Route path="/rsvp" element={<RsvpPage />} />
          <Route path="/test" element={<TestPage />} />
          <Route path="/gimnasio" element={<GimnasioPage />} />
          <Route path="/progreso" element={<ProgresoPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Shell>
    </HashRouter>
  );
}
