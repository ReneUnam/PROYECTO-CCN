import { Mail, Upload, Trash2, MoreVertical, Image as ImageIcon, RefreshCw } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useRef, useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import Cropper from 'react-easy-crop';
import Modal from 'react-modal';
import { supabase } from '@/core/api/supabaseClient';
import { FullScreenLoader } from '@/components/FullScreenLoader';
// Utilidad para extraer el nombre del archivo de la URL pública de Supabase
function getFileNameFromUrl(url: string) {
    const parts = url.split('/');
    return parts[parts.length - 1].split('?')[0];
}

export function ProfilePage() {
    const { user, loading } = useAuth();
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [cropModalOpen, setCropModalOpen] = useState(false);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [rawFile, setRawFile] = useState<File | null>(null);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);


    useEffect(() => {
        if (!user) return;
        setAvatarUrl(user.avatar_url || null);
        setPreviewUrl(null);
    }, [user]);



    // Recorta y redimensiona la imagen a 256x256 px según el área seleccionada
    const getCroppedImg = (imageSrc: string, cropPixels: any, fileType: string): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const img = new window.Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 256;
                canvas.height = 256;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject();
                ctx.fillStyle = '#fff';
                ctx.fillRect(0, 0, 256, 256);
                ctx.drawImage(
                    img,
                    cropPixels.x,
                    cropPixels.y,
                    cropPixels.width,
                    cropPixels.height,
                    0,
                    0,
                    256,
                    256
                );
                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject();
                }, fileType);
            };
            img.onerror = reject;
            img.src = imageSrc;
        });
    };



    // Handler para seleccionar imagen y abrir cropper
    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;
        setRawFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setCropModalOpen(true);
    };


    // Cuando el usuario confirma el recorte
    const handleCropConfirm = async () => {
        if (!rawFile || !previewUrl || !croppedAreaPixels || !user) return;
        setUploading(true);
        try {
            const croppedBlob = await getCroppedImg(previewUrl, croppedAreaPixels, rawFile.type);
            const fileExt = rawFile.name.split('.').pop();
            const filePath = `${user.id}.${fileExt}`;
            // Elimina la imagen anterior si existe
            if (avatarUrl) {
                const oldFile = getFileNameFromUrl(avatarUrl);
                await supabase.storage.from('avatars').remove([oldFile]);
            }
            const { data: uploadData, error: uploadError } = await supabase.storage.from('avatars').upload(filePath, croppedBlob, { upsert: true });
            if (uploadError) {
                if (import.meta.env.DEV) {
                    // eslint-disable-next-line no-console
                    console.error('Supabase upload error:', uploadError, uploadData);
                }
                throw uploadError;
            }
            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
            // Forzar recarga de la imagen agregando un query param único
            const publicUrl = data.publicUrl + '?t=' + Date.now();
            if (import.meta.env.DEV) {
                // eslint-disable-next-line no-console
                console.log('Avatar public URL:', publicUrl);
            }
            const { error: updateError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
            if (updateError) throw updateError;
            setAvatarUrl(publicUrl);
            setPreviewUrl(null);
            setRawFile(null);
            setCropModalOpen(false);
        } catch (err) {
            if (import.meta.env.DEV) {
                // eslint-disable-next-line no-console
                console.error('Error al subir la imagen:', err);
            }
            alert('Error al subir la imagen');
            setPreviewUrl(null);
            setRawFile(null);
            setCropModalOpen(false);
        } finally {
            setUploading(false);
        }
    };
    // Eliminar avatar de Supabase y del perfil
    const handleDeleteAvatar = async () => {
        if (!user || !avatarUrl) return;
        setUploading(true);
        try {
            const fileName = getFileNameFromUrl(avatarUrl);
            await supabase.storage.from('avatars').remove([fileName]);
            const { error: updateError } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id);
            if (updateError) throw updateError;
            setAvatarUrl(null);
            setPreviewUrl(null);
            setRawFile(null);
            // Resetear input file para permitir volver a subir la misma imagen
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (err) {
            alert('Error al eliminar la foto');
        } finally {
            setUploading(false);
        }
    };


    const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);


    if (loading || !user) return <FullScreenLoader />;

    return (
        <>
            <Modal
                isOpen={cropModalOpen}
                onRequestClose={() => { setCropModalOpen(false); setPreviewUrl(null); setRawFile(null); }}
                ariaHideApp={false}
                style={{
                    overlay: {
                        zIndex: 1000,
                        background: 'rgba(30,30,40,0.65)',
                        backdropFilter: 'blur(6px) saturate(1.2)',
                        WebkitBackdropFilter: 'blur(6px) saturate(1.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                    },
                    content: {
                        position: 'relative',
                        inset: 'unset',
                        maxWidth: '95vw',
                        width: '100%',
                        maxHeight: '95vh',
                        margin: 'auto',
                        borderRadius: 20,
                        padding: '1.5rem',
                        background: '#18181b',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                        border: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }
                }}
            >
                <div
                    style={{
                        position: 'relative',
                        width: 'min(90vw,340px)',
                        height: 'min(90vw,340px)',
                        maxWidth: 340,
                        maxHeight: 340,
                        background: '#222',
                        borderRadius: 16,
                        overflow: 'hidden',
                        boxShadow: '0 2px 16px rgba(0,0,0,0.18)'
                    }}
                >
                    {previewUrl && (
                        <Cropper
                            image={previewUrl}
                            crop={crop}
                            zoom={zoom}
                            aspect={1}
                            cropShape="round"
                            showGrid={false}
                            onCropChange={setCrop}
                            onZoomChange={setZoom}
                            onCropComplete={onCropComplete}
                        />
                    )}
                </div>
                <div className="flex flex-col sm:flex-row justify-end gap-2 mt-6 w-full max-w-xs mx-auto">
                    <button
                        className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-base font-medium border border-border transition"
                        onClick={() => { setCropModalOpen(false); setPreviewUrl(null); setRawFile(null); }}
                    >Cancelar</button>
                    <button
                        className="px-4 py-2 rounded-lg bg-primary text-white text-base font-medium border border-primary shadow hover:bg-primary/90 transition"
                        onClick={handleCropConfirm}
                        disabled={uploading}
                    >{uploading ? 'Subiendo…' : 'Guardar'}</button>
                </div>
            </Modal>
            {/* Modal de confirmación para borrar foto */}
            {confirmDeleteOpen && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-lg p-6 max-w-xs w-full flex flex-col items-center">
                        <Trash2 className="h-10 w-10 text-red-500 mb-2" />
                        <div className="text-center mb-4">¿Seguro que quieres eliminar tu foto de perfil?</div>
                        <div className="flex gap-3 w-full justify-center">
                            <button className="w-10 h-10 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center" onClick={() => setConfirmDeleteOpen(false)}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-6 w-6 text-gray-500">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                            <button className="w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center" onClick={() => { setConfirmDeleteOpen(false); handleDeleteAvatar(); }}>
                                <Trash2 className="h-6 w-6 text-white" />
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            <section className="mx-auto max-w-5xl space-y-6 text-text px-2 sm:px-0">
                <header className="relative overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
                    <div className="rounded-2xl bg-surface/95 px-4 py-4 shadow-lg ring-1 ring-black/5 backdrop-blur">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                            <div className="relative flex flex-col items-center justify-center">
                                <Avatar className="h-28 w-28 border-4 border-surface shadow-lg">
                                    <AvatarImage src={previewUrl || avatarUrl || undefined} alt={user.full_name} />
                                    <AvatarFallback>{user.full_name?.[0] || 'U'}</AvatarFallback>
                                </Avatar>
                                {/* Menú de tres puntitos */}
                                <button
                                    className="absolute top-2 right-2 sm:top-3 sm:-right-4 bg-white rounded-full w-10 h-10 flex items-center justify-center shadow-md border border-border hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
                                    onClick={() => setMenuOpen((v) => !v)}
                                    disabled={uploading}
                                    title="Opciones de foto de perfil"
                                    style={{ zIndex: 10 }}
                                >
                                    <MoreVertical className="h-6 w-6 text-primary" />
                                </button>
                                {menuOpen && (
                                    <>
                                        {/* Overlay para cerrar el menú al hacer clic fuera */}
                                        <div
                                            className="fixed inset-0 z-40"
                                            onClick={() => setMenuOpen(false)}
                                            tabIndex={-1}
                                            aria-hidden="true"
                                        />
                                        <div
                                            className="absolute z-50 bg-white border border-border rounded-xl shadow-xl w-56 flex flex-col animate-fade-in"
                                            style={{
                                                top: '0.5rem',
                                                right: window.innerWidth >= 640 ? '-13.5rem' : '0',
                                                minWidth: '14rem',
                                                padding: '0.25rem 0',
                                            }}
                                        >
                                            {!avatarUrl && (
                                                <button
                                                    className="flex items-center gap-2 px-4 py-3 hover:bg-muted/60 text-primary text-base rounded-xl transition"
                                                    onClick={() => { setMenuOpen(false); fileInputRef.current?.click(); }}
                                                    disabled={uploading}
                                                >
                                                    <Upload className="h-5 w-5" />
                                                    Subir nueva foto
                                                </button>
                                            )}
                                            {avatarUrl && (
                                                <>
                                                    <button
                                                        className="flex items-center gap-2 px-4 py-3 hover:bg-muted/60 text-primary text-base rounded-t-xl transition"
                                                        onClick={() => { setMenuOpen(false); fileInputRef.current?.click(); }}
                                                        disabled={uploading}
                                                    >
                                                        <RefreshCw className="h-5 w-5" />
                                                        Reemplazar foto
                                                    </button>
                                                    <button
                                                        className="flex items-center gap-2 px-4 py-3 hover:bg-red-50 text-red-600 text-base rounded-b-xl border-t border-border transition"
                                                        onClick={() => { setMenuOpen(false); setConfirmDeleteOpen(true); }}
                                                        disabled={uploading}
                                                    >
                                                        <Trash2 className="h-5 w-5" />
                                                        Eliminar foto
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleAvatarChange}
                                    disabled={uploading}
                                />
                            </div>
                            <div className="space-y-1">
                                <h1 className="text-xl font-semibold">{user.full_name}</h1>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="grid gap-4 md:grid-cols-3">
                    <article className="rounded-2xl border border-border bg-surface p-4">
                        <h2 className="text-sm font-semibold">Contacto</h2>
                        <ul className="mt-3 space-y-2 text-sm text-text/70">
                            <li className="flex items-center gap-2"><Mail className="h-4 w-4" /> {user.email || '—'}</li>
                        </ul>
                    </article>

                    <article className="rounded-2xl border border-border bg-surface p-4">
                        <h2 className="text-sm font-semibold">Estado actual</h2>
                        <div className="mt-3 space-y-3 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="inline-flex items-center gap-1 text-text/70">
                                    Bienestar promedio
                                </span>
                                <span className="font-semibold text-emerald-600">4.3 / 5</span>
                            </div>
                            <div>
                                <p className="text-xs text-text/60">Última actualización hoy 10:15</p>
                                <div className="mt-2 h-2 rounded-full bg-muted">
                                    <div className="h-full w-[70%] rounded-full bg-primary" />
                                </div>
                            </div>
                        </div>
                    </article>

                    <article className="rounded-2xl border border-border bg-surface p-4">
                        <h2 className="text-sm font-semibold">Próximos pasos</h2>
                        <ul className="mt-3 space-y-2 text-sm text-text/70">
                            <li className="rounded-lg bg-muted/70 px-3 py-2">Completa el diario emocional de hoy</li>
                            <li className="rounded-lg bg-muted/70 px-3 py-2">2 preguntas abiertas pendientes</li>
                        </ul>
                    </article>
                </div>

                <section className="rounded-2xl border border-border bg-surface p-4">
                    <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-sm font-semibold">Resumen emocional</h2>
                            <p className="text-xs text-text/70">Promedios de los últimos 14 días</p>
                        </div>
                        <button className="text-xs text-primary hover:underline">Ver estadísticas</button>
                    </header>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm">
                            <h3 className="font-medium">Emociones predominantes</h3>
                            <ul className="mt-2 space-y-1 text-text/70">
                                <li>😊 Alegría · 42%</li>
                                <li>😔 Culpa · 18%</li>
                                <li>😬 Inquieto · 16%</li>
                            </ul>
                        </div>
                        <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm">
                            <h3 className="font-medium">Autocuidado</h3>
                            <ul className="mt-2 space-y-1 text-text/70">
                                <li>Energía física: alta (4.0)</li>
                                <li>Sueño: dormí suficiente 5 veces</li>
                                <li>Actividad: ejercicio 3 veces</li>
                            </ul>
                        </div>
                    </div>
                </section>

                <section className="rounded-2xl border border-border bg-surface p-4">
                    <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-sm font-semibold">Historial reciente</h2>
                            <p className="text-xs text-text/70">Últimas interacciones en la plataforma</p>
                        </div>
                        <button className="text-xs text-primary hover:underline">Ver todo</button>
                    </header>
                    <div className="mt-4 divide-y divide-border text-sm text-text/70">
                        <div className="flex items-center justify-between py-3">
                            <span>Diario de autocuido completado</span>
                            <span className="text-xs text-text/60">Hoy · 10:05</span>
                        </div>
                        <div className="flex items-center justify-between py-3">
                            <span>Pregunta “¿Cómo te sentiste hoy?” enviada</span>
                            <span className="text-xs text-text/60">Ayer · 18:40</span>
                        </div>
                        <div className="flex items-center justify-between py-3">
                            <span>Objetivo “Dormir 8h” marcado como cumplido</span>
                            <span className="text-xs text-text/60">26 oct · 21:15</span>
                        </div>
                    </div>
                </section>
            </section>
        </>
    );
}