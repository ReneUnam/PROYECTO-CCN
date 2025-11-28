import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/core/components/Cards';
import { Button } from '@/components/ui/button';

export default function TermsAndConditions() {
	const [accepted, setAccepted] = useState(false);
	const navigate = useNavigate();

	const handleContinue = () => {
		if (!accepted) return;
		try {
			localStorage.setItem('terms:accepted', '1');
		} catch (e) {
			// ignore
		}
		navigate('/login');
	};

	return (
		<div className="flex min-h-screen items-center justify-center px-4 py-8">
			<Card className="w-full max-w-4xl overflow-hidden rounded-2xl border shadow-2xl backdrop-blur md:rounded-3xl border-[var(--color-border)] bg-[color:var(--color-surface)]">
				<div className="grid grid-cols-1 md:grid-cols-2">
					{/* Mobile banner (shown on small screens) */}
					<div className="md:hidden flex flex-col items-center gap-4 px-6 py-8 text-white bg-gradient-to-r from-[color:var(--color-primary)] to-[color:var(--color-secondary)]">
						<img src="/logo.png" alt="Logo" className="h-28 w-28 object-contain logo-stroke-white" style={{ ['--stroke' as any]: '2px' }} />
						<h2 className="text-2xl text-center font-extrabold">Términos y Condiciones</h2>
						<p className="max-w-sm text-center text-xs/5 opacity-90">Antes de continuar, por favor lee y acepta los términos para hacer uso de la plataforma.</p>
					</div>

					{/* Desktop banner */}
					<div className="hidden md:flex flex-col items-center justify-center gap-6 p-10 text-white bg-gradient-to-b from-[color:var(--color-primary)] to-[color:var(--color-secondary)]">
						<img src="/logo.png" alt="Logo" className="h-28 w-28 object-contain logo-stroke-white" style={{ ['--stroke' as any]: '2px' }} />						<h2 className="text-center text-2xl font-extrabold">Términos y Condiciones</h2>
						<p className="max-w-xs text-center text-sm text-white/90">Antes de continuar, por favor lee y acepta los términos para hacer uso de la plataforma.</p>
					</div>

					<CardContent className="p-6 sm:p-8">
						<div className="mx-auto w-full max-w-md">
							<div className="rounded-xl border border-[var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-sm">
								<div className="max-h-[48vh] overflow-y-auto pr-4 text-sm leading-relaxed text-[color:var(--color-text)]">
									<ol className="space-y-4 list-decimal pl-5">
										<li>
											<strong>Aceptación de los términos.</strong> Al acceder y utilizar esta plataforma, usted acepta y
											se compromete a cumplir los presentes términos y condiciones en su totalidad. Si no está de
											acuerdo con alguna de las cláusulas, debe abstenerse de utilizar el servicio.
										</li>

										<li>
											<strong>Modificaciones del servicio.</strong> Nos reservamos el derecho de modificar, suspender o
											interrumpir el servicio en cualquier momento, sin previo aviso. Las actualizaciones de los
											términos se publicarán en esta sección, y su continuación constituye aceptación de dichas
											modificaciones.
										</li>

										<li>
											<strong>Registro y cuentas de usuario.</strong>
											<ul className="mt-2 ml-5 list-disc">
												<li>Para acceder a ciertas funciones es necesario disponer de una cuenta válida.</li>
												<li>Es responsabilidad del usuario mantener la confidencialidad de sus credenciales y de notificar
													cualquier uso no autorizado de su cuenta.</li>
											</ul>
										</li>

										<li>
											<strong>Protección de datos.</strong> Tratamos la información de acuerdo con la política de
											privacidad aplicable. No compartiremos sus datos con terceros sin su consentimiento, salvo
											obligaciones legales.
										</li>

										<li>
											<strong>Limitación de responsabilidad.</strong> En la medida permitida por la ley, no seremos
											responsables por daños indirectos, incidentales o consecuentes derivados del uso de la plataforma.
										</li>
									</ol>

									<p className="mt-4 text-xs text-[color:var(--color-text)]/60">Última actualización: Octubre 2025</p>
								</div>

								<div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
									<label className="inline-flex items-center gap-2 text-sm text-[color:var(--color-text)]">
										<input
											type="checkbox"
											checked={accepted}
											onChange={(e) => setAccepted(e.target.checked)}
											className="h-4 w-4 rounded border-[var(--color-border)] text-[color:var(--color-primary)] focus:ring-0"
											aria-label="He leído y acepto los términos y condiciones"
										/>
										<span>He leído todos los términos y condiciones</span>
									</label>

									<Button
										onClick={handleContinue}
										disabled={!accepted}
										className="w-full sm:w-auto rounded-full bg-[color:var(--color-primary)] px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
									>
										Aceptar y continuar
									</Button>
								</div>
							</div>
						</div>
					</CardContent>
				</div>
			</Card>
		</div>
	);
}
