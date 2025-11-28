import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button'; // Asumiendo que usas shadcn/ui o similar
import groupImg from '@/assets/nosotros.jpeg'; // La imagen grande de estudiantes
import robotImg from '@/assets/logo.png'; // El logo del robot principal
import ccnLogo from '@/assets/ccn-logo.png'; // El logo de CCN
import studentsImg from '@/assets/students.png'; // No usada en la referencia principal, puedes omitirla o usarla para el detalle

// Importa iconos de Lucide o similar si no los estás usando en el código original
import { Mail, ListChecks, MessageCircle, BookOpen, Send } from 'lucide-react';

// Define tus colores primarios si no están definidos en globals.css
// Usaré variables de Tailwind para simplificar, pero puedes definirlas con CSS Custom Properties

const PrimaryColor = 'bg-green-700'; // Fondo de títulos y banners (Verde Oscuro)
const SecondaryColor = 'text-green-700'; // Color de texto secundario (Verde Oscuro)
const AccentColor = 'bg-[#1f1288]'; // Azul de los puntos decorativos
const LightBackground = 'bg-gray-50'; // Fondo claro para las secciones

export default function WelcomePage() {
  const navigate = useNavigate();

  // Componente de Card para simplificar la estructura
  const Card = ({ title, children, isPrimary = false }: { title: string, children: React.ReactNode, isPrimary?: boolean }) => (
    <div className="flex flex-col">
      <div className={`text-white p-3 md:p-4 rounded-t-lg shadow-md ${isPrimary ? PrimaryColor : 'bg-gray-800'}`}>
        <h3 className="text-xl font-bold tracking-wider">{title}</h3>
      </div>
      <div className={`p-4 md:p-6 ${LightBackground} rounded-b-lg shadow-md border-t-2 border-white`}>
        {children}
      </div>
    </div>
  );

  // Componente para los ítems de '¿QUÉ PODRÁS ENCONTRAR...?'
  const FeatureItem = ({ icon: Icon, title }: { icon: React.ElementType, title: string }) => (
    <div className="flex flex-col items-center text-center">
      <div className={`w-20 h-20 mb-2 rounded-full flex items-center justify-center p-3 shadow-lg ${LightBackground}`}>
        <Icon className={`w-10 h-10 ${SecondaryColor}`} strokeWidth={1.5} />
      </div>
      <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{title}</p>
    </div>
  );


  return (
    <div className="w-full min-h-screen bg-white text-gray-800 py-8 px-4 md:px-8 lg:px-12 relative overflow-hidden">
      
      {/* Puntos Decorativos (Ajustados para visibilidad y posición) */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className={`absolute left-10 top-40 w-12 h-12 ${AccentColor} rounded-full opacity-80`} />
        <div className={`absolute left-32 top-8 w-8 h-8 ${AccentColor} rounded-full opacity-80`} />
        <div className={`absolute right-10 bottom-1/4 w-10 h-10 ${AccentColor} rounded-full opacity-80`} />
      </div>

      <div className="max-w-7xl mx-auto grid gap-10 md:grid-cols-2 items-start relative z-10">

        {/* === COLUMNA IZQUIERDA === */}
        <div className="space-y-6 flex flex-col">
          
          {/* Círculo de Cita y Robot Pequeño (Estructura de la referencia superior izquierda) */}
          <div className="flex items-start gap-4">
            <div className={`w-36 h-36 rounded-full ${PrimaryColor} flex items-center justify-center p-3 text-white shadow-xl flex-shrink-0`}>
              <p className="text-xs font-medium text-center leading-snug">“Los estudiantes y sus futuras generaciones merecen crecer en entornos que protejan su **bienestar emocional**.”</p>
            </div>
            
            <div className="flex flex-col justify-center space-y-2">
                <div className="flex items-center gap-2">
                    <img src={ccnLogo} alt="CCN logo" className="w-10 h-auto object-contain" />
                    <h2 className="text-3xl font-extrabold text-gray-800">CCN</h2>
                </div>
                <p className="text-md font-semibold text-gray-600 tracking-wider">COLEGIO CENTRAL DE NICARAGUA</p>
            </div>
          </div>
          
          {/* Secciones ¿QUIENES SOMOS? y ¿QUÉ INCORPORA? */}
          <Card title="¿QUIENES SOMOS?" isPrimary>
            <p className="text-sm md:text-base leading-relaxed">Somos una **plataforma digital** denominada **Blueweb**, orientada al **monitoreo de las emociones** de los estudiantes y docentes, así como al seguimiento de las **relaciones interpersonales** dentro del entorno educativo.</p>
            <div className='flex justify-center mt-4 md:hidden'>
                 <img src={robotImg} alt="Robot logo pequeño" className="w-24 h-auto object-contain" />
            </div>
          </Card>
          
          <Card title="¿QUE INCORPORA?" isPrimary>
            <p className="text-sm md:text-base leading-relaxed">Incorpora **módulos interactivos** de seguimiento emocional, emisión de **alertas automáticas** y canales de **comunicación directa** entre estudiantes, docentes y orientadores.</p>
          </Card>

          {/* Banner y Texto inferior */}
          <div className="mt-4 p-4 rounded-xl border border-gray-200 shadow-lg text-center">
             <p className="text-lg font-medium text-gray-700">¡Imagina un colegio donde cada estudiante se sienta **seguro**, **comprendido** y **acompañado**!</p>
          </div>
          
        </div>

        {/* === COLUMNA DERECHA === */}
        <div className="relative flex flex-col items-center gap-6 mt-0 md:mt-24">
          
          {/* Logo y Robot Principal (Ajustado para parecerse a la referencia) */}
          <div className="flex flex-col items-center p-6 w-full rounded-2xl">
            <div className="flex flex-col items-center">
                <h1 className="text-6xl md:text-7xl font-extrabold text-gray-800">CCN</h1>
                <p className="text-3xl font-semibold uppercase tracking-widest text-green-700">BLUE WEB</p>
            </div>
            <div className="mt-4 relative flex justify-center w-full">
              <img src={robotImg} alt="Robot logo" className="w-64 md:w-80 h-auto object-contain drop-shadow-xl" />
            </div>
            <div className="mt-6 w-full flex justify-center">
              <Button 
                size="lg" 
                className={`text-lg font-bold w-full max-w-xs ${PrimaryColor} hover:bg-green-800`}
                onClick={() => navigate('/login')}
              >
                Iniciar sesión
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Sección ¿QUÉ PODRÁS ENCONTRAR EN CCN - BLUEWEB? (Diseño de la referencia 1) */}
      <div className="max-w-7xl mx-auto mt-12 md:mt-16">
        <div className={`p-4 md:p-6 ${PrimaryColor} rounded-t-xl shadow-lg`}>
          <h3 className="text-2xl font-bold text-white tracking-wider text-center">¿QUÉ PODRÁS ENCONTRAR EN CCN - BLUEWEB?</h3>
        </div>
        <div className={`grid grid-cols-2 md:grid-cols-5 gap-6 p-6 ${LightBackground} rounded-b-xl shadow-lg border-t-2 border-white`}>
          <FeatureItem icon={BookOpen} title="DIARIO DE EMOCIONES" />
          <FeatureItem icon={MessageCircle} title="CHAT BOT DE APOYO INMEDIATO" />
          <FeatureItem icon={ListChecks} title="ENCUESTAS" />
          <FeatureItem icon={Mail} title="BUZÓN DE SUGERENCIAS ANÓNIMO" />
          {/* Añadir un quinto elemento para completar el layout si es necesario o un espacio */}
          <div className="hidden md:flex flex-col items-center text-center">
             <div className="w-20 h-20 mb-2 rounded-full flex items-center justify-center p-3">
               <img src={studentsImg} alt="material pedagógico" className="w-full h-full object-cover rounded-full" />
             </div>
             <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">MATERIAL PSICOPEDAGÓGICO</p>
          </div>
        </div>
      </div>

      {/* Sección ¿CUALES SON LOS BENEFICIOS? (Diseño de la referencia 1) */}
      <div className="max-w-7xl mx-auto mt-10 md:mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="order-2 md:order-1 bg-white p-6 rounded-xl shadow-xl border border-gray-100">
            <div className={`bg-gray-800 text-white px-4 py-3 rounded-t-lg inline-block shadow-md`}>
              <h4 className="text-xl font-bold">¿CUALES SON LOS BENEFICIOS?</h4>
            </div>
            <ul className="mt-4 text-base list-none space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className={`${SecondaryColor} text-2xl mr-2 font-bold`}>•</span> 
                Facilita la **detección temprana** de dificultades socioemocionales en estudiantes y docentes.
              </li>
              <li className="flex items-start">
                <span className={`${SecondaryColor} text-2xl mr-2 font-bold`}>•</span> 
                Promueve la **comunicación empática**.
              </li>
              <li className="flex items-start">
                <span className={`${SecondaryColor} text-2xl mr-2 font-bold`}>•</span> 
                Contribuye al **fortalecimiento del bienestar institucional**.
              </li>
              <li className="flex items-start">
                <span className={`${SecondaryColor} text-2xl mr-2 font-bold`}>•</span> 
                Proporciona **datos sistematizados** que apoyan la toma de decisiones pedagógicas y psicopedagógicas.
              </li>
            </ul>
        </div>
        
        {/* Foto Grande de Estudiantes (Colocada debajo de la columna de texto en la referencia) */}
        <div className="order-1 md:order-2 w-full rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
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