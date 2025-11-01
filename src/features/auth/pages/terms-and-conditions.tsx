import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/core/components/Cards';
import { Button } from '@/components/ui/button';

export default function TermsAndConditions() {
	const [accepted, setAccepted] = useState(false);
	const navigate = useNavigate();

	const handleContinue = () => {
		if (!accepted) return;
		// Redirigir al login (o a donde corresponda)
		navigate('/login');
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
			<Card className="w-full max-w-4xl overflow-hidden rounded-3xl shadow-2xl">
				<div className="grid grid-cols-1 md:grid-cols-2">
					{/* Left: logo + title */}
					<div className="hidden md:flex flex-col items-center justify-center gap-6 bg-gradient-to-b from-primary/80 to-secondary/80 p-8 text-white">
						<img src="/logo.png" alt="Colegio Central de Nicaragua Logo" className="h-36 w-36 object-contain" />
						<h2 className="text-center text-2xl font-extrabold">Términos y Condiciones</h2>
						<p className="max-w-xs text-center text-sm text-white/90">Antes de continuar, por favor lee y acepta los términos para hacer uso de la plataforma.</p>
					</div>

					{/* Right: content */}
					<CardContent className="p-6">
						<div className="mx-auto max-w-xl">
							<h1 className="mb-4 text-center text-2xl font-bold text-indigo-800 md:hidden">Términos y Condiciones</h1>

							<div className="rounded-xl border border-border bg-white p-5 shadow-sm">
								<div className="max-h-[48vh] overflow-y-auto pr-4 text-sm leading-relaxed text-gray-700">
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

									<p className="mt-4 text-xs text-gray-500">Última actualización: Octubre 2025</p>
								</div>

								<div className="mt-4 flex items-center justify-between">
									<label className="inline-flex items-center gap-2 text-sm text-gray-700">
										<input
											type="checkbox"
											checked={accepted}
											onChange={(e) => setAccepted(e.target.checked)}
											className="h-4 w-4 rounded border-border text-indigo-700 focus:ring-0"
											aria-label="He leído y acepto los términos y condiciones"
										/>
										<span>He leído todos los términos y condiciones</span>
									</label>

									<Button
										onClick={handleContinue}
										disabled={!accepted}
										className="rounded-full bg-indigo-700 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
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
