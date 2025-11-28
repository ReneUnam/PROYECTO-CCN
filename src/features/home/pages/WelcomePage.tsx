import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button'; // Asumiendo que usas shadcn/ui o similar
import groupImg from '@/assets/nosotros.jpeg'; // La imagen grande de estudiantes
import robotImg from '@/assets/logo-blueweb-letras.png'; // El logo del robot principal
import ccnLogo from '@/assets/ccn-logo.png'; // El logo de CCN
// studentsImg removed: replaced by an icon for the feature item

// Importa iconos de Lucide o similar si no los estás usando en el código original
import { Mail, ListChecks, MessageCircle, BookOpen } from 'lucide-react';
import { ThemeToggle } from '@/core/components/ThemeToggle';

// Colores y variantes (incluye dark-mode)
// Use global theme tokens so light/dark behave dynamically
const PrimarySolid = 'bg-primary';
const PrimaryIconColor = 'text-primary';
const AccentColor = 'bg-sky-500';
const LightBackground = 'bg-surface';

// Alternating colors for icons (use theme tokens where possible)
const featureColors = [
  { bg: 'bg-muted', text: PrimaryIconColor },
  { bg: 'bg-muted', text: 'text-tertiary' },
];

export default function WelcomePage() {
  const navigate = useNavigate();

  // Componente de Card para simplificar la estructura
  const Card = ({ title, children, isPrimary = false }: { title: string, children: React.ReactNode, isPrimary?: boolean }) => (
    <div className="flex flex-col">
      <div className={`text-white p-3 md:p-4 rounded-t-lg shadow-md ${isPrimary ? PrimarySolid : 'bg-muted'}`}>
        <h3 className="text-xl font-bold tracking-wider">{title}</h3>
      </div>
      <div className={`p-4 md:p-6 ${LightBackground} rounded-b-lg shadow-md border-t-2 border-border`}>
        {children}
      </div>
    </div>
  );

  // Componente para los ítems de '¿QUÉ PODRÁS ENCONTRAR...?'
  const FeatureItem = ({ icon: Icon, title, index = 0 }: { icon: React.ElementType, title: string, index?: number }) => {
    const col = featureColors[index % featureColors.length];
    return (
      <div className="flex flex-col items-center text-center">
        <div className={`w-20 h-20 mb-2 rounded-full flex items-center justify-center p-3 shadow-lg ${col.bg}`}>
          <Icon className={`w-10 h-10 ${col.text}`} strokeWidth={1.5} />
        </div>
        <p className="text-sm font-semibold text-text uppercase tracking-wide">{title}</p>
      </div>
    );
  };


  return (
    <div className="w-full min-h-screen bg-surface text-text py-8 px-4 md:px-8 lg:px-12 relative overflow-hidden">
      {/* Navbar réplica dentro de la página */}
      <div className="w-full max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between py-3 md:py-4 px-4 md:px-6 z-20 space-y-3 sm:space-y-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden bg-white/5 flex items-center justify-center">
            <img src={ccnLogo} alt="CCN logo" className="w-full h-full object-cover" />
          </div>
          <div className="leading-tight">
            <div className="text-base sm:text-lg font-bold text-text">Colegio Central de Nicaragua</div>
            <div className="text-xs sm:text-sm text-text/70">CCN- BLUEWEB</div>
          </div>
        </div>

        <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-3">
          <div className="w-full sm:w-auto">
            <Button
              size="sm"
              className="w-full sm:w-auto px-3 py-2 sm:px-3 sm:py-1 rounded-md border border-border text-text bg-transparent text-sm sm:text-base shadow-sm"
              onClick={() => {
                try {
                  const accepted = localStorage.getItem('terms:accepted') === '1';
                  if (accepted) navigate('/login');
                  else navigate('/terms');
                } catch (e) {
                  navigate('/terms');
                }
              }}
            >
              Iniciar sesión
            </Button>
          </div>

          <div className="flex-shrink-0">
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Decorative dots removed to avoid overlap with header */}

      <div className="max-w-7xl mx-auto grid gap-10 md:grid-cols-2 items-start relative z-10 pt-6 md:pt-12">

        {/* === COLUMNA IZQUIERDA === */}
        <div className="space-y-6 flex flex-col mt-4 md:mt-0">
          
          {/* Removed small duplicated branding (banner exists above) */}
          
          {/* Secciones ¿QUIENES SOMOS? y ¿QUÉ INCORPORA? */}
          <Card title="¿QUIENES SOMOS?" isPrimary>
            <p className="text-sm md:text-base leading-relaxed">Somos una plataforma digital denominada Blueweb, orientada al monitoreo de las emociones de los estudiantes y docentes, así como al seguimiento de las relaciones interpersonales dentro del entorno educativo.</p>
            <div className='flex justify-center mt-4 md:hidden'>
                 <img src={robotImg} alt="Robot logo pequeño" className="w-60 h-auto object-contain" />
            </div>
          </Card>
          
          <Card title="¿QUE INCORPORA?" isPrimary>
            <p className="text-sm md:text-base leading-relaxed">Incorpora módulos interactivos de seguimiento emocional, emisión de alertas automáticas y canales de comunicación directa entre estudiantes, docentes y orientadores.</p>
          </Card>

          {/* Banner y Texto inferior */}
          <div className="mt-4 p-4 rounded-xl border border-border shadow-lg text-center bg-surface">
           <p className="text-lg font-medium text-text">¡Imagina un colegio donde cada estudiante se sienta seguro, comprendido y acompañado!</p>
         </div>
          
        </div>

        {/* === COLUMNA DERECHA === */}
        <div className="relative flex flex-col items-center gap-6 mt-0 md:mt-24">
          
          {/* Logo y Robot Principal (Ajustado para parecerse a la referencia) */}
          <div className="flex flex-col items-center p-6 w-full rounded-2xl">
            <div className="mt-4 relative flex justify-center w-full">
              <img src={robotImg} alt="Robot logo" className="w-64 md:w-80 h-auto object-contain drop-shadow-xl" />
            </div>
            
          </div>
        </div>
      </div>

      {/* Sección ¿QUÉ PODRÁS ENCONTRAR EN CCN - BLUEWEB? (Diseño de la referencia 1) */}
      <div className="max-w-7xl mx-auto mt-12 md:mt-16">
        <div className={`p-4 md:p-6 ${PrimarySolid} rounded-t-xl shadow-lg`}>
          <h3 className="text-2xl font-bold text-white tracking-wider text-center">¿QUÉ PODRÁS ENCONTRAR EN CCN - BLUEWEB?</h3>
        </div>
        <div className={`grid grid-cols-2 md:grid-cols-5 gap-6 p-6 ${LightBackground} rounded-b-xl shadow-lg border-t-2 border-border`}>
          <FeatureItem icon={BookOpen} title="DIARIO DE EMOCIONES" index={0} />
          <FeatureItem icon={MessageCircle} title="CHAT BOT DE APOYO INMEDIATO" index={1} />
          <FeatureItem icon={ListChecks} title="ENCUESTAS" index={0} />
          <FeatureItem icon={Mail} title="BUZÓN DE SUGERENCIAS ANÓNIMO" index={1} />
          {/* Replaced photo with an icon for consistency */}
          <FeatureItem icon={BookOpen} title="MATERIAL PSICOPEDAGÓGICO" index={0} />
        </div>
      </div>

      {/* Sección ¿CUALES SON LOS BENEFICIOS? (Diseño de la referencia 1) */}
      <div className="max-w-7xl mx-auto mt-10 md:mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="order-2 md:order-1 bg-surface p-6 rounded-xl shadow-xl border border-border">
            <div className={`${PrimarySolid} text-white px-4 py-3 rounded-t-lg inline-block shadow-md`}>
              <h4 className="text-xl font-bold">¿CUALES SON LOS BENEFICIOS?</h4>
            </div>
            <ul className="mt-4 text-base list-none space-y-3 text-text">
              <li className="flex items-start">
                <span className={`text-primary text-2xl mr-2 font-bold`}>•</span> 
                Facilita la detección temprana de dificultades socioemocionales en estudiantes y docentes.
              </li>
              <li className="flex items-start">
                <span className={`text-primary text-2xl mr-2 font-bold`}>•</span> 
                Promueve la comunicación empática.
              </li>
              <li className="flex items-start">
                <span className={`text-primary text-2xl mr-2 font-bold`}>•</span> 
                Contribuye al fortalecimiento del bienestar institucional.
              </li>
              <li className="flex items-start">
                <span className={`text-primary text-2xl mr-2 font-bold`}>•</span> 
                Proporciona datos sistematizados que apoyan la toma de decisiones pedagógicas y psicopedagógicas.
              </li>
            </ul>
        </div>
        
        {/* Foto Grande de Estudiantes (Colocada debajo de la columna de texto en la referencia) */}
        <div className="order-1 md:order-2 w-full rounded-3xl overflow-hidden shadow-2xl border-4 border-border">
            <img 
              src={groupImg} 
              alt="Grupo de estudiantes" 
              className="w-full h-auto object-cover object-top" 
              style={{ minHeight: '160px', maxHeight: '420px' }} 
            />
        </div>

      </div>

    </div>
  );
}