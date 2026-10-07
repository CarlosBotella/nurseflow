
        const $ = s => document.querySelector(s);
        const $$ = s => [...document.querySelectorAll(s)];
        const esc = s => String(s ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
        const uid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        
        const getLocalISOToday = () => {
            const d = new Date();
            d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
            return d.toISOString().slice(0, 10);
        };
        const dateFmt = d => new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${d}T12:00:00`));
        const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
        const hashText = async (s) => {
            const b = new TextEncoder().encode(s);
            const h = await crypto.subtle.digest('SHA-256', b);
            return [...new Uint8Array(h)].map(x => x.toString(16).padStart(2, '0')).join('');
        };

        const NurseDB = (() => {
            const DB_NAME = 'NurseFlowDB';
            const DB_VERSION = 1;
            const STORES = ['settings', 'cases', 'tasks', 'days', 'schedule', 'exceptions', 'pae', 'meds', 'procedures', 'quiz', 'flashcards'];
            let dbInstance = null;

            const init = () => new Promise((resolve, reject) => {
                if (dbInstance) return resolve(dbInstance);
                const req = indexedDB.open(DB_NAME, DB_VERSION);
                req.onupgradeneeded = e => {
                    const db = e.target.result;
                    STORES.forEach(store => { if (!db.objectStoreNames.contains(store)) db.createObjectStore(store, { keyPath: 'id' }); });
                };
                req.onsuccess = e => { dbInstance = e.target.result; resolve(dbInstance); };
                req.onerror = e => reject(e.target.error);
            });

            const tx = async (storeName, mode, callback) => {
                const db = await init();
                return new Promise((resolve, reject) => {
                    const transaction = db.transaction(storeName, mode);
                    const store = transaction.objectStore(storeName);
                    let result;
                    transaction.oncomplete = () => resolve(result);
                    transaction.onerror = () => reject(transaction.error);
                    result = callback(store);
                });
            };

            return {
                get: (store, id) => tx(store, 'readonly', s => { const r = s.get(id); return new Promise(res => r.onsuccess = () => res(r.result)); }),
                all: (store) => tx(store, 'readonly', s => { const r = s.getAll(); return new Promise(res => r.onsuccess = () => res(r.result)); }),
                put: (store, data) => tx(store, 'readwrite', s => s.put(data)),
                bulkPut: (store, items) => tx(store, 'readwrite', s => items.forEach(i => s.put(i))),
                remove: (store, id) => tx(store, 'readwrite', s => s.delete(id)),
                clear: (store) => tx(store, 'readwrite', s => s.clear()),
                reset: async () => { for (const s of STORES) await NurseDB.clear(s); },
                exportAll: async (storesList = STORES) => {
                    const data = {};
                    for (const s of storesList) {
                        if (STORES.includes(s)) data[s] = await NurseDB.all(s);
                    }
                    return data;
                },
                importAll: async (data) => {
                    const sourceData = data.stores ? data.stores : data;
                    for (const s of STORES) {
                        if (sourceData[s] && Array.isArray(sourceData[s])) {
                            await NurseDB.clear(s);
                            await NurseDB.bulkPut(s, sourceData[s]);
                        }
                    }
                }
            };
        })();

        const NURSE_DATA = {
            procedures: [
                // 1. TERAPIA INTRAVENOSA Y HEMODERIVADOS
                { 
                    id: 'p1', 
                    name: 'Canalización VVP (Vía Venosa Periférica)', 
                    materials: ['Compresor', 'Abocath (14G a 24G)', 'Batea y SSF 0.9%', 'Apósito transparente', 'Gasas', 'Clorhexidina alcohólica >0.5-2%', 'Llave de 3 pasos / Alargadera'], 
                    notes: [
                        'Seleccionar venas distales primero y priorizar la flexura del codo solo en CVC/PICC[cite: 1].', 
                        'Desinfectar con clorhexidina alcohólica al 2% con fricción y dejar secar 30 segundos[cite: 2].', 
                        'Lavar con suero tras inserción para confirmar permeabilidad y limpiar restos hemáticos.', 
                        'Usar fijación segura atraumática para evitar flebitis mecánica.'
                    ], 
                    favorite: true 
                },
                { 
                    id: 'p2', 
                    name: 'Inserción CVC / PICC Ecoguiado', 
                    materials: ['Clorhexidina alcohólica al 2%', 'Gorro, mascarilla, bata, guantes y paños estériles', 'Ecógrafo con funda estéril', 'Adaptador ECG intracavitario', 'Kit punción Seldinger', 'Mepivacaína 1%', 'SSF 0.9%', 'Dispositivo anclaje sin sutura'], 
                    notes: [
                        'Exige técnica estricta de barrera máxima[cite: 2].', 
                        'Realizar mapeo previo venoso RaPeVA/RaCeVA.', 
                        'Confirmar posición mediante visualización de onda P máxima bifásica en ECG intraauricular.', 
                        'Sustituir la sutura tradicional por adhesivo tisular reduce la bacteriemia y el riesgo de flebitis mecánica.'
                    ], 
                    favorite: false 
                },
                { 
                    id: 'p3', 
                    name: 'Mantenimiento y Sellado CVC/PICC', 
                    materials: ['Clorhexidina alcohólica 2%', 'Jeringas de 10 ml', 'SSF 0.9%', 'Citrato o SSF', 'Apósito transparente'], 
                    notes: [
                        'Realizar cura semanal si el apósito es transparente, o cada 48h si es gasa por sangrado o hiperhidrosis[cite: 2].', 
                        'Permeabilizar usando técnica de lavado pulsátil (push-stop) con bolos de 1 ml para crear turbulencias fluidodinámicas.', 
                        'No usar jeringas menores a 10ml para evitar un exceso de presión intra-luminal que podría fracturar el catéter.', 
                        'El volumen de cebado debe ser equivalente al 120% del espacio muerto del catéter para evitar el reflujo sanguíneo.', 
                        'Está estrictamente contraindicado el uso de pomadas antibióticas tópicas por riesgo de resistencia y proliferación fúngica[cite: 2].'
                    ], 
                    favorite: true 
                },
                { 
                    id: 'p4', 
                    name: 'Transfusión de Hemoderivados', 
                    materials: ['Bolsa del hemoderivado cruzado', 'Sistema transfusional con filtro de 170-200 micras', 'SSF 0.9%', 'Monitor de SV'], 
                    notes: [
                        'Requiere doble comprobación cruzada a pie de cama del nombre, ABO/Rh y caducidad.', 
                        'El proceso debe completarse en un plazo máximo de 4 horas para evitar la proliferación bacteriana inducida por el aumento de temperatura.', 
                        'Los hemoderivados nunca deben administrarse de forma concomitante con otras soluciones o fármacos por la misma luz venosa, a excepción del SSF al 0.9%.', 
                        'Monitorizar signos vitales a nivel basal, a los 15 minutos (ventana de reacción hemolítica aguda o anafilaxia) y al finalizar.'
                    ], 
                    favorite: true 
                },
                
                // 2. VÍA AÉREA Y RESPIRATORIO
                { 
                    id: 'p5', 
                    name: 'Asistencia en Toracocentesis', 
                    materials: ['Clorhexidina alcohólica 2% o povidona yodada', 'Paños y guantes estériles', 'Mepivacaína al 1%', 'Agujas/Abocath 16-19G o Trócares', 'Llaves de 3 pasos y Jeringas 30-50 cc', 'Tubos analíticos'], 
                    notes: [
                        'La posición óptima suele ser sedente, con el tronco ligeramente inclinado hacia adelante y los brazos apoyados sobre una mesa auxiliar para ampliar los espacios intercostales.', 
                        'El abordaje siempre se realiza bordeando el margen superior de la costilla inferior para evadir el paquete vasculonervioso intercostal.', 
                        'Se recomienda premedicación para atenuar la respuesta nociceptiva y prevenir el síncope vasovagal.'
                    ], 
                    favorite: false 
                },
                { 
                    id: 'p6', 
                    name: 'Manejo Drenaje Pleural (Pleur-evac)', 
                    materials: ['Sistema recolector de 3 cámaras', 'Agua bidestilada / SSF', 'Gasa vaselinada'], 
                    notes: [
                        'No se debe drenar más de 1.500 ml de manera súbita para evitar edema pulmonar ex-vacuo por caída de presión.', 
                        'Verificar la permeabilidad del sistema observando la fluctuación o columpio en la cámara de sello de agua.', 
                        'La presencia de burbujeo continuo sugiere una fístula broncopleural activa o una fuga en las conexiones.', 
                        'Nunca pinzar la tubuladura si existe fuga aérea, ya que transformaría un neumotórax simple en un neumotórax a tensión letal.'
                    ], 
                    favorite: true 
                },
                { 
                    id: 'p7', 
                    name: 'Cuidados de Traqueostomía', 
                    materials: ['SSF y agua destilada', 'Clorhexidina acuosa al 2%', 'Gasas de celulosa', 'Cintas de fijación', 'Cánulas de repuesto y obturador'], 
                    notes: [
                        'Limpiar el estoma con movimientos firmes y centrífugos, manteniendo la piel circundante meticulosamente seca.', 
                        'Lavar la cánula interna e inmersión en clorhexidina acuosa al 2% durante 15-20 minutos.', 
                        'Al eludir la nasofaringe, se predispone a la desecación de las secreciones, requiriendo fluidificar aumentando la ingesta o con humidificadores.',
                        'Instruir al paciente para priorizar el baño sobre la ducha, evitar el uso de pulverizadores y utilizar ropa sin pelusas.'
                    ], 
                    favorite: false 
                },
                { 
                    id: 'p8', 
                    name: 'Aspiración de Secreciones (Vía artificial)', 
                    materials: ['Sondas de aspiración estériles', 'Jeringa 2-5 ml para instilación salina', 'Equipo de protección', 'Sistema de vacío'], 
                    notes: [
                        'Técnica estrictamente estéril.', 
                        'Preoxigenar siempre al 100% previo a la técnica.', 
                        'Aspiración suave, máximo 10-15 segundos por pase.', 
                        'No sobrepasar la longitud anatómica de la cánula para evitar traumatizar la carina traqueal.'
                    ], 
                    favorite: true 
                },

                // 3. UROLÓGICO
                { 
                    id: 'p9', 
                    name: 'Irrigación Vesical Continua (IVC)', 
                    materials: ['Sonda de 3 luces (Foley hemostática o Couvelaire)', 'SSF 0.9% Gran Volumen', 'Equipo de irrigación en Y', 'Sistema colector de circuito cerrado', 'Lubricante urológico anestésico'], 
                    notes: [
                        'Colgar las bolsas a 40-50 cm por encima del nivel de la vejiga para establecer un gradiente hidrostático óptimo.', 
                        'Titular el ritmo dinámicamente: acelerar si el efluente es rojo vinoso y enlentecer cuando adquiera tonalidad de lavado de carne.', 
                        'Está estrictamente contraindicado el uso de agua bidestilada o soluciones hipotónicas por riesgo de absorción venosa e intoxicación acuosa severa (síndrome post-RTU).', 
                        'Utilizar líquidos atemperados para evitar contracciones espasmódicas severas en el detrusor.'
                    ], 
                    favorite: true 
                },
                { 
                    id: 'p10', 
                    name: 'Extracción Coágulos Vesicales (Janet)', 
                    materials: ['Guantes estériles', 'Clorhexidina acuosa', 'Jeringa de Janet de cono ancho (50-100 cc)', 'SSF 0.9% estéril', 'Empapador'], 
                    notes: [
                        'Si el flujo de salida se interrumpe y el paciente acusa dolor hipogástrico, clampar la infusión para evitar una rotura vesical.', 
                        'Inyectar 50 cc de SSF con jeringa de Janet y aspirar con fuerza moderada para fragmentar y evacuar el coágulo obstructor.', 
                        'Repetir hasta evacuar coágulos y recuperar permeabilidad antes de reanudar el circuito continuo.'
                    ], 
                    favorite: false 
                },
                { 
                    id: 'p11', 
                    name: 'Sondaje Vesical Estándar (SVD)', 
                    materials: ['Sonda Foley', 'Lubricante urológico anestésico (lidocaína gel 2%)', 'Guantes y paño estéril', 'Jeringa 10cc y Agua Bidestilada', 'Bolsa de diuresis'], 
                    notes: [
                        'Asepsia de meato y glande/vulva con povidona yodada o clorhexidina.', 
                        'Inflar el balón de retención solo con agua bidestilada porque el suero salino puede cristalizar y bloquear la válvula.', 
                        'Técnica aséptica rigurosa, ya que es el principal factor de infecciones asociadas a la asistencia sanitaria.'
                    ], 
                    favorite: true 
                },

                // 4. DIGESTIVO Y HERIDAS
                { 
                    id: 'p12', 
                    name: 'Sondaje Nasogástrico (SNG)', 
                    materials: ['Sonda gástrica (Levin o Salem)', 'Lubricante hidrosoluble', 'Jeringa de 50 cc', 'Fonendoscopio', 'Esparadrapo hipoalergénico', 'Vaso de agua'], 
                    notes: [
                        'Calcular longitud exacta aplicando la técnica NEMU: Punta Nariz a Lóbulo Oreja, a Xifoides, a punto medio hasta ombligo.', 
                        'Utilizar lubricante hidrosoluble estricto por riesgo de neumonía lipoidea si la base lipídica va a vía aérea accidentalmente.', 
                        'Colocar al paciente en posición de Fowler y ofrecer sorbos de agua en la orofaringe para cerrar la epiglotis al deglutir.', 
                        'La confirmación de oro es radiológica, apoyada en la clínica mediante la aspiración de residuo gástrico y la medición de su pH ácido.'
                    ], 
                    favorite: true 
                },
                { 
                    id: 'p13', 
                    name: 'Cuidado de Gastrostomía (PEG)', 
                    materials: ['SSF', 'Jabón neutro', 'Gasas estériles', 'Clorhexidina acuosa o povidona yodada'], 
                    notes: [
                        'Asepsia estricta periestomal los primeros 7-14 días, luego régimen de higiene diaria con agua y jabón.', 
                        'Girar la sonda 360º sobre su eje longitudinal y hacer vaivén diariamente para evitar el enterramiento de la sonda en la mucosa gástrica (Buried Bumper).', 
                        'En caso de decanulación accidental, reintroducir inmediatamente una sonda de recambio o sonda Foley temporal para mantener el tracto permeable.', 
                        'Irrigar agresivamente con 40-50 ml de agua antes y después de cada toma de nutrición y fármacos para prevenir oclusión.'
                    ], 
                    favorite: false 
                },
                { 
                    id: 'p14', 
                    name: 'Cuidados Periestomales (Ostomías)', 
                    materials: ['Agua tibia, esponja y jabón pH neutro', 'Película barrera sin alcohol', 'Removedor adhesivo de silicona', 'Plantilla y tijeras curvas', 'Polvos absorbentes, pastas selladoras'], 
                    notes: [
                        'El efluente de ileostomía contiene enzimas proteolíticas muy corrosivas; proteger la integridad de la piel periestomal es la prioridad fundamental.', 
                        'No usar povidona, alcoholes ni óxido de zinc porque merman la adherencia de las placas hidrocoloides.', 
                        'Usar spray removedor de silicona y traccionar suavemente para evitar desgarro mecánico (epidermólisis).', 
                        'Fenestrar el disco adhesivo 1-3 mm más grande que el estoma para evitar estrangulamiento y necrosis del reborde intestinal.'
                    ], 
                    favorite: true 
                },
                { 
                    id: 'p15', 
                    name: 'Manejo Drenajes Quirúrgicos Cerrados (Redón/J-Pratt)', 
                    materials: ['Guantes no estériles', 'Recipiente medidor graduado', 'Gasas y antiséptico para incisión'], 
                    notes: [
                        'Vaciar los dispositivos dos veces al día o a mitad de capacidad puesto que al llenarse la fuerza de succión decae.', 
                        'Comprimir el reservorio al máximo extruyendo el aire antes de tapar para generar el efecto de vacío activo.', 
                        'Técnica de ordeñado (milking): Fijar el tubo en origen, pellizcar y deslizar distalmente para arrastrar coágulos de fibrina.', 
                        'Para el retiro, neutralizar el vacío destapando antes de tirar; si no, se arrancará tejido de granulación.'
                    ], 
                    favorite: false 
                },
                { 
                    id: 'p16', 
                    name: 'Terapia de Presión Negativa (TPN / VAC)', 
                    materials: ['Esponja activa de poliuretano o alcohol polivinílico', 'Film poliuretano adhesivo', 'Campana de succión', 'Apósito hidrocoloide o silicona de barrera', 'Unidad de vacío'], 
                    notes: [
                        'El macrostrain acerca bordes y quita exudado; el microstrain promueve división celular y angiogénesis masiva.', 
                        'Blindar márgenes de piel sana con barrera hidrocoloide; la esponja nunca debe rebasar el lecho para evitar úlceras iatrogénicas.', 
                        'Presión estándar a -125 mmHg, en modalidad continua 48h para estabilizar y luego intermitente para estimular capilares.', 
                        'Apagar e instilar SSF por la campana antes de retirar una esponja adherida para macerar el coágulo y minimizar hemorragia.'
                    ], 
                    favorite: true 
                },
                { 
                    id: 'p17', 
                    name: 'Cura de UPP / Herida Compleja', 
                    materials: ['Suero Fisiológico o Solución Poliheximanida', 'Gasas estériles y Guantes', 'Apósitos avanzados', 'Instrumental desbridamiento'], 
                    notes: [
                        'Limpiar irrigando a presión moderada, del centro a la periferia.', 
                        'Nunca friccionar el lecho de la herida para no destruir la frágil red neovascular de granulación.', 
                        'Aplicar el abordaje TIME: Tejido desvitalizado, Infección, Humedad y Bordes.'
                    ], 
                    favorite: false 
                },
                
                // 5. ANALÍTICAS Y TÉCNICAS GENERALES
                { 
                    id: 'p18', 
                    name: 'Extracción Analítica (Vacutainer)', 
                    materials: ['Palomilla o Aguja recta', 'Tubos de vacío', 'Campana/Adaptador', 'Gasas', 'Compresor venoso'], 
                    notes: [
                        'Orden universal: Hemocultivos → Citrato (Azul) → Suero (Rojo/Oro) → Heparina (Verde) → EDTA (Lila) → Fluoruro (Gris).', 
                        'Invertir tubos suavemente 8-10 veces para mezclar aditivos.', 
                        'No mantener el compresor apretado > 1-2 minutos para evitar hemoconcentración falsa.'
                    ], 
                    favorite: true 
                },
                { 
                    id: 'p19', 
                    name: 'Extracción de Hemocultivos', 
                    materials: ['Sets de 2 frascos (Aerobio y Anaerobio)', 'Palomilla', 'Clorhexidina alcohólica 2%', 'Guantes estériles'], 
                    notes: [
                        'Asepsia de la piel y de los tapones de goma de los frascos para evitar falsos positivos bacterianos.', 
                        'Con palomilla, llenar SIEMPRE PRIMERO el frasco AEROBIO para que el aire purgado no afecte a los anaerobios.'
                    ], 
                    favorite: true 
                },
                { 
                    id: 'p20', 
                    name: 'Gasometría Arterial', 
                    materials: ['Jeringa heparinizada', 'Aguja SC', 'Clorhexidina alcohólica', 'Gasas', 'Contenedor punzantes'], 
                    notes: [
                        'Obligatorio "Test de Allen" previo a la punción radial para comprobar suplencia de red ulnar.', 
                        'Punción a 45º en arteria radial o 90º en femoral.', 
                        'Comprimir ininterrumpidamente entre 5 a 10 min tras la extracción.',
                        'Purgar cualquier burbuja de aire inmediatamente y enviar en hielo si demora.'
                    ], 
                    favorite: true 
                },
                { 
                    id: 'p21', 
                    name: 'Electrocardiograma (ECG)', 
                    materials: ['Electrodos', 'Alcohol/Gasas/Gel', 'Papel ECG', 'Electrocardiógrafo', 'Maquinilla'], 
                    notes: [
                        'V1: 4º EIC borde esternal Derecho. V2: 4º EIC borde esternal Izquierdo.', 
                        'V4: 5º EIC línea medioclavicular Izquierda. V3: Entre V2 y V4.', 
                        'V5: 5º EIC línea axilar anterior. V6: 5º EIC línea axilar media.',
                        'Asegurar buena conductancia rasurando exceso de vello y limpiando grasa de la piel.'
                    ], 
                    favorite: true 
                },
                { 
                    id: 'p22', 
                    name: 'RCP Básica (SVB) Adultos', 
                    materials: ['Desfibrilador Externo Automático (DEA)', 'Ambú', 'Cánula de Guedel', 'Guantes'], 
                    notes: [
                        'Ciclo de 30 compresiones / 2 ventilaciones de forma ininterrumpida.', 
                        'Profundidad de 5 a 6 cm en centro del esternón a ritmo de 100-120 lpm.', 
                        'Permitir re-expansión completa del tórax para asegurar retorno venoso.',
                        'Pausas menores a 10s y aplicar parches de DEA sin interrumpir masaje.'
                    ], 
                    favorite: true 
                }
            ],
            quiz: [
                { id: 'q1', topic: 'Fundamentos', q: '¿Qué valora específicamente la escala de Braden?', o: ['Riesgo de caídas', 'Nivel de consciencia', 'Riesgo de UPP', 'Dependencia ABVD'], a: 2, e: 'Braden y Norton evalúan el riesgo de desarrollar Úlceras por Presión (UPP).' },
                { id: 'q2', topic: 'Farmacología', q: '¿Cuál es el antídoto específico de las benzodiacepinas?', o: ['Naloxona', 'Flumazenilo', 'Protamina', 'Acetilcisteína'], a: 1, e: 'El flumazenilo revierte los efectos sedantes de las BZD. La naloxona es para opiáceos.' },
                { id: 'q3', topic: 'Urgencias', q: 'En la RCP básica de un adulto, la relación compresión/ventilación es:', o: ['15:2', '30:2', '5:1', 'Continua siempre'], a: 1, e: 'Según guías ERC/AHA, la relación universal en adultos es 30:2 salvo vía aérea aislada.' },
                { id: 'q4', topic: 'Materno-Infantil', q: '¿En qué semana de gestación se realiza habitualmente el test de O’Sullivan?', o: ['Semanas 10-12', 'Semanas 24-28', 'Semanas 32-34', 'Semana 40'], a: 1, e: 'El cribado de diabetes gestacional (O’Sullivan) se hace de rutina entre las semanas 24 y 28.' },
                { id: 'q5', topic: 'Farmacología', q: 'El sulfato de protamina es el antídoto de la:', o: ['Heparina Sódica', 'Warfarina', 'Digoxina', 'Insulina'], a: 0, e: 'La protamina neutraliza rápidamente la heparina no fraccionada.' },
                { id: 'q6', topic: 'Cuidados Críticos', q: '¿Qué ritmos cardíacos son DESFIBRILABLES en una parada?', o: ['Asistolia y FV', 'AESP y Asistolia', 'FV y TV sin pulso', 'TV con pulso y FV'], a: 2, e: 'Solo la Fibrilación Ventricular (FV) y la Taquicardia Ventricular sin pulso (TVSP) se desfibrilan.' },
                { id: 'q7', topic: 'Fundamentos', q: '¿Qué posición se recomienda para administrar un enema?', o: ['Decúbito supino', 'Posición de Sims izquierda', 'Trendelenburg', 'Fowler'], a: 1, e: 'La posición de Sims lateral izquierda sigue la anatomía del colon sigmoide.' },
                { id: 'q8', topic: 'Neurología', q: '¿Qué 3 parámetros evalúa la Escala de Coma de Glasgow?', o: ['Apertura ocular, Reflejos, Motor', 'Ocular, Verbal, Motor', 'Pupilas, Verbal, Respiratorio', 'Consciencia, Pupilas, Dolor'], a: 1, e: 'El GCS (3 a 15 puntos) evalúa respuesta Ocular (4), Verbal (5) y Motora (6).' },
                { id: 'q9', topic: 'Quirúrgica', q: '¿Qué tipo de aislamiento requiere un paciente con Tuberculosis Pulmonar?', o: ['Por gotas', 'De contacto', 'Aéreo (Respiratorio)', 'Inverso'], a: 2, e: 'Requiere aislamiento aéreo (partículas < 5 micras), habitación con presión negativa y mascarilla FFP2/FFP3.' },
                { id: 'q10', topic: 'Endocrinología', q: 'La aparición de espasmo carpopedal al inflar el manguito de tensión es el signo de:', o: ['Chvostek', 'Babinski', 'Trousseau', 'Kernig'], a: 2, e: 'El signo de Trousseau indica hipocalcemia latente grave.' },
                { id: 'q11', topic: 'Hemoterapia', q: 'El grupo sanguíneo considerado "Donante Universal" de concentrados de hematíes es:', o: ['AB Positivo', 'O Positivo', 'AB Negativo', 'O Negativo'], a: 3, e: 'El grupo O- carece de antígenos A, B y factor Rh, por lo que no provoca rechazo.' },
                { id: 'q12', topic: 'Quemados', q: 'Según la regla de los 9 de Wallace, el tronco anterior de un adulto corresponde a:', o: ['9%', '18%', '36%', '1%'], a: 1, e: 'El tronco anterior suma un 18% de Superficie Corporal Quemada (SCQ).' },
                { id: 'q13', topic: 'Farmacología', q: '¿Qué electrolito altera directamente la toxicidad de la Digoxina?', o: ['Hiponatremia', 'Hipercalcemia', 'Hipopotasemia', 'Hipercloremia'], a: 2, e: 'La hipopotasemia (niveles bajos de K+) favorece la intoxicación digitálica.' },
                { id: 'q14', topic: 'Enfermedades Infecciosas', q: 'La fase de transmisión de la Tosferina es máxima en su periodo:', o: ['Catarral', 'Paroxístico', 'De convalecencia', 'Asintomático'], a: 0, e: 'El periodo catarral temprano es el más contagioso antes de que aparezcan los paroxismos de tos.' }
            ],
            labs: [
                // HEMOGRAMA Y SERIE ROJA
                ['Hemoglobina', 'Hb', 'g/dL', 'M: 12.0 - 15.5 | H: 13.5 - 17.5', 'Hematimetría'],
                ['Hematocrito', 'Hto', '%', 'M: 36.0 - 46.0 | H: 41.0 - 50.0', 'Hematimetría'],
                ['Hematíes', 'RBC', 'millones/µL', 'M: 4.2 - 5.4 | H: 4.7 - 6.1', 'Hematimetría'],
                ['Volumen Corpuscular Medio', 'VCM', 'fL', '80.0 - 100.0', 'Índices Eritrocitarios'],
                ['Hemoglobina Corpuscular Media', 'HCM', 'pg', '27.0 - 33.0', 'Índices Eritrocitarios'],
                ['Amplitud Distribución Eritrocitaria', 'ADE / RDW', '%', '11.5 - 14.5', 'Índices Eritrocitarios'],
                ['Reticulocitos', 'Ret', '%', '0.5 - 2.5', 'Hematimetría'],

                // FÓRMULA LEUCOCITARIA Y PLAQUETAS
                ['Leucocitos', 'WBC', '/µL', '4.500 - 11.000', 'Fórmula Leucocitaria'],
                ['Neutrófilos', 'PMN', '%', '45 - 73', 'Fórmula Leucocitaria'],
                ['Linfocitos', 'LYM', '%', '20 - 40', 'Fórmula Leucocitaria'],
                ['Monocitos', 'MONO', '%', '2 - 8', 'Fórmula Leucocitaria'],
                ['Eosinófilos', 'EOS', '%', '1 - 4', 'Fórmula Leucocitaria'],
                ['Basófilos', 'BASO', '%', '< 1', 'Fórmula Leucocitaria'],
                ['Plaquetas', 'PLT', '/µL', '150.000 - 450.000', 'Plaquetas'],
                ['Volumen Plaquetar Medio', 'VPM', 'fL', '7.5 - 11.5', 'Plaquetas'],

                // COAGULACIÓN Y FIBRINOLISIS
                ['Tiempo de Protrombina', 'TP', 'segundos', '11.0 - 13.5', 'Coagulación'],
                ['Actividad Protrombina', 'Act. TP', '%', '70 - 120', 'Coagulación'],
                ['INR', 'INR', '-', 'Sano: 0.8-1.2 | ACO: 2.0-3.0', 'Coagulación'],
                ['T. Tromboplastina Parcial', 'TTPa', 'segundos', '25.0 - 35.0', 'Coagulación'],
                ['Fibrinógeno', 'FIB', 'mg/dL', '200 - 400', 'Coagulación'],
                ['Dímero-D', 'DD', 'ng/mL', '< 500', 'Fibrinolisis'],

                // IONOGRAMA Y ELECTROLITOS
                ['Sodio', 'Na+', 'mEq/L', '135 - 145', 'Ionograma'],
                ['Potasio', 'K+', 'mEq/L', '3.5 - 5.0', 'Ionograma'],
                ['Cloro', 'Cl-', 'mEq/L', '98 - 107', 'Ionograma'],
                ['Calcio Total', 'Ca', 'mg/dL', '8.5 - 10.5', 'Ionograma'],
                ['Calcio Iónico', 'Ca++', 'mmol/L', '1.12 - 1.32', 'Ionograma'],
                ['Magnesio', 'Mg', 'mg/dL', '1.7 - 2.2', 'Ionograma'],
                ['Fósforo', 'P', 'mg/dL', '2.5 - 4.5', 'Ionograma'],

                // GASOMETRÍA ARTERIAL
                ['pH Arterial', 'pH', '-', '7.35 - 7.45', 'Gasometría'],
                ['Presión Oxígeno', 'PaO2', 'mmHg', '80 - 100', 'Gasometría'],
                ['Presión Dióxido Carbono', 'PaCO2', 'mmHg', '35 - 45', 'Gasometría'],
                ['Bicarbonato', 'HCO3-', 'mEq/L', '22 - 26', 'Gasometría'],
                ['Exceso de Bases', 'EB', 'mEq/L', '-2 a +2', 'Gasometría'],
                ['Saturación Oxígeno', 'SaO2', '%', '> 95', 'Gasometría'],
                ['Lactato', 'Ác. Láctico', 'mmol/L', '< 2.0', 'Gasometría'],

                // BIOQUÍMICA METABÓLICA Y LÍPIDOS
                ['Glucosa Basal', 'Glu', 'mg/dL', '70 - 99', 'Metabolismo'],
                ['Hemoglobina Glicosilada', 'HbA1c', '%', '< 5.7', 'Metabolismo'],
                ['Colesterol Total', 'Col', 'mg/dL', '< 200', 'Lípidos'],
                ['Colesterol LDL', 'LDL', 'mg/dL', '< 100', 'Lípidos'],
                ['Colesterol HDL', 'HDL', 'mg/dL', 'M: > 50 | H: > 40', 'Lípidos'],
                ['Triglicéridos', 'TG', 'mg/dL', '< 150', 'Lípidos'],

                // FUNCIÓN RENAL Y HEPÁTICA
                ['Creatinina', 'Cr', 'mg/dL', 'M: 0.6 - 1.1 | H: 0.7 - 1.3', 'Función Renal'],
                ['Urea', 'Urea', 'mg/dL', '10 - 50', 'Función Renal'],
                ['Filtrado Glomerular', 'eGFR', 'mL/min', '> 90', 'Función Renal'],
                ['Ácido Úrico', 'Ac. Uric', 'mg/dL', 'M: 2.4 - 6.0 | H: 3.4 - 7.0', 'Función Renal'],
                ['Bilirrubina Total', 'BT', 'mg/dL', '0.1 - 1.2', 'Función Hepática'],
                ['AST / GOT', 'AST', 'U/L', '8 - 33', 'Enzimas Hepáticas'],
                ['ALT / GPT', 'ALT', 'U/L', '4 - 36', 'Enzimas Hepáticas'],
                ['Gamma-GT', 'GGT', 'U/L', 'M: 5 - 36 | H: 8 - 61', 'Enzimas Hepáticas'],
                ['Fosfatasa Alcalina', 'FA / ALP', 'U/L', '44 - 147', 'Enzimas Hepáticas'],
                ['Amilasa', 'Amy', 'U/L', '30 - 110', 'Pancreática'],
                ['Lipasa', 'Lipasa', 'U/L', '0 - 160', 'Pancreática'],

                // MARCADORES E INFLAMACIÓN
                ['Troponina T', 'TnT-hs', 'ng/L', '< 14', 'Cardíaco'],
                ['NT-proBNP', 'proBNP', 'pg/mL', '< 125', 'Cardíaco'],
                ['Proteína C Reactiva', 'PCR', 'mg/L', '< 5.0', 'Marcadores Inflamatorios'],
                ['Procalcitonina', 'PCT', 'ng/mL', '< 0.15', 'Marcadores Inflamatorios'],
                ['Velocidad Sedimentación', 'VSG', 'mm/h', 'M: < 20 | H: < 15', 'Marcadores Inflamatorios'],
                
                // ORINA (SISTEMÁTICO)
                ['Densidad Urinaria', 'Dens', '-', '1.005 - 1.030', 'Orina'],
                ['pH Urinario', 'pH', '-', '4.6 - 8.0', 'Orina'],
                ['Proteínas', 'Prot', 'mg/dL', 'Negativo (< 15)', 'Orina'],
                ['Glucosa', 'Gluc', 'mg/dL', 'Negativo', 'Orina'],
                ['Leucocitos (Esterasa)', 'Leu', '-', 'Negativo', 'Orina'],
                ['Nitritos', 'Nit', '-', 'Negativo', 'Orina']
            ],
            glossary: [
                ['AAS', 'Ácido Acetilsalicílico'],
                ['ABVD', 'Actividades Básicas de la Vida Diaria'],
                ['ACV / ICTUS', 'Accidente Cerebrovascular'],
                ['AINE', 'Antiinflamatorio No Esteroideo'],
                ['ARM', 'Asistencia Respiratoria Mecánica'],
                ['BGN / BGP', 'Bacilo Gram Negativo / Bacilo Gram Positivo'],
                ['BZD', 'Benzodiacepina'],
                ['CAV', 'Catéter Arterio-Venoso'],
                ['CID', 'Coagulación Intravascular Diseminada'],
                ['CPAP / BiPAP', 'Presión Positiva Continua / De Dos Niveles en Vía Aérea'],
                ['CVC', 'Catéter Venoso Central'],
                ['DEA / DESA', 'Desfibrilador Externo Semiautomático'],
                ['DP', 'Diálisis Peritoneal'],
                ['EAP', 'Edema Agudo de Pulmón'],
                ['ECG / EKG', 'Electrocardiograma'],
                ['EEG', 'Electroencefalograma'],
                ['EPOC', 'Enfermedad Pulmonar Obstructiva Crónica'],
                ['EVA', 'Escala Visual Analógica (Medición del Dolor)'],
                ['FA', 'Fibrilación Auricular'],
                ['FC', 'Frecuencia Cardíaca'],
                ['FiO2', 'Fracción Inspiratoria de Oxígeno'],
                ['FR', 'Frecuencia Respiratoria'],
                ['FV', 'Fibrilación Ventricular'],
                ['GCS', 'Glasgow Coma Scale (Escala de Coma de Glasgow)'],
                ['GEA', 'Gastroenteritis Aguda'],
                ['Gluc', 'Glucemia Capilar / Basal'],
                ['Hb', 'Hemoglobina'],
                ['HDA / HDB', 'Hemorragia Digestiva Alta / Hemorragia Digestiva Baja'],
                ['HIC', 'Hipertensión Intracraneal'],
                ['HTA', 'Hipertensión Arterial'],
                ['IAM', 'Infarto Agudo de Miocardio'],
                ['ICC', 'Insuficiencia Cardíaca Congestiva'],
                ['IECA', 'Inhibidor de la Enzima Convertidora de Angiotensina'],
                ['IMC', 'Índice de Masa Corporal'],
                ['IRA', 'Insuficiencia Renal Aguda / Insuficiencia Respiratoria Aguda'],
                ['IRC', 'Insuficiencia Renal Crónica'],
                ['ITU', 'Infección del Tracto Urinario'],
                ['IVC', 'Irrigación Vesical Continua'],
                ['LCR', 'Líquido Cefalorraquídeo'],
                ['LPP / UPP', 'Lesión / Úlcera por Presión'],
                ['NE', 'Nutrición Enteral'],
                ['NPO', 'Nada Por Vía Oral (Non Per Os - Ayuno absoluto)'],
                ['NPT', 'Nutrición Parenteral Total'],
                ['PA / TA', 'Presión Arterial / Tensión Arterial'],
                ['PAM', 'Presión Arterial Media'],
                ['PCR', 'Parada Cardiorrespiratoria (Clínica) / Proteína C Reactiva (Lab)'],
                ['PEEP', 'Presión Positiva al Final de la Espiración'],
                ['PEG', 'Gastrostomía Endoscópica Percutánea'],
                ['PIC', 'Presión Intracraneal'],
                ['PICC', 'Catéter Venoso Central de Inserción Periférica'],
                ['PL', 'Punción Lumbar'],
                ['PVC', 'Presión Venosa Central'],
                ['Qx', 'Quirúrgico / Área de Quirófano'],
                ['RCP', 'Reanimación Cardiopulmonar'],
                ['REA', 'Área de Reanimación Crítica'],
                ['RM / RMN', 'Resonancia Magnética (Nuclear)'],
                ['RTU', 'Resección Transuretral (Próstata / Vejiga)'],
                ['Rx', 'Radiografía / Prescripción Médica'],
                ['SatO2', 'Saturación Periférica de Oxígeno'],
                ['SCA', 'Síndrome Coronario Agudo'],
                ['SDRA', 'Síndrome de Distrés Respiratorio Agudo'],
                ['SG / SF', 'Suero Glucosado / Suero Fisiológico'],
                ['SNG', 'Sonda Nasogástrica'],
                ['SOG', 'Sonda Orogástrica'],
                ['SVA / SVB', 'Soporte Vital Avanzado / Soporte Vital Básico'],
                ['SVD', 'Sonda Vesical de Drenaje'],
                ['TAC / TC', 'Tomografía Axial Computarizada'],
                ['TCE', 'Traumatismo Craneoencefálico'],
                ['TEP', 'Tromboembolismo Pulmonar'],
                ['TET', 'Tubo Endotraqueal'],
                ['TV', 'Taquicardia Ventricular'],
                ['TVP', 'Trombosis Venosa Profunda'],
                ['UCI / UVI', 'Unidad de Cuidados Intensivos / Vigilancia Intensiva'],
                ['URPA', 'Unidad de Recuperación Postanestésica'],
                ['VM', 'Ventilación Mecánica'],
                ['VMNI', 'Ventilación Mecánica No Invasiva'],
                ['VRS', 'Virus Sincitial Respiratorio'],
                ['VVP', 'Vía Venosa Periférica']
            ],
            
             ucv : { 
  academicYear: '2026-2027', 
  subjects: { 
    "1": [
      ["1211101", "Anatomía Humana y Funcional", "1"], 
      ["1210104", "Antropología", "1"], 
      ["1211104", "Bioquímica Clínica", "1"], 
      ["1211108", "Fundamentos en Enfermería", "1"], 
      ["1211107", "Psicología del Cuidado", "1"],
      ["1210105", "Atención a la Salud de la Comunidad", "2"],
      ["1211103", "Bioestadística y Metodología de la Investigación", "2"],
      ["1211105", "Fisiología Humana", "2"],
      ["1211106", "Inglés", "2"],
      ["1211109", "Metodología Enfermera", "2"]
    ], 
    "2": [
      ["1210206", "Ciencia, Razón y Fe", "1"], 
      ["1211206", "Farmacología", "1"],
      ["1211203", "Fisiopatología", "1"],
      ["1210204", "Nutrición y Dietética", "1"],
      ["1210205", "Cuidados a las Personas Mayores", "2"],
      ["1210201", "Cuidados del Adulto I", "2"],
      ["1210202", "Cuidados en la Infancia y Adolescencia", "2"],
      ["1210207", "Moral Social-Deontología", "2"],
      ["1213203", "Practicum I", "Anual"]
    ],
    "3": [
      ["1210308", "Cuidados a las Mujeres", "1"],
      ["1210303", "Cuidados del Adulto II", "1"],
      ["1210307", "Cuidados Paliativos", "1"],
      ["1210309", "Enfermería en Atención Primaria", "2"],
      ["1210306", "Legislación y Gestión de los Servicios de Enfermería", "2"],
      ["1213305", "Practicum II", "Anual"],
      ["1213304", "Practicum III", "Anual"]
    ],
    "4": [
      ["1210401", "Cuidados en Salud Mental", "1"],
      ["1210402", "Soporte Vital y Atención a la Urgencia", "1"],
      ["1213403", "Practicum IV", "Anual"],
      ["1213404", "Practicum V", "Anual"],
      ["1214402", "Trabajo Fin de Grado", "Anual"]
    ]
  } 
}
        };

        const _rawState = {
            route: 'today',
            calendarMode: 'week',
            calendarViewDate: getLocalISOToday(),
            calendarSelectedDate: getLocalISOToday(),
            slideOverOpen: false, slideOverView: null, slideOverData: null,
            readOnlyMode: false,
            settings: {
                onboardingComplete: false, profileName: '', university: '',
                tutorialComplete: false, tutorialStep: 0,
                courseNumber: '1', course: '1º Enfermería', selectedSubjects: [],
                hasPracticum: false, practicum: '', hospital: '', service: '',
                periodStart: '', periodEnd: '', shift: '',
                theme: 'system', icdWorker: '', apiMode: 'direct',
                lockEnabled: false, lockMethod: 'webauthn', pinHash: '', credentialId: '', autoLock: 5, showClinicalWarnings: true,
                glovesMode: false, legalAccepted: false, legalAcceptedAt: '', caseFilterArea: ''
            },
            unlocked: true, lastActive: Date.now()
        };

        const state = new Proxy(_rawState, {
            set(target, property, value) {
                const oldGloves = target.settings?.glovesMode;
                target[property] = value;
                if (property === 'route') {
                    $$('.nav-item').forEach(b => { b.classList.toggle('active', b.dataset.route === value); if(b.dataset.route === value) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current'); });
                    renderView();
                    window.scrollTo({ top: 0, behavior: 'instant' });
                }
                if (property === 'slideOverOpen') {
                    const el = $('#slideOver');
                    if (value) {
                        el.classList.add('open');
                        renderSlideOverContent(target.slideOverView, target.slideOverData);
                    } else {
                        UI.slideRenderId++; el.classList.remove('open');
                        setTimeout(() => { if (!target.slideOverOpen) $('#slideOverContent').innerHTML = ''; }, 300);
                    }
                }
                if (property === 'readOnlyMode') {
                    document.documentElement.classList.toggle('readonly-mode', value); ClinicalUI.enhance();
                    renderView();
                }
                if (property === 'settings' && value.glovesMode !== oldGloves) {
                    document.documentElement.classList.toggle('gloves-mode', value.glovesMode);
                }
                return true;
            }
        });

        const UI = {
            slideRenderId: 0,
            toast(msg, type = 'success') {
                const t = $('#toast');
                const icon = $('#toastIcon');
                
                // Configurar el icono y color según el tipo de mensaje
                t.className = `toast ${type}`;
                if(type === 'error') icon.textContent = '!';
                else if(type === 'info') icon.textContent = 'i';
                else icon.textContent = '✓';

                $('#toastMsg').textContent = msg;
                
                t.classList.add('show');
                clearTimeout(UI.toast.t); 
                UI.toast.t = setTimeout(() => t.classList.remove('show'), 3500);
            },
            async confirm(title, text, confirmBtn = 'Aceptar', danger = false) {
                return new Promise(resolve => {
                    $('#modalTitle').textContent = title; $('#modalBody').textContent = text;
                    $('#modalActions').innerHTML = `
                        <button class="btn" id="modCancel">Cancelar</button>
                        <button class="btn ${danger ? 'danger' : 'primary'}" id="modConfirm">${confirmBtn}</button>
                    `;
                    $('#modalOverlay').classList.add('open');
                    $('#modCancel').onclick = () => { $('#modalOverlay').classList.remove('open'); resolve(false); };
                    $('#modConfirm').onclick = () => { $('#modalOverlay').classList.remove('open'); resolve(true); };
                });
            },
            alert(title, text) {
                $('#modalTitle').textContent = title; $('#modalBody').innerHTML = text;
                $('#modalActions').innerHTML = `<button class="btn primary" id="modOk">OK</button>`;
                $('#modalOverlay').classList.add('open');
                $('#modOk').onclick = () => $('#modalOverlay').classList.remove('open');
            },
            openSlide(view, title, data = null) {
                state.slideOverView = view; state.slideOverData = data;
                $('#slideOverTitle').textContent = title; state.slideOverOpen = true;
            }
        };

        const AutoBackup = {
            async setup() {
                if (!('showSaveFilePicker' in window)) return UI.alert('No compatible', 'Tu dispositivo (ej. iPhone/Safari) no soporta el autoguardado en segundo plano. Sigue usando la Exportación Manual.');
                try {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: 'nurseflow-backup-auto.json',
                        types: [{ description: 'Archivo de Respaldo JSON', accept: { 'application/json': ['.json'] } }]
                    });
                    await NurseDB.put('settings', { id: 'backupHandle', handle });
                    UI.toast('Archivo de autoguardado enlazado con éxito', 'success');
                    await this.run(true);
                } catch (e) {
                    if(e.name !== 'AbortError') UI.toast('Error al enlazar el archivo', 'error');
                }
            },
            async run(interactive = false) {
                if (!('showSaveFilePicker' in window)) return;
                try {
                    const record = await NurseDB.get('settings', 'backupHandle');
                    if (!record || !record.handle) return;
                    
                    const handle = record.handle;
                    let perm = 'granted';
                    
                    // Comprobar si la API soporta queryPermission para evitar el TypeError
                    if (typeof handle.queryPermission === 'function') {
                        perm = await handle.queryPermission({ mode: 'readwrite' });
                        
                        if (perm !== 'granted') {
                            if (interactive) {
                                if (typeof handle.requestPermission === 'function') {
                                    perm = await handle.requestPermission({ mode: 'readwrite' });
                                } else {
                                    perm = 'granted'; // Fallback
                                }
                            } else {
                                const t = $('#toast');
                                $('#toastIcon').textContent = '💾';
                                $('#toastMsg').textContent = 'Toca aquí para actualizar la copia de seguridad auto.';
                                t.className = 'toast show'; 
                                t.classList.add('toast--action'); t.setAttribute('role','button'); t.tabIndex=0;
                                
                                t.onclick = async () => {
                                    t.classList.remove('show');
                                    t.onclick = null;
                                    t.classList.remove('toast--action'); t.setAttribute('role','status'); t.removeAttribute('tabindex');
                                    await this.run(true); 
                                };
                                
                                clearTimeout(UI.toast.t);
                                UI.toast.t = setTimeout(() => { 
                                    t.classList.remove('show'); 
                                    t.onclick = null; 
                                    t.classList.remove('toast--action'); t.setAttribute('role','status'); t.removeAttribute('tabindex');
                                }, 8000);
                                return;
                            }
                        }
                    }
                    
                    if (perm === 'granted') {
                        const data = await NurseDB.exportAll();
                        const writable = await handle.createWritable();
                        await writable.write(JSON.stringify(data));
                        await writable.close();
                        if (interactive) UI.toast('Autoguardado actualizado en segundo plano ✓', 'success');
                    }
                } catch (e) {
                    console.error('AutoBackup error:', e);
                    if (interactive && e.name === 'NotAllowedError') {
                        UI.toast('Permiso denegado para escribir en el archivo', 'error');
                    }
                }
            }
        };

        const setTitle = (title, context = 'NurseFlow Pro') => { $('#pageTitle').textContent = title; $('#contextLabel').textContent = context; };
        
        const UIHelpers = {
            section: (title, actionHtml = '') => `<div class="section-title"><span>${esc(title)}</span>${actionHtml}</div>`,
            noData: (title, body = '', cta = '') => `<div class="empty-state"><strong>${esc(title)}</strong><span class="text-small">${esc(body)}</span>${state.readOnlyMode ? '' : cta}</div>`,
            notice: (text, info = false, danger = false) => `<div role="status" class="notice ${info ? 'info' : ''} ${danger ? 'danger' : ''}">${text}</div>`,
            clinicalWarning: () => state.settings.showClinicalWarnings ? `<div class="notice mt-6">⚠️ Uso académico y de apoyo. Verifica siempre la prescripción, ficha técnica y protocolo vigente de tu unidad hospitalaria.</div>` : '',
            listRow: ({ title, sub, icon = '✓', badge = '', action = '', id = '' }) => `
                <${action ? 'button type="button"' : 'div'} class="list-row ${action ? 'clickable' : ''}" ${action} ${id ? `id="${id}"` : ''}>
                    <div class="avatar">${icon}</div>
                    <div class="grow"><strong>${esc(title)}</strong><div class="sub">${esc(sub)}</div></div>
                    ${badge ? `<span class="pill">${esc(badge)}</span>` : ''}
                    ${action ? '<span class="chev">›</span>' : ''}
                </${action ? 'button' : 'div'}>`,
            medRow: (m, isLocal = false) => UIHelpers.listRow({
                title: m.name || m.nombre || 'Medicamento', sub: m.cn || m.nregistro || m.registration || '', icon: 'Rx',
                action: isLocal ? `data-action="openSlide" data-view="medLocalDetail" data-id="${esc(m.id)}"` : `data-action="openMedRemote" data-json='${esc(JSON.stringify(m))}'`
            })
        };

        const Calculadoras = (() => {
    const campo = (key, label, unit, example, extra = {}) =>
        ({ key, label, unit, example, ...extra });

    const peso = () => campo('P', 'Peso', 'kg', 70);
    const volumen = () => campo('V', 'Volumen final', 'mL', 500);
    const ritmo = () => campo('R', 'Velocidad', 'mL/h', 125);
    const cantidad = () =>
        campo('M', 'Fármaco total en la preparación', 'mg', 250);

    const tiempo = () => campo('T', 'Tiempo', 'h', 4, {
        units: [['h', 1], ['min', 1 / 60]]
    });

    const talla = () => campo('H', 'Talla', 'cm', 170, {
        units: [['cm', 1], ['m', 100]]
    });

    const presiones = () => [
        campo('S', 'Presión sistólica', 'mmHg', 120),
        campo('D', 'Presión diastólica', 'mmHg', 80)
    ];

    const presionValida = v => v.S <= v.D
        ? { S: 'La sistólica debe superar a la diastólica.' }
        : {};

    const lista = [];

    const add = (
        id, name, group, unit, fields, formula, calc,
        note = '', check = () => ({})
    ) => lista.push({
        id, name, group, unit, fields, formula, calc, note, check
    });

    // 1–5. INFUSIONES

    add('mlh', 'Velocidad de infusión', 'Infusiones', 'mL/h',
        [volumen(), tiempo()],
        'V ÷ T', v => v.V / v.T);

    add('drops', 'Goteo por gravedad', 'Infusiones', 'gotas/min',
        [
            volumen(), tiempo(),
            campo('F', 'Factor del equipo', 'gotas/mL', 20, {
                integer: true
            })
        ],
        'V × F ÷ (T × 60)',
        v => v.V * v.F / (v.T * 60),
        'Introduce el factor indicado en el equipo; no se presupone 20. El resultado se redondea a gotas enteras.');

    add('time', 'Duración de una infusión', 'Infusiones', 'h',
        [volumen(), ritmo()],
        'V ÷ R', v => v.V / v.R,
        'Horas decimales: 1,5 h equivale a 1 h 30 min.');

    add('volume', 'Volumen infundido', 'Infusiones', 'mL',
        [ritmo(), tiempo()],
        'R × T', v => v.R * v.T);

    add('dropsmlh', 'De gotas/min a mL/h', 'Infusiones', 'mL/h',
        [
            campo('G', 'Goteo', 'gotas/min', 30),
            campo('F', 'Factor del equipo', 'gotas/mL', 20, {
                integer: true
            })
        ],
        'G × 60 ÷ F', v => v.G * 60 / v.F);

    // 6–12. DOSIS Y DILUCIONES

    add('dose', 'Volumen de una dosis por peso',
        'Dosis y diluciones', 'mL',
        [
            campo('D', 'Dosis prescrita por administración', 'mg/kg', 10),
            peso(),
            campo('C', 'Concentración disponible', 'mg/mL', 100)
        ],
        'D × P ÷ C', v => v.D * v.P / v.C,
        'Usa mg/kg por administración, no mg/kg/día. No comprueba dosis máximas ni la idoneidad de la prescripción.');

    add('dosevol', 'Volumen para una dosis prescrita',
        'Dosis y diluciones', 'mL',
        [
            campo('D', 'Dosis prescrita', 'mg', 500),
            cantidad(), volumen()
        ],
        'D × V ÷ M', v => v.D * v.V / v.M,
        'La cantidad de fármaco y el volumen deben corresponder a la misma preparación final.');

    add('tablets', 'Número de comprimidos',
        'Dosis y diluciones', 'comprimidos',
        [
            campo('D', 'Dosis prescrita', 'mg', 750),
            campo('C', 'Contenido por comprimido', 'mg', 500)
        ],
        'D ÷ C', v => v.D / v.C,
        'Un resultado fraccionario no implica que se pueda partir el comprimido. Comprueba su ficha técnica.');

    add('daily', 'Dosis diaria por peso, repartida',
        'Dosis y diluciones', 'mg/toma',
        [
            campo('D', 'Dosis diaria prescrita', 'mg/kg/día', 30),
            peso(),
            campo('N', 'Tomas iguales al día', 'tomas/día', 3, {
                integer: true
            })
        ],
        'D × P ÷ N', v => v.D * v.P / v.N,
        'Solo para una dosis diaria ya prescrita y dividida en tomas iguales. No calcula una pauta recomendada.');

    add('conc', 'Concentración de una preparación',
        'Dosis y diluciones', 'mg/mL',
        [cantidad(), volumen()],
        'M ÷ V', v => v.M / v.V);

    add('dilution', 'Dilución: volumen de solución inicial',
        'Dosis y diluciones', 'mL',
        [
            campo('A', 'Concentración inicial', 'mg/mL', 100),
            campo('B', 'Concentración final deseada', 'mg/mL', 10),
            volumen()
        ],
        'B × V ÷ A', v => v.B * v.V / v.A,
        'Completa hasta el volumen final indicado. No comprueba diluyentes, compatibilidad ni desplazamiento de volumen.',
        v => v.B > v.A
            ? { B: 'Una dilución no puede aumentar la concentración.' }
            : {});

    add('percent', 'Concentración porcentual p/v',
        'Dosis y diluciones', 'mg/mL',
        [campo('C', 'Porcentaje peso/volumen', '% p/v', 2)],
        'C × 10', v => v.C * 10,
        'Solo % p/v: gramos de soluto por 100 mL de solución. No sirve para % v/v o % p/p.');

    // 13–17. PERFUSIONES

    add('mcg', 'Perfusión en mcg/kg/min → mL/h',
        'Perfusiones', 'mL/h',
        [
            campo('D', 'Dosis prescrita', 'mcg/kg/min', 0.1),
            peso(), cantidad(), volumen()
        ],
        'D × P × 60 × V ÷ (M × 1000)',
        v => v.D * v.P * 60 * v.V / (v.M * 1000));

    add('reverse', 'Perfusión en mL/h → mcg/kg/min',
        'Perfusiones', 'mcg/kg/min',
        [ritmo(), peso(), cantidad(), volumen()],
        'R × M × 1000 ÷ (V × P × 60)',
        v => v.R * v.M * 1000 / (v.V * v.P * 60));

    add('mgh', 'Perfusión en mg/h → mL/h',
        'Perfusiones', 'mL/h',
        [
            campo('D', 'Dosis prescrita', 'mg/h', 5),
            cantidad(), volumen()
        ],
        'D × V ÷ M', v => v.D * v.V / v.M);

    add('mgkg', 'Perfusión en mg/kg/h → mL/h',
        'Perfusiones', 'mL/h',
        [
            campo('D', 'Dosis prescrita', 'mg/kg/h', 0.1),
            peso(), cantidad(), volumen()
        ],
        'D × P × V ÷ M', v => v.D * v.P * v.V / v.M);

    add('mcgmin', 'Perfusión en mcg/min → mL/h',
        'Perfusiones', 'mL/h',
        [
            campo('D', 'Dosis prescrita', 'mcg/min', 5),
            cantidad(), volumen()
        ],
        'D × 60 × V ÷ (M × 1000)',
        v => v.D * 60 * v.V / (v.M * 1000));

    // 18–20. ANTROPOMETRÍA

    add('bmi', 'Índice de masa corporal',
        'Antropometría', 'kg/m²',
        [peso(), talla()],
        'P ÷ (H ÷ 100)²',
        v => v.P / ((v.H / 100) ** 2),
        'Resultado sin clasificación automática. La interpretación depende de edad y contexto.');

    add('bsa', 'Superficie corporal — Mosteller',
        'Antropometría', 'm²',
        [peso(), talla()],
        '√(P × H ÷ 3600)',
        v => Math.sqrt(v.P * v.H / 3600),
        'Estimación de superficie corporal. No determina por sí sola una dosis.');

    add('weightloss', 'Pérdida de peso porcentual',
        'Antropometría', '%',
        [
            campo('A', 'Peso inicial', 'kg', 70),
            campo('B', 'Peso actual', 'kg', 65)
        ],
        '(A − B) ÷ A × 100',
        v => (v.A - v.B) / v.A * 100,
        'Un porcentaje negativo indica aumento de peso. No clasifica desnutrición.');

    // 21–23. HEMODINÁMICA

    add('map', 'Presión arterial media estimada',
        'Hemodinámica', 'mmHg',
        presiones(),
        '(S + 2 × D) ÷ 3',
        v => (v.S + 2 * v.D) / 3,
        'Aproximación; puede perder precisión en ritmos o frecuencias anormales.',
        presionValida);

    add('pp', 'Presión de pulso',
        'Hemodinámica', 'mmHg',
        presiones(),
        'S − D', v => v.S - v.D,
        '', presionValida);

    add('shock', 'Índice de shock',
        'Hemodinámica', 'índice',
        [
            campo('F', 'Frecuencia cardíaca', 'lat/min', 80),
            campo('S', 'Presión sistólica', 'mmHg', 120)
        ],
        'F ÷ S', v => v.F / v.S,
        'Es una razón numérica. No confirma ni descarta shock ni sustituye la valoración clínica.');

    // 24–26. BALANCE Y DIURESIS

    add('balance', 'Balance hídrico',
        'Balance y diuresis', 'mL',
        [
            campo('E', 'Entradas totales', 'mL', 2000, { zero: true }),
            campo('S', 'Salidas totales', 'mL', 1600, { zero: true })
        ],
        'E − S', v => v.E - v.S,
        'Entradas y salidas del mismo periodo. No añade pérdidas insensibles automáticamente.');

    add('urine', 'Diuresis horaria',
        'Balance y diuresis', 'mL/h',
        [
            campo('V', 'Orina recogida', 'mL', 400, { zero: true }),
            tiempo()
        ],
        'V ÷ T', v => v.V / v.T);

    add('urinekg', 'Diuresis por peso y hora',
        'Balance y diuresis', 'mL/kg/h',
        [
            campo('V', 'Orina recogida', 'mL', 400, { zero: true }),
            peso(), tiempo()
        ],
        'V ÷ (P × T)', v => v.V / (v.P * v.T),
        'Usa el periodo real de recogida. El resultado aislado no establece un diagnóstico renal.');

    // 27–30. CÁLCULOS CLÍNICOS

    add('crcl', 'Aclaramiento de creatinina — Cockcroft–Gault',
        'Cálculos clínicos', 'mL/min',
        [
            campo('A', 'Edad adulta', 'años', 60, {
                min: 18, max: 139, integer: true
            }),
            campo('P', 'Peso elegido según protocolo', 'kg', 70),
            campo('C', 'Creatinina sérica', 'mg/dL', 1),
            campo('K', 'Coeficiente de la ecuación original', '', 1, {
                options: [[1, 'Varón: 1'], [0.85, 'Mujer: 0,85']]
            })
        ],
        '(140 − A) × P × K ÷ (72 × C)',
        v => (140 - v.A) * v.P * v.K / (72 * v.C),
        'Solo adultos con creatinina estable. El peso requiere criterio clínico, especialmente en obesidad o extremos de masa corporal. No es CKD-EPI ni está indexado a 1,73 m². No aplicar en lesión renal aguda o embarazo.');

    add('anion', 'Anión gap sin potasio',
        'Cálculos clínicos', 'mEq/L',
        [
            campo('N', 'Sodio', 'mEq/L', 140),
            campo('C', 'Cloro', 'mEq/L', 104),
            campo('B', 'Bicarbonato', 'mEq/L', 24)
        ],
        'N − (C + B)', v => v.N - v.C - v.B,
        'Sin potasio ni corrección por albúmina. Interpreta con el intervalo del laboratorio.');

    add('osm', 'Osmolalidad sérica estimada',
        'Cálculos clínicos', 'mOsm/kg',
        [
            campo('N', 'Sodio', 'mmol/L', 140),
            campo('G', 'Glucosa', 'mg/dL', 90),
            campo('B', 'Nitrógeno ureico — BUN', 'mg/dL', 14)
        ],
        '2 × N + G ÷ 18 + B ÷ 2.8',
        v => 2 * v.N + v.G / 18 + v.B / 2.8,
        'Introduce BUN, no urea total. No incluye alcohol ni otros osmoles; no sustituye la osmolalidad medida.');

    add('qtc', 'QT corregido — Bazett / Fridericia',
        'Cálculos clínicos', 'ms',
        [
            campo('Q', 'Intervalo QT medido', 'ms', 400),
            campo('R', 'Intervalo RR medido', 's', 1),
            campo('K', 'Método de corrección', '', 2, {
                options: [[2, 'Bazett'], [3, 'Fridericia']]
            })
        ],
        'Q ÷ R^(1 ÷ K)',
        v => v.Q / (v.R ** (1 / v.K)),
        'RR en segundos; QT en milisegundos. Bazett es menos fiable con frecuencias extremas. Arritmias y QRS ancho requieren valoración específica. Sin clasificación automática.');

    // 31–32. CONVERSIONES

    add('units', 'Conversor de masa', 'Conversiones',
        v => ({ 1000: 'g', 1: 'mg', 0.001: 'mcg' })[v.B],
        [
            campo('X', 'Cantidad', '', 1, { zero: true }),
            campo('A', 'Unidad de origen', '', 1, {
                options: [[1000, 'g'], [1, 'mg'], [0.001, 'mcg']]
            }),
            campo('B', 'Unidad de destino', '', 0.001, {
                options: [[1000, 'g'], [1, 'mg'], [0.001, 'mcg']]
            })
        ],
        'X × A ÷ B', v => v.X * v.A / v.B,
        'Convierte masa. No convierte unidades internacionales (UI) a mg. A y B son factores respecto a mg.');

    add('temp', 'Temperatura — °C / °F', 'Conversiones',
        v => v.K === 1 ? '°F' : '°C',
        [
            campo('X', 'Temperatura en la unidad de origen', '', 37, {
                signed: true
            }),
            campo('K', 'Conversión', '', 1, {
                options: [[1, '°C → °F'], [2, '°F → °C']]
            })
        ],
        v => v.K === 1 ? 'X × 9 ÷ 5 + 32' : '(X − 32) × 5 ÷ 9',
        v => v.K === 1 ? v.X * 9 / 5 + 32 : (v.X - 32) * 5 / 9,
        '',
        v => v.X < (v.K === 1 ? -273.15 : -459.67)
            ? { X: 'Temperatura inferior al cero absoluto.' }
            : {});

    // VALIDACIÓN Y FORMATO

    const numero = raw => {
        const s = String(raw).trim();
        return /^[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(s)
            ? Number(s.replace(',', '.'))
            : NaN;
    };

    const fmt = (n, digits = 12) =>
        new Intl.NumberFormat('es-ES', {
            useGrouping: false,
            maximumSignificantDigits: digits
        }).format(n);

    const resolver = (d, raw, units = {}) => {
        const v = {};
        const errors = {};

        for (const f of d.fields) {
            let n = numero(raw[f.key] ?? '');

            if (f.options) {
                if (!f.options.some(([value]) => value === n)) {
                    errors[f.key] = 'Selecciona una opción.';
                }
            } else if (!Number.isFinite(n)) {
                errors[f.key] =
                    'Introduce un número con coma o punto decimal, sin separadores de miles.';
            } else if (!f.signed && (f.zero ? n < 0 : n <= 0)) {
                errors[f.key] = f.zero
                    ? 'Introduce cero o un valor positivo.'
                    : 'Debe ser mayor que cero.';
            } else if (f.integer && !Number.isInteger(n)) {
                errors[f.key] = 'Introduce un número entero.';
            } else if (
                (f.min !== undefined && n < f.min) ||
                (f.max !== undefined && n > f.max)
            ) {
                errors[f.key] = `Valor permitido: ${f.min}–${f.max}.`;
            }

            if (f.units) {
                const unit = f.units.find(
                    ([name]) => name === units[f.key]
                );

                if (!unit) {
                    errors[f.key] = 'Selecciona una unidad válida.';
                } else {
                    n *= unit[1];

                    if (!Number.isFinite(n) || n <= 0) {
                        errors[f.key] =
                            'Valor fuera de los límites de conversión.';
                    }
                }
            }

            v[f.key] = n;
        }

        if (Object.keys(errors).length) return { errors };

        Object.assign(errors, d.check(v));

        if (Object.keys(errors).length) return { errors };

        const value = d.calc(v);

        if (!Number.isFinite(value)) {
            return {
                errors: {
                    _all: 'El resultado excede los límites de cálculo. Revisa los datos.'
                }
            };
        }

        return {
            errors,
            v,
            value,
            unit: typeof d.unit === 'function' ? d.unit(v) : d.unit,
            formula: typeof d.formula === 'function'
                ? d.formula(v)
                : d.formula
        };
    };

    // LISTADO Y BUSCADOR

    function menu() {
        return `
            <div class="card">
                <label for="calcSearch">Buscar calculadora</label>
                <input class="field" id="calcSearch" type="search"
                    placeholder="Dosis, diuresis, QT…">
                <p class="muted" id="calcCount" role="status"></p>
            </div>
            <div id="calcList"></div>
        `;
    }

    function bindMenu() {
        const normalize = s => s.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();

        const paint = () => {
            const q = normalize($('#calcSearch').value.trim());
            const found = lista.filter(d =>
                normalize(`${d.name} ${d.group}`).includes(q)
            );

            $('#calcCount').textContent =
                `${found.length} de ${lista.length} calculadoras`;

            $('#calcList').innerHTML =
                [...new Set(found.map(d => d.group))]
                    .map(group => `
                        <h3 class="section-title">${esc(group)}</h3>
                        <div class="list">
                            ${found.filter(d => d.group === group)
                                .map(d => UIHelpers.listRow({
                                    title: d.name,
                                    sub: typeof d.unit === 'string'
                                        ? d.unit
                                        : 'Unidades seleccionables',
                                    icon: '÷',
                                    action: `data-action="openSlide"
                                        data-view="calcForm"
                                        data-id="${d.id}"`
                                })).join('')}
                        </div>
                    `).join('') ||
                UIHelpers.noData(
                    'Sin coincidencias', 'Prueba otro término.'
                );
        };

        $('#calcSearch').oninput = paint;
        paint();
    }

    // FORMULARIO

    function form(id) {
        const d = lista.find(x => x.id === id);

        if (!d) {
            return UIHelpers.noData('Calculadora no disponible');
        }

        return `
            <button type="button" class="btn mb-4"
                data-action="openSlide" data-view="calculators">
                ← Calculadoras
            </button>

            <div class="card">
                <p class="muted">${esc(d.group)}</p>
                <h3>${esc(d.name)}</h3>
                <p class="form-help">
                    Admite coma o punto decimal, sin separadores de miles.
                    Comprueba las unidades.
                </p>

                <form id="calcExec" novalidate data-type="${d.id}">
                    <div class="nf-calc-grid">
                        ${d.fields.map(f => `
                            <div>
                                <label for="nf-${f.key}">
                                    ${f.key} · ${esc(f.label)}
                                    ${f.unit && !f.units
                                        ? `(${esc(f.unit)})` : ''}
                                </label>

                                ${f.options ? `
                                    <select class="field"
                                        id="nf-${f.key}" name="${f.key}"
                                        aria-describedby="nf-msg-${f.key}"
                                        required>
                                        <option value="">Selecciona…</option>
                                        ${f.options.map(([v, t]) =>
                                            `<option value="${v}">${esc(t)}</option>`
                                        ).join('')}
                                    </select>
                                ` : `
                                    <input class="field"
                                        id="nf-${f.key}" name="${f.key}"
                                        type="text" inputmode="decimal"
                                        autocomplete="off"
                                        aria-describedby="nf-msg-${f.key}"
                                        required>
                                `}

                                ${f.units ? `
                                    <label class="form-help"
                                        for="nf-unit-${f.key}">
                                        Unidad de ${esc(f.label.toLowerCase())}
                                    </label>
                                    <select class="field"
                                        id="nf-unit-${f.key}"
                                        name="unit-${f.key}">
                                        ${f.units.map(([name]) =>
                                            `<option>${esc(name)}</option>`
                                        ).join('')}
                                    </select>
                                ` : ''}

                                <span class="nf-calc-error"
                                    id="nf-msg-${f.key}"></span>
                            </div>
                        `).join('')}
                    </div>

                    <p class="notice info">
                        ${esc(d.note ||
                            'Revisa datos, unidades y protocolo. El resultado matemático no valida una pauta clínica.'
                        )}
                    </p>

                    <div class="nf-calc-actions">
                        <button type="submit" class="btn primary">
                            Calcular
                        </button>
                        <button type="reset" class="btn">Limpiar</button>
                        <button type="button" class="btn" id="calcExample">
                            Cargar ejemplo
                        </button>
                    </div>

                    <p id="calcFeedback" role="status"
                        aria-live="polite"></p>
                </form>
            </div>

            <section id="calcResContainer"
                class="card nf-calc-result hidden"
                aria-live="polite" aria-atomic="true">
                <p class="muted">Resultado matemático</p>
                <div id="calcRes" class="nf-calc-number"></div>
                <p id="calcRounding"></p>

                <h4>Fórmula y sustitución</h4>
                <p id="calcFormula"></p>
                <p id="calcSteps"></p>

                <details>
                    <summary>Datos utilizados y unidades de cálculo</summary>
                    <ul id="calcInputs"></ul>
                </details>

                <button type="button" class="btn block mt-4"
                    id="copyCalcBtn">
                    Copiar cálculo completo
                </button>

                <p class="form-help">
                    Uso académico y de apoyo. Verifica el resultado
                    con el protocolo aplicable antes de utilizarlo.
                </p>
            </section>
        `;
    }

    // EVENTOS Y RESULTADOS

    function bindForm() {
        const f = $('#calcExec');
        if (!f) return;

        const d = lista.find(x => x.id === f.dataset.type);
        let copyText = '';
        let example = false;

        const clear = () => {
            $('#calcResContainer').classList.add('hidden');
            copyText = '';

            f.querySelectorAll('[aria-invalid]').forEach(el =>
                el.removeAttribute('aria-invalid')
            );

            f.querySelectorAll('.nf-calc-error').forEach(el => {
                el.textContent = '';
            });
        };

        const changed = () => {
            clear();
            $('#calcFeedback').textContent = example
                ? 'Ejemplo de práctica modificado. Pulsa Calcular.'
                : 'Datos modificados. Pulsa Calcular para actualizar el resultado.';
        };

        f.addEventListener('input', changed);
        f.addEventListener('change', changed);

        f.onreset = () => {
            clear();
            example = false;
            $('#calcFeedback').textContent = '';
        };

        $('#calcExample').onclick = () => {
            f.reset();
            example = true;

            d.fields.forEach(field => {
                f.elements.namedItem(field.key).value = field.example;
            });

            $('#calcFeedback').textContent =
                'Ejemplo ficticio de práctica: no es una pauta recomendada. Pulsa Calcular.';
        };

        f.onsubmit = e => {
            e.preventDefault();
            clear();

            const raw = Object.fromEntries(new FormData(f));
            const units = Object.fromEntries(
                d.fields.filter(x => x.units)
                    .map(x => [x.key, raw[`unit-${x.key}`]])
            );

            const result = resolver(d, raw, units);

            if (Object.keys(result.errors).length) {
                for (const [key, msg] of Object.entries(result.errors)) {
                    if (key === '_all') continue;

                    f.elements.namedItem(key)
                        .setAttribute('aria-invalid', 'true');

                    $(`#nf-msg-${key}`).textContent = msg;
                }

                $('#calcFeedback').textContent =
                    result.errors._all || 'Revisa los campos señalados.';

                f.querySelector('[aria-invalid="true"]')?.focus();
                return;
            }

            const { v, value, unit, formula } = result;

            const display = d.id === 'drops'
                ? (value < 1 ? '<1' : String(Math.round(value)))
                : fmt(value, 6);

            $('#calcRes').textContent = `${display} ${unit}`;

            const rounding = d.id === 'drops'
                ? `Antes del redondeo: ${fmt(value)} gotas/min. Si es menor que 1, se muestra <1; en otro caso se redondea al entero más próximo. Revisa la viabilidad del ritmo.`
                : 'Hasta 6 cifras significativas en el resultado y 12 en el desglose; sin redondeos intermedios. Ajusta la precisión al dispositivo y al protocolo.';

            $('#calcRounding').textContent = rounding;
            $('#calcFormula').textContent = formula;

            const substitution = formula.replace(
                /\b[A-Z]\b/g,
                key => v[key] !== undefined
                    ? `(${fmt(v[key])})`
                    : key
            );

            $('#calcSteps').textContent =
                `${substitution} ≈ ${fmt(value)} ${unit}`;

            const inputs = d.fields.map(field => {
                const option = field.options?.find(
                    ([n]) => n === v[field.key]
                );

                return `${field.key} · ${field.label}: ${
                    option
                        ? option[1]
                        : `${fmt(v[field.key])} ${field.unit}`
                }`;
            });

            $('#calcInputs').innerHTML = inputs
                .map(s => `<li>${esc(s)}</li>`).join('');

            $('#calcFeedback').textContent = example
                ? 'Cálculo de ejemplo ficticio.'
                : 'Cálculo actualizado.';

            $('#calcResContainer').classList.remove('hidden');

            copyText = [
                `${d.name}${example ? ' — EJEMPLO FICTICIO' : ''}`,
                ...inputs,
                `Fórmula: ${formula}`,
                `${substitution} ≈ ${fmt(value)} ${unit}`,
                `Resultado mostrado: ${display} ${unit}`,
                rounding,
                d.note,
                'Uso académico: verificar con el protocolo aplicable.'
            ].filter(Boolean).join('\n');
        };

        $('#copyCalcBtn').onclick = async () => {
            if (!copyText) return;

            try {
                await navigator.clipboard.writeText(copyText);
                UI.toast('Cálculo copiado');
            } catch {
                UI.toast(
                    'No se pudo copiar. Puedes seleccionar el resultado manualmente.',
                    'error'
                );
            }
        };
    }

    return { menu, bindMenu, form, bindForm };
})();

        async function renderView() {
            if (!state.unlocked) return;
            const container = $('#app');
            container.innerHTML = '<div class="empty-state" role="status">Cargando...</div>';
            
            try {
                if (state.route === 'today') await renderToday(container);
                else if (state.route === 'university') await renderUniversity(container);
                else if (state.route === 'practicum') await renderPracticum(container);
                else if (state.route === 'batea') await renderBateaFull(container);
                else if (state.route === 'study') await renderStudy(container);
                else if (state.route === 'consultation') renderConsultation(container);
            } catch (e) {
                container.innerHTML = UIHelpers.notice(`Error: ${esc(e.message)}`, false, true);
                console.error(e);
            }
        }

        async function renderToday(container) {
            setTitle('Hoy', state.settings.profileName || 'NurseFlow');
            // Añadimos 'exceptions' y 'NurseDB.all('exceptions')' al array de descarga
            const [cases, tasks, days, schedule, exceptions] = await Promise.all([NurseDB.all('cases'), NurseDB.all('tasks'), NurseDB.all('days'), NurseDB.all('schedule'), NurseDB.all('exceptions')]);
            const today = getLocalISOToday();
            
            const pending = tasks.filter(x => !x.done && (!x.due || x.due >= today)).sort((a,b) => (a.due||'9999').localeCompare(b.due||'9999'));
            const dow = new Date().getDay();
            const todayEx = exceptions.filter(x => x.date === today);
            const isFestivoToday = todayEx.some(x => x.type === 'Festivo');
            const cancellationsToday = todayEx.filter(x => x.type === 'Cancelación').map(x => x.classId);
            
            // Si es festivo, no hay clases. Si no es festivo, filtramos las que el profesor haya suspendido hoy.
            const todayClasses = isFestivoToday ? [] : schedule.filter(x => Number(x.day) === dow && !cancellationsToday.includes(x.id)).sort((a,b) => a.start.localeCompare(b.start));
            
            const isPracActive = state.settings.hasPracticum && (!state.settings.periodStart || today >= state.settings.periodStart) && (!state.settings.periodEnd || today <= state.settings.periodEnd);
            const todayCases = cases.filter(x => x.date === today);
            const todayDay = days.find(x => x.date === today);

            let html = '';
            if (state.settings.hasPracticum) {
                if(!isPracActive) html += UIHelpers.notice(today < state.settings.periodStart ? `Prácticas previstas: ${dateFmt(state.settings.periodStart)}` : 'Periodo de prácticas finalizado. Puedes consultar tu portfolio.',true);
                let progress = '';
                if(state.settings.periodStart && state.settings.periodEnd) {
                    const start = new Date(state.settings.periodStart), end = new Date(state.settings.periodEnd);
                    const p = clamp(Math.round((new Date() - start) / (end - start) * 100), 0, 100);
                    progress = `<div class="height-4px bg-rgba-255-255-255-0-3 border-radius-2px mt-2 overflow-hidden"><div class="progress-fill" style="width:${p}%;"></div></div>`;
                }
                html += `
                    <div class="card hero">
                        <p class="muted small">${esc(state.settings.hospital || 'Centro asignado')} ${state.settings.service ? '· '+esc(state.settings.service) : ''}</p>
                        <h2 class="text-page m-4px-0-8px">${esc(state.settings.practicum || 'Prácticum')}</h2>
                        <p class="small">${state.settings.periodStart ? dateFmt(state.settings.periodStart) : ''} → ${state.settings.periodEnd ? dateFmt(state.settings.periodEnd) : ''}</p>
                        ${progress}
                        <div class="display-flex gap-2 mt-4">
                            <button class="btn hero-btn" data-action="goRoute" data-val="practicum">Ver Prácticas</button>
                            ${isPracActive && !state.readOnlyMode ? `<button class="btn bg-rgba-255-255-255-0-2 text-white" data-action="openSlide" data-view="dayLog">Registrar Día</button>` : ''}
                        </div>
                    </div>`;
            }

            html += UIHelpers.section('Universidad hoy');
            html += `<div class="list">${todayClasses.length ? todayClasses.map(x => UIHelpers.listRow({title:x.title, sub:`${x.start} - ${x.end} ${x.room ? '· '+x.room : ''}`,icon:x.start.slice(0,2)})).join('') : UIHelpers.noData('Sin clases hoy', 'Consulta tu calendario para preparar la próxima jornada.')}</div>`;
            let actionsHtml = UIHelpers.section('Siguiente acción');
            actionsHtml += `<div class="grid-2">
                ${isPracActive && !state.readOnlyMode ? '<button type="button" class="quick-action" data-action="openSlide" data-view="caseForm"><span class="ico">＋</span><strong>Nuevo caso</strong><small>Registro clínico</small></button>' : '<button type="button" class="quick-action" data-action="goRoute" data-val="university"><span class="ico">▤</span><strong>Universidad</strong><small>Calendario y pendientes</small></button>'}
                <button type="button" class="quick-action" data-action="goRoute" data-val="batea"><span class="ico">▤</span><strong>La Batea</strong><small>Técnicas y material</small></button>
                <button type="button" class="quick-action" data-action="goRoute" data-val="study"><span class="ico">◫</span><strong>Estudio</strong><small>Repaso del día</small></button>
                <button type="button" class="quick-action" data-action="goRoute" data-val="consultation"><span class="ico">Rx</span><strong>Consulta</strong><small>Medicamentos y herramientas</small></button>
            </div>`;
            if (pending.length) {
                html += UIHelpers.section('Pendientes próximos', `<button class="btn height-32px p-0-12px" data-action="openSlide" data-view="tasks">Todos</button>`);
                html += `<div class="list">` + pending.slice(0,3).map(t => UIHelpers.listRow({
                    title: t.title, sub: `${t.due ? dateFmt(t.due) : 'Sin fecha'} · ${t.category||'General'}`, icon: '!'
                })).join('') + `</div>`;
            }

            html += actionsHtml + UIHelpers.clinicalWarning();
            container.innerHTML = html;
        }

        async function renderUniversity(container) {
            setTitle('Universidad', state.settings.course);
            const [schedule, tasks, exceptions] = await Promise.all([NurseDB.all('schedule'), NurseDB.all('tasks'), NurseDB.all('exceptions')]);

            const baseDate = new Date(state.calendarViewDate + 'T12:00:00');
            let startDate = new Date(baseDate);
            let daysToRender = 7;

            if (state.calendarMode === 'week') {
                const delta = (baseDate.getDay() + 6) % 7;
                startDate.setDate(baseDate.getDate() - delta);
            } else {
                startDate.setDate(1); 
                const delta = (startDate.getDay() + 6) % 7;
                startDate.setDate(startDate.getDate() - delta); 
                daysToRender = 42; // 6 semanas
            }

            const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
            const viewMonth = monthNames[baseDate.getMonth()] + ' ' + baseDate.getFullYear();

            let html = `
                <div class="card">
                    <div class="calendar-header">
                        <strong class="text-section text-transform-capitalize">${viewMonth}</strong>
                        <div class="calendar-nav">
                            <button class="btn icon-only height-32px width-32px" data-action="calPrev">‹</button>
                            <button class="btn height-32px p-0-12px" data-action="calToggle">${state.calendarMode === 'week' ? 'Ver Mes' : 'Ver Sem'}</button>
                            <button class="btn icon-only height-32px width-32px" data-action="calNext">›</button>
                        </div>
                    </div>
                    <div class="calendar-scroll" tabindex="0" role="region" aria-label="Calendario, desplázate horizontalmente para ver todos los días"><div class="calendar-grid">
                        ${['L','M','X','J','V','S','D'].map(d => `<div class="calendar-day-header">${d}</div>`).join('')}
            `;

            for (let i = 0; i < daysToRender; i++) {
                const d = new Date(startDate);
                d.setDate(startDate.getDate() + i);
                const isoDate = d.toISOString().slice(0, 10);
                
                const isToday = isoDate === getLocalISOToday();
                const isSelected = isoDate === state.calendarSelectedDate;
                const isCurrentMonth = d.getMonth() === baseDate.getMonth();
                
                const dbDayIndex = d.getDay(); // 0=Domingo
                const dayEx = exceptions.filter(x => x.date === isoDate);
                const isFestivo = dayEx.some(x => x.type === 'Festivo');
                const cancellations = dayEx.filter(x => x.type === 'Cancelación').map(x => x.classId);
                
                // Si es festivo no pintamos punto de clase. Tampoco si la clase ha sido cancelada individualmente.
                const activeClasses = schedule.filter(x => +x.day === dbDayIndex && !cancellations.includes(x.id));
                const hasClass = !isFestivo && activeClasses.length > 0;
                
                const hasTask = tasks.some(x => x.due === isoDate && !x.done);
                // No contamos las cancelaciones ni festivos anulados como puntos rojos
                const hasEx = dayEx.some(x => x.type !== 'Cancelación' && x.type !== 'Festivo Anulado');

                html += `
                    <button type="button" class="calendar-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${!isCurrentMonth ? 'dimmed' : ''}" data-action="calSelect" data-val="${isoDate}">
                        <b>${d.getDate()}</b>
                        <div class="dots">
                            ${hasClass ? '<div class="dot class" title="Clases"></div>' : ''}
                            ${hasTask ? '<div class="dot task" title="Tareas"></div>' : ''}
                            ${hasEx ? '<div class="dot ex" title="Excepciones"></div>' : ''}
                        </div>
                    </button>`;
            }
            html += `</div></div></div>`; // Cierre de grid, scroll y card

            // Renderizar la agenda interactiva del día seleccionado
            const selDateObj = new Date(state.calendarSelectedDate + 'T12:00:00');
            const dayClasses = schedule.filter(x => +x.day === selDateObj.getDay()).sort((a,b) => a.start.localeCompare(b.start));
            const dayTasks = tasks.filter(x => x.due === state.calendarSelectedDate);
            const dayEx = exceptions.filter(x => x.date === state.calendarSelectedDate);

            const isFestivo = dayEx.some(x => x.type === 'Festivo');
            const classCancellations = dayEx.filter(x => x.type === 'Cancelación');

            const displayDate = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(selDateObj);
            
            html += `
                <div class="display-flex justify-space-between items-center mt-6 mb-4">
                    <h3 class="text-transform-capitalize m-0 text-section">${displayDate}</h3>
                    <div class="display-flex gap-2">
                        <button class="btn icon-only height-32px width-32px bg-primary text-white" data-action="openSlide" data-view="classForm" title="Añadir Clase">
                            <svg aria-hidden="true" focusable="false" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path></svg>
                        </button>
                        <button class="btn icon-only height-32px width-32px bg-warning text-white" data-action="openSlide" data-view="tasks" title="Añadir Tarea">
                            <svg aria-hidden="true" focusable="false" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
                        </button>
                        <button class="btn icon-only height-32px width-32px bg-danger text-white" data-action="openSlide" data-view="exceptions" title="Añadir Festivo o Excepción">
                            <svg aria-hidden="true" focusable="false" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        </button>
                    </div>
                </div>
            `;

            // Mostramos los eventos especiales (Festivos, exámenes y cancelaciones manuales)
            if(dayEx.length) {
                html += `<div class="list mb-4">${dayEx.map(x => {
                    const isCanceled = x.type === 'Cancelación' || x.type === 'Festivo Anulado';
                    return `
                    <div class="list-row">
                        <div class="avatar ${isCanceled ? 'is-canceled' : 'is-critical'}">!</div>
                        <div class="grow">
                            <strong class="${isCanceled ? 'is-done' : ''}">${esc(x.title)}</strong>
                            <div class="sub">${esc(x.type)}</div>
                        </div>
                        <button class="btn icon-only" data-action="deleteEx" data-id="${x.id}" title="${isCanceled ? 'Restaurar' : 'Eliminar'}" data-tone="${isCanceled ? 'success' : 'danger'}">
                            ${isCanceled ? '↺' : '×'}
                        </button>
                    </div>
                `}).join('')}</div>`;
            }

            if (isFestivo) {
                html += UIHelpers.notice('Hoy es festivo. Las clases de este día quedan suspendidas.', true);
            } else if (dayClasses.length || dayTasks.length) {
                html += `<div class="list">`;
                dayClasses.forEach(x => {
                    const isCancelled = classCancellations.find(c => c.classId === x.id);
                    // Si no está cancelada, la pintamos con el botón de "Suspender hoy"
                    if (!isCancelled) {
                        html += `
                            <div class="list-row">
                                <div class="avatar">${x.start.slice(0,2)}</div>
                                <div class="grow clickable" data-action="openSlide" data-view="classForm" data-id="${x.id}">
                                    <strong>${esc(x.title)}</strong>
                                    <div class="sub">${x.start} - ${x.end} ${x.room?'· '+esc(x.room):''}</div>
                                </div>
                                <button class="btn text-caption p-4px-8px height-auto min-height-24px bg-danger-bg text-danger" data-action="cancelClassDate" data-id="${x.id}" data-title="${esc(x.title)}" title="Suspender esta clase solo por hoy">Suspender hoy</button>
                            </div>
                        `;
                    }
                });
                dayTasks.forEach(x => {
                    html += `<div class="list-row"><label class="check-row m-0 flex-1"><input type="checkbox" data-task="${x.id}" ${x.done?'checked':''}><span><strong class="${x.done ? 'is-done' : ''}">${esc(x.title)}</strong><div class="sub">${esc(x.category)}</div></span></label></div>`;
                });
                html += `</div>`;
            } else if (!dayEx.length) {
                html += UIHelpers.noData('Agenda despejada', 'No tienes clases ni entregas para este día.', '<button class="btn primary" data-action="openSlide" data-view="classForm">Añadir clase</button>');
            }

            container.innerHTML = html;
        }

        async function renderPracticum(container) {
            setTitle('Prácticas', 'Portfolio Clínico');
            if(!state.settings.hasPracticum) {
                container.innerHTML = `
                    <div class="empty-state pt-40px">
                        <div class="text-display mb-4">🏥</div>
                        <strong>Prácticum no configurado</strong>
                        <span>Activa y configura tu periodo de prácticas.</span><br><br>
                        <button class="btn primary" data-action="openSlide" data-view="settingsPracticum">Configurar Prácticas</button>
                    </div>`;
                return;
            }

            const [cases, days] = await Promise.all([NurseDB.all('cases'), NurseDB.all('days')]);
            const isPracActive = practicumActive();
            const filterArea = state.settings.caseFilterArea || '';
            const filteredCases = filterArea ? cases.filter(c => c.area === filterArea) : cases;
            const orderedCases = [...filteredCases].sort((a,b) => b.date.localeCompare(a.date));
            const procCount = cases.reduce((n,c) => n + (c.procedures?.length||0), 0);
            const areas = [...new Set(cases.map(c => c.area).filter(Boolean))];

            container.innerHTML = `
                <div class="card hero">
                    <p class="muted small">${esc(state.settings.hospital)} ${state.settings.service ? '· '+esc(state.settings.service) : ''}</p>
                    <h2 class="text-page m-4px-0-8px">${esc(state.settings.practicum)}</h2>
                    <p class="text-small">${state.settings.periodStart ? dateFmt(state.settings.periodStart) : ''} — ${state.settings.periodEnd ? dateFmt(state.settings.periodEnd) : ''}</p>
                    <div class="display-flex gap-2 mt-4">
                        <button class="btn hero-btn" data-action="openSlide" data-view="settingsPracticum">Editar Info</button>
                        ${isPracActive && !state.readOnlyMode ? '<button class="btn hero-btn" data-action="openSlide" data-view="caseForm">Nuevo caso</button>' : ''}
                    </div>
                </div>

                ${UIHelpers.section(isPracActive ? 'Turno actual' : 'Periodo de prácticas')}
                ${!isPracActive ? UIHelpers.notice(state.settings.periodStart && getLocalISOToday() < state.settings.periodStart ? `Inicio previsto: ${dateFmt(state.settings.periodStart)}` : 'Prácticas finalizadas. Consulta tus registros.',true) : ''}
                <div class="metric-row">
                    <div class="metric"><b>${cases.length}</b><span>casos</span></div>
                    <div class="metric"><b>${procCount}</b><span>técnicas</span></div>
                    <div class="metric"><b>${days.filter(d=>d.attendanceOfficial).length}</b><span>días</span></div>
                    <div class="metric"><b>${new Set(cases.map(c=>c.diagnosis).filter(Boolean)).size}</b><span>patologías</span></div>
                </div>

                ${UIHelpers.section('Portfolio y memoria')}
                <div class="grid-2 mt-4">
                    ${isPracActive && !state.readOnlyMode ? '<button type="button" class="quick-action" data-action="openSlide" data-view="dayLog"><span class="ico">✓</span><strong>Registrar día</strong><small>Asistencia y turno</small></button>' : ''}
                    <button type="button" class="quick-action" data-action="openSlide" data-view="portfolio">
                        <div class="ico">▤</div><strong>Portfolio</strong><small>Conteo de técnicas</small>
                    </button>
                    <button type="button" class="quick-action" data-action="openSlide" data-view="tutoria">
                        <div class="ico">◎</div><strong>Tutoría</strong><small>Progreso competencial</small>
                    </button>
                    <button type="button" class="quick-action" data-action="openSlide" data-view="memoria">
                        <div class="ico">★</div><strong>Memoria</strong><small>Casos destacados</small>
                    </button>
                </div>

                ${UIHelpers.section('Casos Clínicos', `
                    <div class="display-flex gap-1 items-center">
                        <select class="field m-0 min-height-32px text-small" id="areaFilterSelect">
                            <option value="">Todas las áreas</option>
                            ${areas.map(a => `<option value="${esc(a)}" ${filterArea===a?'selected':''}>${esc(a)}</option>`).join('')}
                        </select>
                    </div>
                `)}
                <div class="list">
                    ${orderedCases.map(c => UIHelpers.listRow({
                        title: c.diagnosis || 'Caso sin diagnóstico', sub: `${dateFmt(c.date)} · ${c.area ? esc(c.area)+' · ' : ''}${(c.procedures||[]).length} procedimientos`,
                        icon: new Date(c.date).getDate(), badge: c.starred ? '★ Memoria' : '', action: `data-action="openSlide" data-view="caseDetail" data-id="${c.id}"`
                    })).join('') || UIHelpers.noData('Sin casos en esta área', 'Registra casos anonimizados.', isPracActive ? '<button class="btn primary" data-action="openSlide" data-view="caseForm">Nuevo caso</button>' : '')}
                </div>
                ${UIHelpers.clinicalWarning()}
            `;

            $('#areaFilterSelect')?.addEventListener('change', e => {
                state.settings.caseFilterArea = e.target.value;
                saveSettings();
                renderView();
            });
        }

        async function renderBateaFull(container) {
            setTitle('La Batea', 'Guía de Técnicas');
            const rows = (await NurseDB.all('procedures')).sort((a,b)=>(b.favorite-a.favorite)||a.name.localeCompare(b.name));
            container.innerHTML = `
                <div class="search-sticky"><label for="bateaFullQ">Buscar técnica o material</label><input class="field" id="bateaFullQ" placeholder="Filtrar técnica o material..."></div>
                <div class="list" id="bateaFullList">${[true,false].map(fav => { const group=rows.filter(p=>!!p.favorite===fav); return group.length ? `<section class="batea-group"><h2 class="section-title">${fav?'Favoritas':'Todas las técnicas'}</h2>${group.map(p=>UIHelpers.listRow({title:p.name,sub:`${p.materials.length} materiales · ${p.notes?.length||0} notas`,icon:p.favorite?'★':'+',action:`data-action="openSlide" data-view="procDetail" data-id="${p.id}"`})).join('')}</section>`:''; }).join('')}</div>
                ${UIHelpers.clinicalWarning()}
            `;
            $('#bateaFullQ').oninput = e => {
                const q = e.target.value.toLowerCase();
                $('#bateaFullList').querySelectorAll('.list-row').forEach(c => c.classList.toggle('hidden', !c.textContent.toLowerCase().includes(q)));
                $('#bateaFullList').querySelectorAll('section').forEach(g=>g.classList.toggle('hidden', !g.querySelector('.list-row:not(.hidden)')));
            };
        }

        async function renderStudy(container) {
            setTitle('Estudio', 'Repaso Inteligente');
            const [cards, quiz] = await Promise.all([NurseDB.all('flashcards'), NurseDB.all('quiz')]);
            const due = cards.filter(c => !c.due || c.due <= getLocalISOToday());

            container.innerHTML = `
                <div class="card hero">
                    <p class="muted small">Tu repaso diario</p>
                    <h2 class="text-page m-4px-0-8px">${due.length} Flashcards</h2>
                    <p class="text-small">Sistema de repetición espaciada</p>
                    <div class="display-flex gap-2 mt-4">
                        ${due.length ? '<button class="btn hero-btn" data-action="openSlide" data-view="flashReview">Comenzar repaso</button>' : cards.length ? '<p role="status">Repaso completado por hoy</p>' : state.readOnlyMode ? '<p>Aún no hay tarjetas</p>' : '<button class="btn hero-btn" data-action="openSlide" data-view="flashcards">Crear primera tarjeta</button>'}
                    </div>
                </div>
                <div class="grid-2">
                    <button type="button" class="quick-action" data-action="openSlide" data-view="flashcards">
                        <div class="ico">◫</div><strong>Gestor</strong><small>${cards.length} tarjetas en total</small>
                    </button>
                    <button type="button" class="quick-action" data-action="openSlide" data-view="quiz">
                        <div class="ico">?</div><strong>Test Pre-EIR</strong><small>${quiz.length} preguntas</small>
                    </button>
                    <button type="button" class="quick-action" data-action="openSlide" data-view="practiceReview">
                        <div class="ico">↺</div><strong>De prácticas</strong><small>Crear tarjetas de casos</small>
                    </button>
                    <button type="button" class="quick-action" data-action="openSlide" data-view="studyStats">
                        <div class="ico">↗</div><strong>Progreso</strong><small>Estadísticas</small>
                    </button>
                </div>
            `;
        }

        async function renderSlideOverContent(view, data) {
            const content = $('#slideOverContent');
            const renderId = ++UI.slideRenderId;
            let html = '';

            try {
                if (view === 'classForm') {
                    const row = data ? await NurseDB.get('schedule', data) : null;
                    const isUCV = /ucv|cat[óo]lica de valencia/i.test(state.settings.university);
                    
                    let options = '';
                    let isCustom = false;
                    
                    if (isUCV) {
                        for (const [cNum, subs] of Object.entries(NURSE_DATA.ucv.subjects)) {
                            // Excluir practicum del selector de clases normales
                            const classSubs = subs.filter(s => !s[1].toLowerCase().includes('practicum'));
                            if (classSubs.length > 0) {
                                options += `<optgroup label="${cNum}º Curso">`;
                                classSubs.forEach(s => {
                                    options += `<option value="${esc(s[1])}" ${row?.title===s[1]?'selected':''}>${esc(s[1])}</option>`;
                                });
                                options += `</optgroup>`;
                            }
                        }
                        isCustom = row && !Object.values(NURSE_DATA.ucv.subjects).flat().filter(s => !s[1].toLowerCase().includes('practicum')).some(s => s[1] === row.title);
                    } else {
                        const subjects = NURSE_DATA.ucv.subjects[String(state.settings.courseNumber)] || [];
                        const classSubs = subjects.filter(s => !s[1].toLowerCase().includes('practicum'));
                        options = classSubs.map(s => `<option value="${esc(s[1])}" ${row?.title===s[1]?'selected':''}>${esc(s[1])}</option>`).join('');
                        isCustom = row && !classSubs.some(s => s[1] === row.title);
                    }

                    html = `
                        <form id="classForm" class="card">
                            <label>Asignatura / Actividad</label>
                            <select class="field" id="subjectSelect"><option value="">Selecciona...</option>${options}<option value="__custom" ${isCustom?'selected':''}>Otra actividad...</option></select>
                            <input class="field ${isCustom?'':'hidden'} mt-2" id="customSubject" placeholder="Nombre de la actividad" value="${isCustom?esc(row?.title||''):''}">
                            
                            <div class="form-row mt-4">
                                <div class="form-field"><label>Día</label><select class="field" name="day">${['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'].map((x,i)=> { const targetDay = row ? row.day : new Date(state.calendarSelectedDate + 'T12:00:00').getDay(); return `<option value="${i}" ${targetDay==i?'selected':''}>${x}</option>`; }).join('')}</select></div>
                                <div class="form-field"><label>Aula</label><input class="field" name="room" placeholder="Ej. B-04" value="${esc(row?.room||'')}"></div>
                            </div>
                            <div class="form-row">
                                <div class="form-field"><label>Hora Inicio</label><input class="field" type="time" name="start" required value="${esc(row?.start||'09:00')}"></div>
                                <div class="form-field"><label>Hora Fin</label><input class="field" type="time" name="end" required value="${esc(row?.end||'11:00')}"></div>
                            </div>
                            
                            <div class="display-flex gap-2 mt-6">
                                ${row ? `<button type="button" class="btn danger flex-1" data-action="deleteClass" data-id="${row.id}">Borrar</button>` : ''}
                                <button class="btn primary flex-2">Guardar Clase</button>
                            </div>
                        </form>`;
                }
                if(view === 'exceptions') {
                // Guardado manual
                $('#exceptionForm').onsubmit = async e => { 
                    e.preventDefault(); 
                    const f = new FormData(e.target); 
                    await NurseDB.put('exceptions', {id: uid(), date: f.get('date'), type: f.get('type'), title: f.get('title').trim()}); 
                    state.slideOverOpen = false; 
                    renderView(); 
                    UI.toast('Excepción guardada'); 
                };

                // Sincronización Automática con nuevo Proxy
                $('#syncFestivosBtn').onclick = async () => {
                    const btn = $('#syncFestivosBtn');
                    btn.disabled = true;
                    btn.innerHTML = 'Descargando calendario... ⏳';
                    
                    try {
                        const url = 'https://calendariosnacionales.com/es/2026/festivos/val/index.ics';
                        // Nuevo proxy CORS más estable
                        const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`;
                        
                        const response = await fetch(proxyUrl);
                        if (!response.ok) throw new Error('No se pudo acceder al servidor de calendarios');
                        
                        const text = await response.text();
                        const lines = text.split(/\r?\n/);
                        let inEvent = false, currentEvent = {}, events = [];
                        
                        // Procesador del archivo .ics
                        for (const line of lines) {
                            if (line.startsWith('BEGIN:VEVENT')) { 
                                inEvent = true; currentEvent = {}; 
                            }
                            else if (line.startsWith('END:VEVENT')) { 
                                inEvent = false; 
                                if (currentEvent.date && currentEvent.title) events.push(currentEvent); 
                            }
                            else if (inEvent) {
                                if (line.startsWith('DTSTART')) {
                                    const parts = line.split(':');
                                    if (parts.length > 1) {
                                        const dateStr = parts[1].trim().substring(0, 8);
                                        if (dateStr.length === 8) {
                                            currentEvent.date = `${dateStr.substring(0,4)}-${dateStr.substring(4,6)}-${dateStr.substring(6,8)}`;
                                        }
                                    }
                                } 
                                else if (line.startsWith('SUMMARY')) {
                                    const parts = line.split(':');
                                    if (parts.length > 1) currentEvent.title = parts.slice(1).join(':').trim();
                                }
                            }
                        }
                        
                        if(events.length === 0) throw new Error('El archivo del calendario estaba vacío.');

                        const existing = await NurseDB.all('exceptions');
                        const existingDates = new Set(existing.map(e => e.date));
                        let addedCount = 0;

                        for (const ev of events) {
                            if (!existingDates.has(ev.date)) {
                                await NurseDB.put('exceptions', { 
                                    id: uid(), 
                                    date: ev.date, 
                                    type: 'Festivo', 
                                    title: ev.title 
                                });
                                addedCount++;
                            }
                        }
                        
                        UI.toast(`¡Éxito! ${addedCount} festivos nuevos sincronizados.`);
                        renderView();
                        renderSlideOverContent('exceptions');
                        
                    } catch (error) {
                        UI.alert('Error de sincronización', 'No se pudieron descargar los festivos: ' + error.message);
                        btn.disabled = false;
                        btn.innerHTML = '<span class="text-section mr-2">📅</span> Sincronizar Festivos (Com. Valenciana)';
                    }
                };
            }
                else if (view === 'tasks') {
                    const rows = (await NurseDB.all('tasks')).sort((a,b)=>(a.done-b.done) || ((a.due||'9999').localeCompare(b.due||'9999')));
                    html = `
                        <form id="taskForm" class="card">
                            <label>Nueva Tarea</label>
                            <input class="field" name="title" required placeholder="Ej. Entregar trabajo de anatomía">
                            <div class="form-row">
                                <div class="form-field"><label>Fecha límite</label><input class="field" type="date" name="due" value="${state.calendarSelectedDate}"></div>
                                <div class="form-field"><label>Categoría</label><select class="field" name="category"><option>Universidad</option><option>Prácticum</option><option>Personal</option></select></div>
                            </div>
                            <button class="btn primary block">Añadir Tarea</button>
                        </form>
                        <h4 class="m-24px-0-8px">Lista de tareas</h4>
                        <div class="list">${rows.map(x=>`<div class="list-row"><label class="check-row m-0 flex-1"><input type="checkbox" data-task="${x.id}" ${x.done?'checked':''}><span><strong class="${x.done ? 'is-done' : ''}">${esc(x.title)}</strong><div class="sub">${x.due?dateFmt(x.due):'Sin fecha'} · ${esc(x.category)}</div></span></label><button class="btn icon-only" data-action="deleteTask" data-id="${x.id}">×</button></div>`).join('') || UIHelpers.noData('Nada pendiente', 'Estás al día.')}</div>`;
                }
                else if (view === 'caseForm') {
                    const row = data ? await NurseDB.get('cases', data) : null;
                    const procs = await NurseDB.all('procedures');
                    html = `
                        ${UIHelpers.notice('Registro académico anonimizado. Nunca introduzcas SIP, cama, ni nombres reales de pacientes.', false, true)}
                        <form id="caseForm" class="card">
                            <fieldset class="form-group"><legend>Turno</legend>
                            <div class="form-row">
                                <div class="form-field"><label>Fecha</label><input class="field" type="date" name="date" value="${row?.date || getLocalISOToday()}" required></div>
                                <div class="form-field"><label>Área / Servicio</label><input class="field" name="area" value="${esc(row?.area || state.settings.service || 'Planta')}"></div>
                            </div>
                            
                            </fieldset>
                            
                            <fieldset class="form-group"><legend>Situación clínica</legend>
                            <label>Diagnóstico principal (Buscador OMS)</label>
                            <input class="field" name="diagnosis" id="caseDiagnosis" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="icdAutocomplete" value="${esc(row?.diagnosis||'')}" placeholder="Escribe para buscar (ej. Neumonía)" autocomplete="off" required>
                            <input type="hidden" name="icdCode" id="caseIcdCode" value="${esc(row?.icdCode||'')}">
                            <input type="hidden" name="icdValidated" id="caseIcdValidated" value="${row?.icdValidated ? 'true' : 'false'}">
                            
                            <div id="icdStatus" class="text-small mt-8px mb-3">
                                ${row?.icdValidated ? '<span class="text-success">✓ Código validado con la OMS</span>' : '<span class="muted">No validado</span>'}
                            </div>
                            <div id="icdAutocomplete" class="list mb-4 bg-bg-hover p-2 border-radius-radius-md" role="listbox" aria-label="Diagnósticos sugeridos"></div>
                            
                            <label>Contexto del paciente (Auto-plantilla rápida)</label>
                            <textarea class="field min-height-110px" name="context" placeholder="Al seleccionar un diagnóstico arriba, este campo se rellenará automáticamente con una plantilla clínica para que no tengas que escribir de cero.">${esc(row?.context||'')}</textarea>
                            
                            </fieldset>
                            
                            <fieldset class="form-group"><legend>Intervenciones</legend>
                            <label>Procedimientos y Técnicas</label>
                            <div id="caseProcsList" class="mb-2">
                                ${(row?.procedures||[]).map(p => `
                                    <div class="form-row mb-2" data-proc-row>
                                        <select class="field mb-0" name="procId"><option value="${p.id}">${esc(p.name)}</option></select>
                                        <select class="field mb-0" name="participation">
                                            <option ${p.participation==='Realizado por mí'?'selected':''}>Realizado por mí</option>
                                            <option ${p.participation==='Observado'?'selected':''}>Observado</option>
                                            <option ${p.participation==='Ayudado'?'selected':''}>Ayudado</option>
                                        </select>
                                    </div>
                                `).join('')}
                            </div>
                            <div class="form-row mb-4" data-proc-row id="newProcTemplate">
                                <select class="field" name="procId"><option value="">+ Añadir técnica...</option>${procs.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select>
                                <select class="field" name="participation">
                                    <option>Realizado por mí</option>
                                    <option>Observado</option>
                                    <option>Ayudado</option>
                                </select>
                            </div>

                            <label>Medicamentos Clave</label>
                            <input class="field" name="meds" value="${esc((row?.meds||[]).join(', '))}" placeholder="Ej. Furosemida, Enoxaparina, Paracetamol">
                            
                            </fieldset>
                            
                            <fieldset class="form-group"><legend>Aprendizaje</legend>
                            <label>Aprendizaje del caso</label>
                            <textarea class="field" name="learning" placeholder="¿Qué has aprendido de este paciente?">${esc(row?.learning||'')}</textarea>
                            
                            <label>Dudas para revisar en casa</label>
                            <textarea class="field" name="review" placeholder="Ej. Repasar mecanismo de acción de la digoxina">${esc(row?.review||'')}</textarea>
                            
                            </fieldset><div class="card card--warning bg-warning-bg border-color-warning p-3 mb-6">
                                <label class="check-row m-0">
                                    <input type="checkbox" name="starred" ${row?.starred?'checked':''}>
                                    <span class="text-warning weight-bold">Destacar para la Memoria Final</span>
                                </label>
                            </div>

                            <div class="display-flex gap-2">
                                ${row && !state.readOnlyMode ? `<button type="button" class="btn danger flex-1" data-action="deleteCase" data-id="${row.id}">Borrar</button>` : ''}
                                ${!state.readOnlyMode ? `<button class="btn primary flex-2">Guardar Caso Clínico</button>` : '<p class="muted width-100 align-center">Modo solo lectura activado.</p>'}
                            </div>
                        </form>`;
                }
                else if (view === 'caseDetail') {
                    const c = await NurseDB.get('cases', data); if(!c) return;
                    html = `
                        <div class="card border-left-4px-solid-primary">
                            <div class="sub muted mb-1">
                                📅 ${dateFmt(c.date)} &nbsp;•&nbsp; 🏥 ${c.area ? esc(c.area) : 'Planta'}
                            </div>
                            <h2 class="text-page line-height-1-2 mb-2">${esc(c.diagnosis)}</h2>
                            <div class="display-flex gap-2 flex-wrap-wrap">
                                ${c.icdCode ? `<span class="pill bg-bg-hover border-1px-solid-border-color">CIE-11: ${esc(c.icdCode)}</span>` : ''}
                                ${c.icdValidated ? '<span class="pill bg-success text-white">✓ Validado OMS</span>' : ''}
                                ${c.starred ? '<span class="pill bg-warning text-white">★ Memoria</span>' : ''}
                            </div>
                        </div>
                        
                        ${c.context ? `<h4>Historia y Contexto</h4><div class="card"><p class="white-space-pre-wrap">${esc(c.context)}</p></div>` : ''}
                        
                        <h4>Procedimientos Realizados</h4>
                        <div class="list mb-6">
                            ${(c.procedures||[]).map(p=>UIHelpers.listRow({title:p.name, sub:`Nivel de participación: ${p.participation}`, icon:'▤'})).join('') || UIHelpers.noData('Ningún procedimiento', 'Solo observación clínica.')}
                        </div>
                        
                        ${c.meds?.length ? `<h4>Farmacología Asociada</h4><div class="card tag-cloud mb-6">${c.meds.map(m=>`<span class="tag bg-color-mix-in-srgb-primary-10-transparent text-primary border-color-primary">${esc(m)}</span>`).join('')}</div>` : ''}
                        
                        ${(c.learning || c.review) ? '<h4>Reflexión y Dudas</h4>' : ''}
                        ${c.learning ? `<div class="card border-left-3px-solid-success"><p class="muted small mb-1">APRENDIZAJE</p><p class="white-space-pre-wrap">${esc(c.learning)}</p></div>` : ''}
                        ${c.review ? `<div class="card border-left-3px-solid-danger"><p class="muted small mb-1">PENDIENTE REVISAR</p><p class="white-space-pre-wrap">${esc(c.review)}</p></div>` : ''}
                        
                        ${!state.readOnlyMode ? `<div class="mt-8"><button class="btn primary block" data-action="openSlide" data-view="caseForm" data-id="${c.id}">Editar Caso Clínico</button></div>` : ''}`;
                }
                else if (view === 'procDetail') {
                    const p = await NurseDB.get('procedures', data); 
                    if(!p) return;
                    
                    html = `
                        <div class="card hero">
                            <div class="muted small">Guía de Técnica Enfermera</div>
                            <h2 class="text-page line-height-1-2 mt-1 mb-3">${esc(p.name)}</h2>
                            ${p.favorite ? '<span class="pill bg-rgba-255-255-255-0-2 text-white">★ Técnica Frecuente</span>' : ''}
                        </div>
                        
                        <h4 class="mb-2">Bandeja / Material Necesario</h4>
                        <div class="card">
                            <ul class="pl-0 list-style-none text-text-main">
                                ${(p.materials||[]).map(m => `<li class="mb-2 pb-2 border-bottom-1px-solid-border-color display-flex items-flex-start"><span class="text-primary mr-2">▫</span> ${esc(m)}</li>`).join('')}
                            </ul>
                        </div>
                        
                        <h4 class="mt-6 mb-2">Consideraciones Clínicas (Evidencia)</h4>
                        <div class="card bg-color-mix-in-srgb-primary-5-transparent border-left-4px-solid-primary">
                            <ul class="pl-20px text-text-main">
                                ${(p.notes||[]).map(n => `<li class="mb-3 line-height-1-4">${esc(n)}</li>`).join('')}
                            </ul>
                        </div>
                        ${UIHelpers.clinicalWarning()}
                    `;
                }
                else if (view === 'dayLog') {
                    const date = getLocalISOToday(), row = await NurseDB.get('days', date);
                    html = `
                        ${UIHelpers.notice('Registra tu asistencia y estado de ánimo general del turno.')}
                        <form id="dayForm" class="card">
                            <label>Fecha de la Guardia/Turno</label>
                            <input class="field bg-bg-hover" type="date" name="date" value="${date}" required readonly>
                            
                            <label>Estado del turno</label>
                            <select class="field" name="mood">
                                <option ${row?.mood==='Tranquilo'?'selected':''}>😊 Tranquilo y formativo</option>
                                <option ${row?.mood==='Intenso'?'selected':''}>🔥 Intenso / Sobrecarga</option>
                                <option ${row?.mood==='Muy productivo'?'selected':''}>🚀 Muy productivo (muchas técnicas)</option>
                                <option ${row?.mood==='Duro emocionalmente'?'selected':''}>❤️ Duro emocionalmente (exitus, etc.)</option>
                            </select>
                            
                            <label>Diario Reflexivo (Opcional)</label>
                            <textarea class="field min-height-100px" name="learning" placeholder="¿Cómo te has sentido hoy con el equipo? ¿Qué tal el trato con los pacientes?">${esc(row?.learning||'')}</textarea>
                            
                            <div class="card bg-bg-hover p-3 mb-6 box-shadow-none">
                                <label class="check-row m-0">
                                    <input type="checkbox" name="attendance" ${row?.attendanceOfficial?'checked':''}>
                                    <span class="text-small">He fichado la asistencia en la plataforma oficial de la Universidad.</span>
                                </label>
                            </div>
                            
                            ${!state.readOnlyMode ? '<button class="btn primary block">Guardar Registro Diario</button>' : '<p class="muted text-center">Modo lectura</p>'}
                        </form>`;
                }
                else if (view === 'portfolio' || view === 'tutoria') {
                    const cases = await NurseDB.all('cases');
                    const stats = new Map();
                    cases.forEach(c => (c.procedures||[]).forEach(p => {
                        if(!stats.has(p.id)) stats.set(p.id, {name: p.name, obs:0, help:0, done:0, total:0});
                        const s = stats.get(p.id); s.total++;
                        if(p.participation.includes('mí')) s.done++; else if(p.participation.includes('Ayudado')) s.help++; else s.obs++;
                    }));
                    const rows = [...stats.values()].sort((a,b) => b.total - a.total);
                    html = `
                        <div class="metric-row">
                            <div class="metric"><b>${stats.size}</b><span>Técnicas</span></div>
                            <div class="metric"><b class="text-success">${rows.reduce((n,r)=>n+r.done,0)}</b><span>Mías</span></div>
                            <div class="metric"><b class="text-warning">${rows.reduce((n,r)=>n+r.help,0)}</b><span>Ayuda</span></div>
                            <div class="metric"><b class="text-text-muted">${rows.reduce((n,r)=>n+r.obs,0)}</b><span>Obs.</span></div>
                        </div>
                        <h4 class="m-24px-0-8px">Competencias Clínicas</h4>
                        <div class="list">${rows.map(s => UIHelpers.listRow({
                            title: s.name, 
                            sub: `Realizadas: ${s.done} · Ayudadas: ${s.help} · Observadas: ${s.obs}`, 
                            icon: s.total, 
                            badge: s.done>2 ? 'Dominado' : 'En progreso'
                        })).join('') || UIHelpers.noData('Aún sin técnicas', 'Registra casos clínicos para ver aquí tu progreso de habilidades.')}</div>`;
                }
                else if (view === 'memoria') {
                    const cases = (await NurseDB.all('cases')).sort((a,b)=>a.date.localeCompare(b.date));
                    const chosen = cases.filter(c=>c.starred);
                    html = `
                        ${UIHelpers.notice('Usa estos casos destacados como base para redactar tu Trabajo o Memoria Final de Prácticas.', true)}
                        <div class="metric-row">
                            <div class="metric"><b>${cases.length}</b><span>Casos Totales</span></div>
                            <div class="metric"><b class="text-warning">${chosen.length}</b><span>Destacados</span></div>
                        </div>
                        <h4 class="m-24px-0-8px">Tus Casos Favoritos</h4>
                        <div class="list">${chosen.map(c=>UIHelpers.listRow({
                            title: c.diagnosis, 
                            sub: `${dateFmt(c.date)} ·${c.area || 'Planta'}`, 
                            icon:'★', 
                            action: `data-action="openSlide" data-view="caseDetail" data-id="${c.id}"`
                        })).join('') || UIHelpers.noData('No hay casos marcados', 'Edita un caso clínico y marca la casilla "Destacar para Memoria".')}</div>`;
                }
                else if (view === 'medSearch') {
                    html = `
                        ${UIHelpers.notice('Conectado a la AEMPS (Agencia Española de Medicamentos).', true)}
                        <div class="card display-flex gap-2 p-3">
                            <input class="field m-0 flex-1" id="cimaQ" placeholder="Ej. Paracetamol, Adrenalina..." autofocus>
                            <button class="btn primary min-width-80px" id="cimaBtn">Buscar</button>
                        </div>
                        <div id="cimaRes" class="mt-4">${UIHelpers.noData('Buscador CIMA', 'Busca por principio activo o marca comercial para descargar su ficha técnica oficial.')}</div>`;
                }
                else if (view === 'diseaseSearch') {
                    html = `
                        ${UIHelpers.notice('Conectado a la base de datos oficial CIE-11 de la OMS.', true)}
                        <div class="card display-flex gap-2 p-3">
                            <input class="field m-0 flex-1" id="icdQ" placeholder="Ej. Insuficiencia cardíaca..." autofocus>
                            <button class="btn primary min-width-80px" id="icdBtn">Buscar</button>
                        </div>
                        <div id="icdRes" class="mt-4">
                            ${UIHelpers.noData('Guía de Patologías', 'Busca cualquier enfermedad, síndrome o trastorno para ver su definición, exclusiones y añadir tus planes de cuidados.')}
                        </div>`;
                }
                else if (view === 'diseaseDetail') {
                    const [fullId, passedCode] = String(data).split('|');
                    const entityId = fullId.split('/').pop(); 
                    
                    html = `
                        <div class="empty-state mt-40px">
                            <div class="loader text-display mb-4">🔄</div>
                            <strong>Descargando datos clínicos...</strong>
                            <span class="muted">Conectando con la Organización Mundial de la Salud</span>
                        </div>`;
                    
                    try {
                        const workerUrl = `https://nurseflow-api.carlosb-n.workers.dev/icd/entity/${entityId}`;
                        const controller = new AbortController();
                        const r = await fetch(workerUrl, { signal:controller.signal, headers: { 'Accept-Language': 'es' } });
                        if (!r.ok) throw new Error('No encontrado');
                        const d = await r.json();
                        
                        const title = d.title?.['@value'] || 'Patología Desconocida';
                        const definition = d.definition?.['@value'] || 'No hay definición oficial disponible en la OMS para esta entidad.';
                        const synonyms = (d.synonym || []).map(s => s.label?.['@value']).filter(Boolean);
                        const exclusions = (d.exclusion || []).map(e => e.label?.['@value']).filter(Boolean);
                        
                        const localNote = await NurseDB.get('pae', entityId) || { notes: '' };
                        const block = (t, txt) => txt ? `<div class="card"><h4 class="mb-2">${t}</h4><p class="line-height-1-6">${esc(txt)}</p></div>` : '';
                        
                        const displayCode = passedCode || d.code || 'S/C';

                        html = `
                            <div class="card hero bg-text-main text-white">
                                <div class="sub text-rgba-255-255-255-0-7 mb-1">CIE-11 Base OMS</div>
                                <h2 class="text-page line-height-1-2 mb-3">${esc(title)}</h2>
                                <span class="pill bg-rgba-255-255-255-0-2 text-white">Código: ${esc(displayCode)}</span>
                            </div>
                            
                            ${block('Definición Médica', definition)}
                            
                            ${synonyms.length ? `
                            <div class="card">
                                <h4 class="mb-2">También conocido como (Sinónimos)</h4>
                                <div class="tag-cloud">
                                    ${synonyms.slice(0, 8).map(s => `<span class="tag text-small">${esc(s)}</span>`).join('')}
                                    ${synonyms.length > 8 ? '<span class="tag muted">...</span>' : ''}
                                </div>
                            </div>` : ''}
                            
                            ${exclusions.length ? `
                            <div class="card border-left-4px-solid-danger bg-danger-bg">
                                <h4 class="mb-2 text-danger">Excluye (Diagnóstico Diferencial)</h4>
                                <ul class="pl-20px text-text-main text-small line-height-1-5">
                                    ${exclusions.map(e => `<li class="mb-1">${esc(e)}</li>`).join('')}
                                </ul>
                            </div>` : ''}
                            
                            <div class="card border-2px-solid-primary mt-6 box-shadow-0-4px-6px-rgba-13-148-136-0-1">
                                <div class="display-flex items-center gap-2 mb-2">
                                    <span class="text-page">👩‍⚕️</span>
                                    <h3 class="m-0 text-primary">Plan de Cuidados (Tus notas)</h3>
                                </div>
                                <p class="muted small mb-4 border-bottom-1px-solid-border-color pb-3">
                                    Escribe aquí los diagnósticos NANDA, intervenciones (NIC) o cuidados de vigilancia clínica asociados a este diagnóstico médico.
                                </p>
                                <textarea class="field min-height-150px font-family-monospace line-height-1-5 bg-bg-hover border-none" id="nursingNotes" placeholder="Ej. \n- NANDA: Deterioro del intercambio de gases...\n- Vigilar saturación de O2 c/4h\n- Posición Fowler...">${esc(localNote.notes)}</textarea>
                                ${!state.readOnlyMode ? `<button class="btn primary block" id="saveNursingNotes" data-id="${esc(entityId)}">Guardar Plan de Cuidados</button>` : ''}
                            </div>
                        `;
                    } catch (err) {
                        html = UIHelpers.notice('Error al cargar la entidad. Comprueba tu conexión a internet o el servidor.', false, true);
                    }
                }
                else if (view === 'medLocalDetail') {
                    const m = await NurseDB.get('meds', data); if (!m) return; const c = m.clinical || {};
                    const block = (title, text, danger = false) => text ? `<div class="card ${danger ? 'card--danger' : ''}"><h4 class="card-title">${danger ? '⚠ ' : ''}${title}</h4><p class="line-height-1-5 text-body">${esc(text)}</p></div>` : '';
                    html = `
                        <div class="card hero">
                            <div class="sub text-rgba-255-255-255-0-8 mb-1">Botiquín Offline · Reg: ${m.registration}</div>
                            <h2 class="text-page mb-3 line-height-1-2">${esc(m.name)}</h2>
                            <div class="bg-rgba-0-0-0-0-2 p-3 border-radius-radius-sm">
                                <strong class="text-white display-block text-small text-transform-uppercase letter-spacing-0-5px mb-1">Principio Activo</strong>
                                <span class="text-section">${esc(m.active)}</span>
                            </div>
                        </div>
                        ${block('Alergias y Contraindicaciones (FT 4.3)', c.contraindications, true)}
                        ${block('Advertencias y Precauciones (FT 4.4)', (c.warnings || c.advertencias), true)}
                        ${block('Posología (FT 4.2)', c.posology)}
                        ${block('Interacciones (FT 4.5)', c.interactions)}
                        ${block('Reacciones Adversas (FT 4.8)', c.adverse)}
                        ${block('Incompatibilidades (FT 6.2)', c.incompatibilities)}
                        ${block('Conservación (FT 6.4)', c.storage)}
                        ${block('Manipulación (FT 6.6)', c.handling)}
                        ${block('Para qué se usa (Indicaciones FT 4.1)', c.indicaciones)}
                        ${!state.readOnlyMode ? `<div class="mt-8"><button class="btn danger block" data-action="deleteMed" data-id="${m.id}">Eliminar del botiquín offline</button></div>` : ''}`;
                }
                else if (view === 'scanner') {
                    html = `
                        <div class="card">
                            <h3 class="mb-3">Escáner de código de barras</h3>
                            <div id="scanArea">
                                ${'BarcodeDetector' in window ? `<div class="scanner-container"><video id="scanVid" autoplay playsinline></video><div class="scanner-line"></div></div>` : UIHelpers.notice('Tu navegador no soporta el escáner de cámara nativo.', false, true)}
                            </div>
                            <hr class="border-0 border-top-1px-solid-border-color m-16px-0">
                            <label>Búsqueda manual (Código Nacional)</label>
                            <div class="form-row display-flex gap-2">
                                <input class="field m-0 flex-1" id="scanManual" placeholder="Ej. 654321" inputmode="numeric">
                                <button class="btn primary min-width-80px" id="scanManualBtn">Buscar</button>
                            </div>
                        </div>`;
                }
                else if (view === 'calculators') {
                    html = Calculadoras.menu();
                }
                else if (view === 'calcForm') {
                    html = Calculadoras.form(data);
                }
                else if (view === 'labs' || view === 'dictionary') {
                    const dataSrc = view === 'labs' ? NURSE_DATA.labs : NURSE_DATA.glossary;
                    html = `
                        <div class="card p-3"><input class="field m-0" id="filterQ" placeholder="Buscar concepto..." autofocus></div>
                        <div class="list" id="filterList">${dataSrc.map(x=>UIHelpers.listRow({title: x[0], sub: view==='labs'?`${x[3]}${x[2]}`:x[1], icon: view==='labs'?x[1]:x[0].charAt(0)})).join('')}</div>`;
                }
                else if (view === 'flashcards') {
                    const rows = await NurseDB.all('flashcards');
                    html = `
                        <form id="flashForm" class="card">
                            <h3 class="mb-4">Crear Tarjeta</h3>
                            <label>Pregunta (Anverso)</label>
                            <input class="field" name="q" required placeholder="Ej. Antídoto del Paracetamol">
                            <label>Respuesta (Reverso)</label>
                            <textarea class="field min-height-80px" name="a" required placeholder="Ej. N-Acetilcisteína"></textarea>
                            <label>Tema o Asignatura</label>
                            <input class="field" name="topic" value="General">
                            <button class="btn primary block mt-2">Añadir Flashcard</button>
                        </form>
                        <h4 class="m-24px-0-8px">Tus Tarjetas</h4>
                        <div class="list">${rows.map(x=>`<div class="list-row"><div class="grow"><strong>${esc(x.q)}</strong><div class="sub">${esc(x.topic)} · Próx. repaso: ${x.due?dateFmt(x.due):'Hoy'}</div></div><button class="btn icon-only" data-action="deleteCard" data-id="${x.id}">×</button></div>`).join('') || UIHelpers.noData('Botiquín mental vacío', 'Crea flashcards para memorizar conceptos clave.')}</div>`;
                }
                else if (view === 'flashReview') {
                    const cards = (await NurseDB.all('flashcards')).filter(c=>!c.due||c.due<=getLocalISOToday());
                    if(!cards.length) return UI.toast('¡Genial! No hay tarjetas pendientes de repaso por hoy.');
                    html = `<div id="flashGame" data-idx="0"></div>`;
                }
                else if (view === 'quiz') {
                    html = `<div id="quizGame" data-idx="0" data-score="0"></div>`;
                }
                else if (view === 'practiceReview') {
                    const cases = await NurseDB.all('cases'); const tags = [...new Set(cases.flatMap(c=>[c.review, c.diagnosis].filter(Boolean)))];
                    html = `
                        ${UIHelpers.notice('Convierte tus dudas de las prácticas en preguntas de repaso con un solo toque.', true)}
                        <div class="card">
                            <h4 class="mb-4">Conceptos de tus casos clínicos</h4>
                            <div class="tag-cloud">${tags.map(t=>`<button class="tag bg-bg-hover" data-action="createCardFromTag" data-val="${esc(t)}">➕ ${esc(t)}</button>`).join('') || UIHelpers.noData('Aún sin dudas', 'Registra casos clínicos con dudas o diagnósticos para generar tarjetas.')}</div>
                        </div>`;
                }
                else if (view === 'studyStats') {
                    const cards = await NurseDB.all('flashcards');
                    html = `
                        <div class="metric-row">
                            <div class="metric"><b>${cards.length}</b><span>Total</span></div>
                            <div class="metric"><b class="text-primary">${cards.filter(c=>c.reps>0).length}</b><span>Repasadas</span></div>
                            <div class="metric"><b class="text-success">${cards.filter(c=>c.due>getLocalISOToday()).length}</b><span>Al día</span></div>
                            <div class="metric"><b>${new Set(cards.map(c=>c.topic)).size}</b><span>Temas</span></div>
                        </div>`;
                }
                else if (view === 'settingsMain') {
                    html = `
                        <div class="list">
                            ${UIHelpers.listRow({
                                title: 'Tutorial y configuración guiada',
                                sub: 'Aprende a usar NurseFlow y configura tu horario',
                                icon: '?',
                                action: 'data-action="startTutorial"'
                            })}
                            <div class="mode-settings"><button class="btn secondary" data-action="toggleGloves">Modo guantes</button><button class="btn secondary" data-action="toggleReadOnly">Solo lectura</button></div>
                            ${[['Perfil Académico','settingsProfile','👤'],['Prácticum (Hospital)','settingsPracticum','🏥'],['Apariencia y Avisos','settingsTheme','🎨'],['Privacidad y Bloqueo (PIN)','settingsPrivacy','🔒'],['Base de Datos (Exportar/Borrar)','settingsData','💾']].map(i=>UIHelpers.listRow({title:i[0], icon:i[2], action:`data-action="openSlide" data-view="${i[1]}"`})).join('')}
                        </div>
                        <div class="align-center mt-40px pb-20px">
                            <div class="weight-bold text-section text-primary">NurseFlow Pro</div>
                            <div class="muted small mt-1">Versión 2.5 · Entorno 100% Offline y Privado</div>
                            <div class="muted small mt-2px">Diseñado para Enfermería</div>
                        </div>`;
                }
                else if (view === 'settingsProfile') {
                    html = `
                        <form id="profForm" class="card">
                            <label>Nombre del Estudiante / Profesional</label><input class="field" name="name" value="${esc(state.settings.profileName)}">
                            <div class="form-row">
                                <div class="form-field"><label>Universidad</label><input class="field" name="uni" list="universities" value="${esc(state.settings.university)}"><datalist id="universities"><option value="UCV">Universidad Católica de Valencia</option></datalist></div>
                                <div class="form-field"><label>Curso</label><select class="field" name="course">${[1,2,3,4].map(n=>`<option value="${n}" ${String(n)===String(state.settings.courseNumber)?'selected':''}>${n}º</option>`).join('')}</select></div>
                            </div>
                            <button class="btn primary block mt-4">Guardar Perfil</button>
                        </form>`;
                }
                else if (view === 'settingsPracticum') {
                    const isUCV = /ucv|cat[óo]lica de valencia/i.test(state.settings.university);
                    let practicumInputHtml = `<input class="field" name="practicum" value="${esc(state.settings.practicum)}" placeholder="Ej. Prácticum II">`;
                    
                    if (isUCV) {
                        let practicums = [];
                        for (const subs of Object.values(NURSE_DATA.ucv.subjects)) {
                            practicums.push(...subs.filter(sub => sub[1].toLowerCase().includes('practicum')).map(sub => sub[1]));
                        }
                        let opts = '<option value="">Selecciona Prácticum...</option>';
                        practicums.forEach(p => {
                            const selected = state.settings.practicum === p ? 'selected' : '';
                            opts += `<option value="${esc(p)}" ${selected}>${esc(p)}</option>`;
                        });
                        practicumInputHtml = `<select class="field" name="practicum">${opts}</select>`;
                    }

                    html = `
                        <form id="pracForm" class="card">
                            <label class="switch-row mb-6"><span><strong>Activar periodo de prácticas</strong></span><span class="switch"><input type="checkbox" id="hasPracToggle" ${state.settings.hasPracticum?'checked':''}><span class="slider"></span></span></label>
                            
                            <div id="pracFields" class="${state.settings.hasPracticum?'':'hidden'}">
                                <label>Asignatura (Prácticum)</label>
                                ${practicumInputHtml}
                                <label>Centro Sanitario / Hospital</label>
                                <input class="field" name="hospital" value="${esc(state.settings.hospital)}" placeholder="Ej. Hospital Clínico">
                                <label>Servicio o Unidad habituál</label>
                                <input class="field" name="service" value="${esc(state.settings.service)}" placeholder="Ej. UCI, Planta M.Interna...">
                                <div class="form-row">
                                    <div class="form-field"><label>Fecha Inicio</label><input class="field" type="date" name="start" value="${state.settings.periodStart}"></div>
                                    <div class="form-field"><label>Fecha Fin</label><input class="field" type="date" name="end" value="${state.settings.periodEnd}"></div>
                                </div>
                            </div>
                            <button class="btn primary block mt-4">Guardar Configuración</button>
                        </form>`;
                }
                else if (view === 'settingsTheme') {
                    html = `
                        <div class="card">
                            <label>Tema visual</label>
                            <select class="field" id="themeSel"><option value="system" ${state.settings.theme==='system'?'selected':''}>Automático (Sistema)</option><option value="light" ${state.settings.theme==='light'?'selected':''}>☀ Claro</option><option value="dark" ${state.settings.theme==='dark'?'selected':''}>🌙 Oscuro</option></select>
                            
                            <hr class="border-0 border-top-1px-solid-border-color m-24px-0">
                            
                            <label class="switch-row">
                                <span>
                                    <strong>Avisos Legales Clínicos</strong>
                                    <span class="sub">Muestra la advertencia de comprobación de protocolos al final de calculadoras y guías.</span>
                                </span>
                                <span class="switch"><input type="checkbox" id="warnSel" ${state.settings.showClinicalWarnings?'checked':''}><span class="slider"></span></span>
                            </label>
                            
                            <button class="btn primary block mt-6" id="saveTheme">Aplicar Cambios</button>
                        </div>`;
                }
                else if (view === 'settingsPrivacy') {
                    html = `
                        ${UIHelpers.notice('Protege el acceso a la aplicación para mantener seguros los registros de tus casos clínicos.', true)}
                        <div class="card">
                            <label class="switch-row mb-6">
                                <span class="text-section text-primary"><strong>🔒 Bloquear PWA al salir</strong></span>
                                <span class="switch"><input type="checkbox" id="lockTog" ${state.settings.lockEnabled?'checked':''}><span class="slider"></span></span>
                            </label>
                            
                            <label>Método de desbloqueo</label>
                            <select class="field" id="lockMet">
                                <option value="pin" ${state.settings.lockMethod==='pin'?'selected':''}>Teclado PIN (6 dígitos)</option>
                                <option value="webauthn" ${state.settings.lockMethod==='webauthn'?'selected':''}>Biometría Nativa (FaceID / Huella)</option>
                            </select>
                            
                            <label>Configurar Nuevo PIN</label>
                            <input class="field" type="password" inputmode="numeric" id="newPin" placeholder="Obligatorio (6 a 8 números)">
                            
                            <label>Auto-bloqueo por inactividad</label>
                            <select class="field" id="autoL">
                                <option value="0">Solo al cerrar la app</option>
                                <option value="1" ${state.settings.autoLock==1?'selected':''}>Tras 1 minuto</option>
                                <option value="5" ${state.settings.autoLock==5?'selected':''}>Tras 5 minutos</option>
                            </select>
                            
                            <button class="btn primary block mt-4" id="savePriv">Guardar Privacidad</button>
                        </div>`;
                }
                else if (view === 'settingsData') {
                    const canAutoBackup = 'showSaveFilePicker' in window;
                    const hasBackupHandle = (await NurseDB.get('settings', 'backupHandle')) ? true : false;
                    
                    html = `
                        ${UIHelpers.notice('Tu información reside exclusivamente en tu dispositivo móvil. Realiza copias de seguridad regularmente.', true)}
                        
                        ${canAutoBackup ? `
                        <div class="card border-color-primary mb-6">
                            <h4 class="text-primary mb-2">Autoguardado en Dispositivo</h4>
                            <p class="muted small mb-3">Enlaza un archivo local. Al abrir la app se actualizará automáticamente reescribiendo el mismo archivo, sin crear duplicados.</p>
                            <button class="btn block bg-bg-hover text-primary border-1px-solid-primary" id="setupAutoBackupBtn">
                                ${hasBackupHandle ? '✓ Archivo enlazado (Tocar para re-vincular)' : 'Configurar Archivo de Autoguardado'}
                            </button>
                        </div>
                        ` : ''}

                        <div class="list">
                            <button class="list-row clickable" id="exportModalBtn">
                                <div class="avatar bg-primary text-white">⇩</div>
                                <div class="grow"><strong>Exportación Manual</strong><div class="sub">Descarga un nuevo archivo JSON con la fecha actual</div></div>
                            </button>
                            <button class="list-row clickable" id="importBtn">
                                <div class="avatar">⇧</div>
                                <div class="grow"><strong>Importar Datos</strong><div class="sub">Restaurar archivo JSON</div></div>
                            </button>
                        </div>
                        <div class="card mt-8 border-color-danger">
                            <h4 class="text-danger mb-2">Zona de Peligro</h4>
                            <p class="muted small mb-4">Esta acción borrará todos tus casos, tareas, clases y configuraciones de este dispositivo sin posibilidad de recuperación.</p>
                            <button class="btn danger block" id="wipeBtn">Borrar todos los datos de la App</button>
                        </div>`;
                }
                else if (view === 'globalSearch') {
                    html = `
                        <div class="card p-3">
                            <input class="field m-0" id="gSearchQ" placeholder="🔍 Buscar medicamento, caso, técnica..." autofocus>
                        </div>
                        <button class="btn block" data-action="goRoute" data-val="consultation">Abrir Consulta</button><div id="gSearchRes" class="list mt-4">
                            <div class="empty-state small">Escribe para buscar en toda la base de datos local</div>
                        </div>`;
                }

                if(!html) html = UIHelpers.noData('Vista no encontrada', 'Ruta no válida.');
                if(renderId !== UI.slideRenderId || !state.slideOverOpen) return;
                content.innerHTML = html;
                setupSlideOverEvents(view, data);

            } catch (e) {
                content.innerHTML = UIHelpers.notice(`Error de renderizado: ${e.message}`, false, true);
            }
        }

        function setupSlideOverEvents(view, data) {
            if(view === 'classForm') {
                $('#subjectSelect')?.addEventListener('change', e => $('#customSubject').classList.toggle('hidden', e.target.value !== '__custom'));
                $('#classForm').onsubmit = async e => {
                    e.preventDefault(); const f = new FormData(e.target);
                    const sel = $('#subjectSelect')?.value, t = (sel && sel !== '__custom' ? sel : $('#customSubject').value).trim();
                    if(!t) return UI.toast('Falta título de la asignatura');
                    await NurseDB.put('schedule', {id: data||uid(), title: t, day: +f.get('day'), room: f.get('room').trim(), start: f.get('start'), end: f.get('end')});
                    state.slideOverOpen = false; renderView(); UI.toast('Horario actualizado');
                };
            }
            if(view === 'diseaseSearch') {
                const doSearch = async () => {
                    const q = $('#icdQ').value.trim();
                    if(q.length < 3) return;
                    const box = $('#icdRes');
                    box.innerHTML = `
                        <div class="empty-state mt-20px">
                            <div class="loader text-page mb-2">⏳</div>
                            <strong>Buscando en la OMS...</strong>
                        </div>`;
                    try {
                        const url = `https://nurseflow-api.carlosb-n.workers.dev/icd/search?q=${encodeURIComponent(q)}&includeKeywordMatches=true`;
                        console.log('[CIE-11] Iniciando búsqueda', {
                        url,
                        online: navigator.onLine
                    });

                    const r = await fetch(url, {
                        headers: { 'Accept-Language': 'es' }
                    });

                    console.log('[CIE-11] Respuesta HTTP', {
                        status: r.status,
                        statusText: r.statusText,
                        ok: r.ok,
                        contentType: r.headers.get('content-type')
                    });

                    const raw = await r.text();

                    console.log('[CIE-11] Cuerpo de respuesta:', raw.slice(0, 1500));

                    if (!r.ok) {
                        throw new Error(`HTTP ${r.status}: ${raw.slice(0, 300)}`);
                    }

                    let data;

                    try {
                        data = JSON.parse(raw);
                    } catch {
                        throw new Error('La respuesta recibida no es JSON válido');
                    }

                    console.log('[CIE-11] Datos recibidos', {
                        campos: Object.keys(data ?? {}),
                        resultados: data?.destinationEntities?.length
                    });
                        const items = data.destinationEntities || [];
                        
                        box.innerHTML = `<div class="list">${items.slice(0,15).map(x => {
                            const title = x.title.replace(/<[^>]+>/g, '');
                            const theCode = x.theCode || 'S/C';
                            return UIHelpers.listRow({
                                title: title,
                                sub: `Código CIE-11: ${theCode}`,
                                icon: '🩺',
                                action: `data-action="openSlide" data-view="diseaseDetail" data-id="${x.id}|${theCode}"`
                            });
                        }).join('') || UIHelpers.noData('Sin resultados', 'Prueba con otro término médico.')}</div>`;
                    } catch (e) {
                    console.error('[CIE-11] Error completo:', e);
                    console.error('[CIE-11] Detalles:', {
                        nombre: e.name,
                        mensaje: e.message,
                        stack: e.stack
                    });

                    box.innerHTML = UIHelpers.notice(
                        `No se pudo completar la búsqueda: ${esc(e.message)}`,
                        false,
                        true
                    );
                }
            }
                $('#icdBtn').onclick = doSearch;
                $('#icdQ').onkeydown = e => { if(e.key === 'Enter') doSearch(); };
            }
            if(view === 'diseaseDetail') {
                $('#saveNursingNotes')?.addEventListener('click', async (e) => {
                    const id = e.target.dataset.id;
                    const notes = $('#nursingNotes').value;
                    await NurseDB.put('pae', { id: id, notes: notes, updatedAt: new Date().toISOString() });
                    UI.toast('Plan de Cuidados guardado ✓');
                });
            }
            if(view === 'exceptions') {
                // Guardado manual
                $('#exceptionForm').onsubmit = async e => { 
                    e.preventDefault(); 
                    const f = new FormData(e.target); 
                    await NurseDB.put('exceptions', {id: uid(), date: f.get('date'), type: f.get('type'), title: f.get('title').trim()}); 
                    state.slideOverOpen = false; 
                    renderView(); 
                    UI.toast('Excepción guardada'); 
                };

                // Sincronización Automática
                $('#syncFestivosBtn').onclick = async () => {
                    const btn = $('#syncFestivosBtn');
                    btn.disabled = true;
                    btn.innerHTML = 'Descargando calendario... ⏳';
                    
                    try {
                        // Cambiamos webcals:// por https:// y usamos un proxy público para evitar el bloqueo CORS del navegador
                        const url = 'https://calendariosnacionales.com/es/2026/festivos/val/index.ics';
                        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
                        
                        const response = await fetch(proxyUrl);
                        if (!response.ok) throw new Error('No se pudo acceder al servidor de calendarios');
                        
                        const text = await response.text();
                        const lines = text.split(/\r?\n/);
                        let inEvent = false, currentEvent = {}, events = [];
                        
                        // Procesador del archivo .ics
                        for (const line of lines) {
                            if (line.startsWith('BEGIN:VEVENT')) { 
                                inEvent = true; currentEvent = {}; 
                            }
                            else if (line.startsWith('END:VEVENT')) { 
                                inEvent = false; 
                                if (currentEvent.date && currentEvent.title) events.push(currentEvent); 
                            }
                            else if (inEvent) {
                                // Extraemos la fecha (Soporta DTSTART;VALUE=DATE:20260101 o DTSTART:20260101T000000Z)
                                if (line.startsWith('DTSTART')) {
                                    const parts = line.split(':');
                                    if (parts.length > 1) {
                                        const dateStr = parts[1].trim().substring(0, 8); // Cogemos YYYYMMDD
                                        if (dateStr.length === 8) {
                                            currentEvent.date = `${dateStr.substring(0,4)}-${dateStr.substring(4,6)}-${dateStr.substring(6,8)}`;
                                        }
                                    }
                                } 
                                // Extraemos el título del festivo
                                else if (line.startsWith('SUMMARY')) {
                                    const parts = line.split(':');
                                    if (parts.length > 1) currentEvent.title = parts.slice(1).join(':').trim();
                                }
                            }
                        }
                        
                        if(events.length === 0) throw new Error('El archivo del calendario estaba vacío.');

                        // Recuperamos las excepciones actuales para NO duplicarlas
                        const existing = await NurseDB.all('exceptions');
                        const existingDates = new Set(existing.map(e => e.date));
                        let addedCount = 0;

                        for (const ev of events) {
                            if (!existingDates.has(ev.date)) {
                                await NurseDB.put('exceptions', { 
                                    id: uid(), 
                                    date: ev.date, 
                                    type: 'Festivo', 
                                    title: ev.title 
                                });
                                addedCount++;
                            }
                        }
                        
                        UI.toast(`¡Éxito! ${addedCount} festivos nuevos sincronizados.`);
                        
                        // Refrescamos las vistas para que aparezcan al instante en la lista y en el calendario
                        renderView();
                        renderSlideOverContent('exceptions');
                        
                    } catch (error) {
                        UI.alert('Error de sincronización', 'No se pudieron descargar los festivos: ' + error.message);
                        btn.disabled = false;
                        btn.innerHTML = '<span class="text-section mr-2">📅</span> Sincronizar Festivos (Com. Valenciana)';
                    }
                };
            }
            if(view === 'tasks') {
                $$('[data-task]').forEach(c => c.onchange = async () => { const t = await NurseDB.get('tasks', c.dataset.task); t.done = c.checked; await NurseDB.put('tasks', t); renderView(); });
                $('#taskForm').onsubmit = async e => { e.preventDefault(); const f = new FormData(e.target); await NurseDB.put('tasks', {id: uid(), title: f.get('title').trim(), due: f.get('due'), category: f.get('category'), done: false}); state.slideOverOpen = false; renderView(); UI.toast('Tarea guardada'); };
            }
            if(view === 'caseForm') {
                const contextTextarea = document.querySelector('#caseForm [name="context"]');
                attachICDAutocomplete($('#caseDiagnosis'), $('#caseIcdCode'), $('#caseIcdValidated'), $('#icdStatus'), $('#icdAutocomplete'), contextTextarea);
                
                $('#caseForm').onsubmit = async e => {
                    e.preventDefault();
                    const f = new FormData(e.target);
                    const validated = f.get('icdValidated') === 'true';
                    if (f.get('diagnosis').trim() && f.get('icdCode') && !validated) {
                        const ok = await UI.confirm('CIE-11 No verificado', 'El diagnóstico introducido no se ha seleccionado de la lista validada de la OMS. ¿Deseas guardar de todos modos?', 'Guardar así', true);
                        if (!ok) return;
                    }
                    const procs = [...e.target.querySelectorAll('[data-proc-row]')].map(el => ({id: el.querySelector('[name="procId"]').value, name: el.querySelector('[name="procId"] option:checked')?.textContent||'', participation: el.querySelector('[name="participation"]').value})).filter(i => i.id);
                    await NurseDB.put('cases', {id: data||uid(), date: f.get('date'), area: f.get('area').trim(), diagnosis: f.get('diagnosis').trim(), icdCode: f.get('icdCode').trim(), icdValidated: validated, context: f.get('context').trim(), procedures: procs, meds: f.get('meds').split(',').map(i=>i.trim()).filter(Boolean), learning: f.get('learning').trim(), review: f.get('review').trim(), starred: f.get('starred')==='on', updatedAt: new Date().toISOString()});
                    state.slideOverOpen = false; renderView(); UI.toast('Caso Clínico guardado ✓');
                };
            }
            if(view === 'dayLog') {
                $('#dayForm').onsubmit = async e => { e.preventDefault(); const f = new FormData(e.target); await NurseDB.put('days', {id: f.get('date'), date: f.get('date'), attendanceOfficial: f.get('attendance')==='on', learning: f.get('learning').trim(), mood: f.get('mood')}); state.slideOverOpen = false; renderView(); UI.toast('Turno registrado ✓'); };
            }
            if(view === 'medSearch') {
                $('#cimaBtn').onclick = () => searchCIMA($('#cimaQ').value);
                $('#cimaQ').onkeydown = e => { if(e.key === 'Enter') searchCIMA(e.target.value); };
            }
            if(view === 'scanner') {
                if('BarcodeDetector' in window) {
                    const startNativeScan = async () => {
                        try {
                            const video = $('#scanVid'); const stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}}}); video.srcObject = stream;
                            const detector = new BarcodeDetector({formats:['ean_13','ean_8','data_matrix','code_128']});
                            const loop = async () => {
                                if(!video.srcObject) return;
                                try { const codes = await detector.detect(video); if(codes.length){ stream.getTracks().forEach(t=>t.stop()); $('#scanManual').value = codes[0].rawValue; $('#scanManualBtn').click(); return; } } catch(e){}
                                requestAnimationFrame(loop);
                            }; requestAnimationFrame(loop);
                        } catch(e) { UI.toast('Cámara no accesible'); }
                    }; startNativeScan();
                }
                $('#scanManualBtn').onclick = () => {
                    const v = $('#scanManual').value.trim();
                    if(v) {
                        state.slideOverOpen = false;
                        UI.openSlide('medSearch', 'CIMA Fármacos');
                        setTimeout(() => { $('#cimaQ').value = v; searchCIMA(v); }, 300);
                    }
                };
            }
            if(view === 'calculators') {
                Calculadoras.bindMenu();
            }
            if(view === 'calcForm') {
                Calculadoras.bindForm();
            }
            if(view === 'labs' || view === 'dictionary') {
                $('#filterQ').oninput = e => { const q = e.target.value.toLowerCase(); [...$('#filterList').children].forEach(c => c.classList.toggle('hidden', !c.textContent.toLowerCase().includes(q))); };
            }
            if(view === 'flashcards') {
                $('#flashForm').onsubmit = async e => { e.preventDefault(); const f = new FormData(e.target); await NurseDB.put('flashcards', {id: uid(), q: f.get('q').trim(), a: f.get('a').trim(), topic: f.get('topic').trim(), due: getLocalISOToday(), ease: 2.5, interval: 0, reps: 0}); state.slideOverOpen = false; UI.toast('Flashcard añadida ✓'); };
            }
            if(view === 'flashReview') {
                const initFlash = async () => {
                    const cards = (await NurseDB.all('flashcards')).filter(c=>!c.due||c.due<=getLocalISOToday());
                    const g = $('#flashGame'); let idx = Number(g.dataset.idx);
                    if(idx >= cards.length) { state.slideOverOpen = false; return UI.toast('¡Repaso completado por hoy! 🎉'); }
                    const c = cards[idx];
                    g.innerHTML = `
                        <div class="card min-height-250px display-flex flex-direction-column justify-center align-center box-shadow-0-10px-15px-3px-rgba-0-0-0-0-1">
                            <span class="pill align-self-center mb-4">${esc(c.topic)}</span>
                            <h2 class="text-size-1-6rem mt-2">${esc(c.q)}</h2>
                            <div id="fAns" class="hidden">
                                <hr class="border-0 border-top-1px-dashed-border-color m-24px-0">
                                <p class="text-section text-primary weight-500">${esc(c.a)}</p>
                            </div>
                        </div>
                        <button class="btn hero-btn block mt-6 border-2px-solid-primary" id="fShow">Revelar Respuesta</button>
                        <div id="fRate" class="grid-2 hidden mt-6">
                            <button class="btn danger" data-r="again">No me la sabía</button>
                            <button class="btn success bg-success text-white" data-r="good">Bien, la sabía</button>
                        </div>`;
                    $('#fShow').onclick = () => { $('#fAns').classList.remove('hidden'); $('#fRate').classList.remove('hidden'); $('#fShow').classList.add('hidden'); };                     
                    $$('[data-r]').forEach(b => b.onclick = async () => {
                        const r = b.dataset.r; c.reps++; 
                        if(r==='again') { c.interval = 0; c.due = getLocalISOToday(); }
                        if(r==='good') { c.interval = Math.max(1, Math.round((c.interval||1)*1.8)); const d = new Date(); d.setDate(d.getDate()+c.interval); c.due = d.toISOString().slice(0,10); }
                        await NurseDB.put('flashcards', c); g.dataset.idx = idx + 1; initFlash();
                    });
                }; initFlash();
            }
            if(view === 'quiz') {
                const initQuiz = async () => {
                    const qs = await NurseDB.all('quiz'); const g = $('#quizGame'); let idx = Number(g.dataset.idx); let score = Number(g.dataset.score);
                    if(idx >= qs.length) { g.innerHTML = `<div class="card score-big"><b>${score}/${qs.length}</b><span class="text-section mt-2">Aciertos Totales</span><button class="btn primary block mt-6" onclick="document.querySelector('[data-action=closeSlideOver]').click()">Finalizar</button></div>`; return; }
                    const q = qs[idx];
                    g.innerHTML = `
                        <div class="card mb-6">
                            <span class="pill mb-3">Pregunta ${idx+1} de ${qs.length}</span>
                            <h3 class="text-section line-height-1-4">${esc(q.q)}</h3>
                        </div>
                        <div class="list">${q.o.map((o,i)=>`<button class="btn justify-flex-start align-left height-auto min-height-48px p-3" data-o="${i}">${esc(o)}</button>`).join('')}</div>
                        <div id="qExp" class="mt-6"></div>`;
                    $$('[data-o]').forEach(b => b.onclick = () => {
                        $$('[data-o]').forEach((x,i) => { x.disabled=true; if(i===q.a) { x.classList.add('answer-correct'); x.insertAdjacentHTML('beforeend','<span> · Correcta</span>'); } else if(i===Number(b.dataset.o)) { x.classList.add('answer-incorrect'); x.insertAdjacentHTML('beforeend','<span> · Incorrecta</span>'); } });
                        if(Number(b.dataset.o)===q.a) score++; g.dataset.score = score;
                        $('#qExp').innerHTML = `${UIHelpers.notice('Explicación: ' + esc(q.e), true)}<button class="btn primary block mt-4" id="qNext">Siguiente Pregunta</button>`;
                        $('#qNext').onclick = () => { g.dataset.idx = idx + 1; initQuiz(); };
                    });
                }; initQuiz();
            }
            if(view === 'settingsProfile') {
                $('#profForm').onsubmit = async e => { e.preventDefault(); const f = new FormData(e.target); state.settings.profileName = f.get('name').trim(); state.settings.university = f.get('uni'); state.settings.courseNumber = f.get('course'); state.settings.course = `${f.get('course')}º Enfermería`; await saveSettings(); state.slideOverOpen = false; UI.toast('Perfil guardado ✓'); };
            }
            if(view === 'settingsPracticum') { 
                $('#hasPracToggle').onchange = e => $('#pracFields').classList.toggle('hidden', !e.target.checked); 
                $('#pracForm').onsubmit = async e => { e.preventDefault(); const f = new FormData(e.target); const has = $('#hasPracToggle').checked; Object.assign(state.settings, {hasPracticum: has, practicum: has?f.get('practicum'):'', hospital: has?f.get('hospital'):'', service: has?f.get('service'):'', periodStart: has?f.get('start'):'', periodEnd: has?f.get('end'):''}); await saveSettings(); state.slideOverOpen = false; UI.toast('Prácticas actualizadas ✓'); }; 
            }
            if(view === 'settingsTheme') {
                $('#saveTheme').onclick = async () => { state.settings.theme = $('#themeSel').value; state.settings.showClinicalWarnings = $('#warnSel').checked; await saveSettings(); document.documentElement.setAttribute('data-theme', state.settings.theme); state.slideOverOpen = false; UI.toast('Apariencia actualizada'); };
            }
            if(view === 'settingsPrivacy') {
                $('#savePriv').onclick = async () => {
                    const en = $('#lockTog').checked, met = $('#lockMet').value, p = $('#newPin').value.trim();
                    if(en && met==='pin' && !state.settings.pinHash && !/^\d{6,8}$/.test(p)) return UI.toast('Configura un PIN numérico de 6 a 8 dígitos');
                    if(p) { if(!/^\d{6,8}$/.test(p)) return UI.toast('PIN inválido (mínimo 6 cifras)'); state.settings.pinHash = await hashText(p); }
                    if(en && met==='webauthn') {
                        try { const cred = await navigator.credentials.create({publicKey:{challenge:crypto.getRandomValues(new Uint8Array(32)),rp:{name:'NurseFlow'},user:{id:crypto.getRandomValues(new Uint8Array(16)),name:'nf',displayName:'NF'},pubKeyCredParams:[{alg:-7,type:'public-key'},{alg:-257,type:'public-key'}],authenticatorSelection:{userVerification:'required'},timeout:60000,attestation:'none'}}); state.settings.credentialId = btoa(String.fromCharCode(...new Uint8Array(cred.rawId))); }
                        catch(e) { return UI.toast('Configuración biométrica cancelada'); }
                    }
                    state.settings.lockEnabled = en; state.settings.lockMethod = met; state.settings.autoLock = Number($('#autoL').value); await saveSettings(); state.slideOverOpen = false; UI.toast('Seguridad actualizada 🔒');
                };
            }
            if(view === 'settingsData') {
                $('#setupAutoBackupBtn')?.addEventListener('click', () => AutoBackup.setup());
                
                $('#exportModalBtn').onclick = async () => {
                    const ok = await UI.confirm('Exportar Datos', 'Elige qué deseas exportar:\n- Aceptar: Exportar TODO\n- Cancelar: Exportar solo Portfolio clínico', 'Exportar Todo', false);
                    const storesToExport = ok ? ['settings', 'cases', 'tasks', 'days', 'schedule', 'exceptions', 'pae', 'meds', 'procedures', 'quiz', 'flashcards'] : ['cases', 'days', 'procedures', 'meds'];
                    const data = await NurseDB.exportAll(storesToExport);
                    const url = URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'}));
                    const a = document.createElement('a'); a.href = url; a.download = `nurseflow-export-${getLocalISOToday()}.json`; a.click();
                    UI.toast('Archivo manual descargado con éxito');
                };
                $('#importBtn').onclick = () => $('#fileImport').click();
                $('#wipeBtn').onclick = async () => { if(await UI.confirm('Peligro Irreversible', '¿Borrar TODOS los datos locales permanentemente? Esto no se puede deshacer.', 'Sí, Borrar Todo', true)) { await NurseDB.reset(); location.reload(); } };
            }
            if(view === 'globalSearch') {
                $('#gSearchQ').oninput = async e => {
                    const q = e.target.value.toLowerCase(); 
                    if(q.length<2) {
                        $('#gSearchRes').innerHTML = '<div class="empty-state small">Escribe para buscar en toda la base de datos local</div>';
                        return;
                    }
                    const [cases, procs, meds] = await Promise.all([NurseDB.all('cases'), NurseDB.all('procedures'), NurseDB.all('meds')]);
                    if(!$('#gSearchQ') || $('#gSearchQ').value.toLowerCase() !== q) return;
                    let out = [UIHelpers.section('Casos')];
                    cases.filter(x=>x.diagnosis.toLowerCase().includes(q)).slice(0,3).forEach(x=>out.push(UIHelpers.listRow({title:x.diagnosis, sub:'Caso Clínico', icon:'C', action:`data-action="openSlide" data-view="caseDetail" data-id="${x.id}"`})));
                    out.push(UIHelpers.section('Técnicas'));
                    procs.filter(x=>x.name.toLowerCase().includes(q)).slice(0,3).forEach(x=>out.push(UIHelpers.listRow({title:x.name, sub:'Guía Técnica', icon:'P', action:`data-action="openSlide" data-view="procDetail" data-id="${x.id}"`})));
                    out.push(UIHelpers.section('Medicamentos'));
                    meds.filter(x=>x.name.toLowerCase().includes(q)).slice(0,3).forEach(x=>out.push(UIHelpers.listRow({title:x.name, sub:'Botiquín Offline', icon:'Rx', action:`data-action="openSlide" data-view="medLocalDetail" data-id="${x.id}"`})));
                    $('#gSearchRes').innerHTML = (out.length > 3 ? out.join('') : '') || UIHelpers.noData('Sin resultados', 'No se ha encontrado en tus datos locales.');
                };
            }
        }

        async function searchCIMA(q) {
            q = q.trim(); if(!q) return; const box = $('#cimaRes'); box.innerHTML = '<div class="empty-state">Buscando en AEMPS...</div>';
            try {
                const url = `https://cima.aemps.es/cima/rest/medicamentos?nombre=${encodeURIComponent(q)}&autorizados=1`;
                const r = await fetch(url); const data = await r.json(); const arr = data.resultados || data.results || [];
                box.innerHTML = `<div class="list">${arr.slice(0,20).map(x=>UIHelpers.medRow({id:String(x.nregistro),name:x.nombre,registration:x.nregistro,active:x.pactivos,raw:x})).join('') || UIHelpers.noData('Sin resultados')}</div>`;
            } catch(e) { box.innerHTML = UIHelpers.notice('Fallo al conectar con CIMA', false, true); }
        }

        async function fetchCIMAData(nregistro) {
            const base = `https://cima.aemps.es/cima/rest`;
            
            const medProm = fetch(`${base}/medicamento?nregistro=${nregistro}`).then(r=>r.json());
            
            const segProm = fetch(`${base}/docSegmentado/contenido/1?nregistro=${nregistro}`, {
                headers: { 'Accept': 'application/json' }
            }).then(r=>r.json()).catch(()=>[]);

            const [med, seg] = await Promise.all([medProm, segProm]);
            return { med, seg };
        }

        function flattenCIMASections(sections, result = []) {
            if (!sections) return result;
            sections.forEach(s => {
                result.push(s);
                if (s.secciones && s.secciones.length > 0) flattenCIMASections(s.secciones, result);
            });
            return result;
        }

        function extractCIMASection(sections, sectionCode) {
            if (!Array.isArray(sections)) return '';
            
            let found = null;
            function findSec(list) {
                for (const s of list) {
                    if (String(s.seccion) === sectionCode || String(s.seccion).startsWith(sectionCode)) {
                        found = s; 
                        return;
                    }
                    if (s.secciones) findSec(s.secciones);
                }
            }
            findSec(sections);
            
            if (!found || !found.contenido) return '';
            
            const doc = new DOMParser().parseFromString(found.contenido, 'text/html');
            doc.querySelectorAll('script,style,table').forEach(x=>x.remove());
            return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
        }

        function attachICDAutocomplete(input, codeInput, validatedInput, statusBox, resultsBox, contextInput = null) {
            let timer = null, generation = 0, controller = null;
            
            const stripHtml = (html) => {
                const tmp = document.createElement('DIV');
                tmp.innerHTML = html;
                return tmp.textContent || tmp.innerText || '';
            };

            input.addEventListener('input', () => {
                const requestGeneration = ++generation; controller?.abort();
                input.removeAttribute('aria-activedescendant');
                codeInput.value = ''; 
                validatedInput.value = 'false';
                statusBox.innerHTML = '<span class="muted">Buscando en la base de la OMS...</span>';
                
                clearTimeout(timer); 
                const q = input.value.trim();
                
                if(q.length < 3) { 
                    resultsBox.classList.add('hidden'); input.setAttribute('aria-expanded','false'); input.removeAttribute('aria-activedescendant'); 
                    statusBox.innerHTML = '<span class="muted">Escribe al menos 3 letras para buscar</span>';
                    return; 
                }
                
                timer = setTimeout(async () => {
                    try {
                        const workerUrl = `https://nurseflow-api.carlosb-n.workers.dev/icd/search?q=${encodeURIComponent(q)}&includeKeywordMatches=true`;
                        controller = new AbortController();
                        const r = await fetch(workerUrl, { signal:controller.signal, headers: { 'Accept-Language': 'es' } });
                        if (!r.ok) throw new Error('Error en la petición');
                        
                        const data = await r.json();
                        if(requestGeneration !== generation || !input.isConnected) return;
                        const items = data.destinationEntities || [];
                        
                        if (items.length === 0) {
                            resultsBox.innerHTML = '<div class="empty-state small p-16px-0">No se encontraron diagnósticos en CIE-11</div>';
                            resultsBox.classList.remove('hidden');
                            statusBox.innerHTML = '<span class="muted">Código no encontrado</span>';
                            return;
                        }

                        let html = '';
                        items.slice(0, 10).forEach(item => {
                            const code = item.theCode || 'S/C';
                            const richTitle = item.title || 'Diagnóstico sin título';
                            const cleanTitle = stripHtml(richTitle); 
                            
                            let clinicalContext = '';
                            if (item.matchingPVs && item.matchingPVs.length > 0) {
                                const synonymMatch = item.matchingPVs.find(pv => pv.propertyId === 'Synonym' || pv.propertyId === 'TitleOfOtherEntity');
                                if (synonymMatch) {
                                    const cleanSynonym = stripHtml(synonymMatch.label);
                                    if (cleanSynonym.toLowerCase() !== cleanTitle.toLowerCase()) {
                                        clinicalContext = `<div class="sub text-caption text-text-muted mt-2px">↳ Incluye: <i>${esc(cleanSynonym)}</i></div>`;
                                    }
                                }
                            }

                            html += `
                                <button type="button" class="list-row clickable align-left p-10px height-auto min-height-54px items-flex-start" data-icdcode="${esc(code)}" data-icdtitle="${esc(cleanTitle)}">
                                    <span class="pill primary min-width-65px align-center weight-bold text-small mt-2px">${esc(code)}</span>
                                    <div class="grow ml-3 line-height-1-3 min-width-0">
                                        <strong class="text-small display-block white-space-normal word-wrap-break-word">${esc(cleanTitle)}</strong>
                                        ${clinicalContext}
                                    </div>
                                </button>
                            `;
                        });
                        
                        resultsBox.innerHTML = html;
                        resultsBox.classList.remove('hidden');
                        statusBox.innerHTML = '<span class="muted">Selecciona el diagnóstico clínico más preciso:</span>';
                        
                        

                        resultsBox.querySelectorAll('[data-icdcode]').forEach(b => {
                            b.onclick = () => {
                                const title = b.dataset.icdtitle;
                                input.value = title;
                                codeInput.value = b.dataset.icdcode;
                                validatedInput.value = 'true';
                                statusBox.innerHTML = '<span class="text-success">✓ Código validado: <strong>' + esc(b.dataset.icdcode) + '</strong></span>';
                                resultsBox.classList.add('hidden'); input.setAttribute('aria-expanded','false'); input.removeAttribute('aria-activedescendant');

                                // Auto-generar plantilla narrativa para ahorrar tiempo
                                if (contextInput && contextInput.value.trim() === '') {
                                    const tLow = title.toLowerCase();
                                    let template = `Paciente ingresa por cuadro de ${title} de [X] días de evolución. Constantes vitales al ingreso: TA [X], FC [X], SatO2 [X]%, Tª [X]ºC. Portador de VVP en [EESS]. Pendiente de evolución.`;

                                    if (tLow.match(/neumonía|respiratori|asma|epoc|bronq|disnea/)) {
                                        template = `Paciente ingresa por cuadro de disnea y aumento de trabajo respiratorio asociado a ${title}. Eupneico en reposo con O2 en gafas nasales a [X] lpm. Auscultación: [crepitantes/sibilancias]. Portador de VVP en [EESS]. Se inicia antibioterapia/aerosolterapia pautada.`;
                                    } else if (tLow.match(/cardíac|corazon|infarto|coronari|angina|arritmia|fibrilaci/)) {
                                        template = `Paciente ingresa por [descompensación / dolor torácico] asociado a ${title}. Tensión arterial: [X]. Frecuencia cardíaca: [X] lpm. A la exploración: [ausencia/presencia] de edemas periféricos. Portador de VVP en [EESS]. Control estricto de diuresis y balance hídrico.`;
                                    } else if (tLow.match(/urinari|renal|nefritis|pielonefritis|infecci/)) {
                                        template = `Paciente ingresa por cuadro compatible con ${title}. Pico febril de [X]ºC. Se recogen cultivos previo a inicio de antibioterapia empírica IV. Portador de VVP en [EESS]. Control de constantes por riesgo de sepsis.`;
                                    } else if (tLow.match(/fractura|traumatis|cadera|luxaci/)) {
                                        template = `Paciente ingresa tras caída casual con diagnóstico de ${title}. Presenta dolor, impotencia funcional y deformidad en [Zona]. Exploración neurovascular distal conservada. Portador de VVP en [EESS]. Analgesia pautada. Reposo en cama, pendiente de valoración traumatológica/quirúrgica.`;
                                    } else if (tLow.match(/digestiv|gastro|vómito|diarrea|abdomin|apendicitis/)) {
                                        template = `Paciente ingresa por [dolor abdominal / vómitos / deposiciones diarreicas] secundario a ${title}. Abdomen blando y depresible. Dieta [absoluta/blanda]. Portador de VVP con fluidoterapia de mantenimiento a [X] ml/h. Tolerancia oral pendiente de valorar.`;
                                    } else if (tLow.match(/neurológic|ictus|cerebral|acv|convuls/)) {
                                        template = `Paciente con alteración neurológica por ${title}. Glasgow: [15]. Pupilas isocóricas y normorreactivas. Portador de VVP en [EESS]. Dieta triturada por riesgo de broncoaspiración. Escala Norton/Barthel [X]. Precisa ayuda total para ABVD.`;
                                    }

                                    contextInput.value = template;
                                    
                                    contextInput.classList.add('template-highlight');
                                    setTimeout(() => contextInput.classList.remove('template-highlight'), 600);
                                }
                            };
                        });
                        
                    } catch(e) {
                        if(e.name === 'AbortError' || requestGeneration !== generation || !input.isConnected) return;
                        resultsBox.innerHTML = `<div class="notice danger">Error al conectar con el servidor CIE-11.</div>`;
                        resultsBox.classList.remove('hidden');
                        statusBox.innerHTML = '<span class="muted">Sin conexión</span>';
                    }
                }, 400); 
            });
        }

        document.addEventListener('click', async (e) => {
            state.lastActive = Date.now();
            const navBtn = e.target.closest('.nav-item');
            if (navBtn) state.route = navBtn.dataset.route;

            const actionBtn = e.target.closest('[data-action]');
            if (!actionBtn) return;
            
            const action = actionBtn.dataset.action;
            const val = actionBtn.dataset.val;
            const id = actionBtn.dataset.id;
            const view = actionBtn.dataset.view;
            if (action === 'startTutorial') {
                await Tutorial.open(true);
                return;
            }

            if (action === 'goRoute') { state.slideOverOpen=false; state.route = val; }
            else if (action === 'calPrev') {
                const d = new Date(state.calendarViewDate + 'T12:00:00');
                if (state.calendarMode === 'week') d.setDate(d.getDate() - 7);
                else d.setMonth(d.getMonth() - 1);
                state.calendarViewDate = d.toISOString().slice(0, 10);
                renderView();
            }
            else if (action === 'calNext') {
                const d = new Date(state.calendarViewDate + 'T12:00:00');
                if (state.calendarMode === 'week') d.setDate(d.getDate() + 7);
                else d.setMonth(d.getMonth() + 1);
                state.calendarViewDate = d.toISOString().slice(0, 10);
                renderView();
            }
            else if (action === 'calToggle') {
                state.calendarMode = state.calendarMode === 'week' ? 'month' : 'week';
                renderView();
            }
            else if (action === 'calSelect') {
                state.calendarSelectedDate = val;
                renderView();
            }
            else if (action === 'openSlide') {
                const rawTitle = actionBtn.querySelector('strong')?.textContent || actionBtn.getAttribute('aria-label') || actionBtn.textContent;
                const cleanTitle = rawTitle.replace(/\s+/g, ' ').trim() || 'Detalle';
                UI.openSlide(view, cleanTitle, id);
            }
            else if (action === 'closeSlideOver') state.slideOverOpen = false;
            else if (action === 'toggleGloves') { state.settings.glovesMode = !state.settings.glovesMode; document.documentElement.classList.toggle('gloves-mode',state.settings.glovesMode); ClinicalUI.enhance(); saveSettings(); UI.toast(state.settings.glovesMode ? 'Modo Guantes activado' : 'Modo Guantes desactivado'); }
            else if (action === 'toggleReadOnly') { state.readOnlyMode = !state.readOnlyMode; UI.toast(state.readOnlyMode ? 'Modo Solo Lectura activado' : 'Modo Edición habilitado'); }
            else if (action === 'deleteClass') { if(await UI.confirm('Borrar', '¿Eliminar clase?')) { await NurseDB.remove('schedule', id); state.slideOverOpen=false; renderView(); } }
            else if (action === 'deleteEx') { 
                const ex = await NurseDB.get('exceptions', id);
                if (ex) {
                    if (ex.type === 'Cancelación') {
                        // Restaurar una clase suspendida (borramos la cancelación)
                        await NurseDB.remove('exceptions', id);
                        UI.toast('Clase restaurada', 'success');
                    } else if (ex.type === 'Festivo Anulado') {
                        // Restaurar un festivo que habíamos anulado
                        ex.type = 'Festivo';
                        await NurseDB.put('exceptions', ex);
                        UI.toast('Festivo restaurado', 'success');
                    } else if (ex.type === 'Festivo') {
                        // Anular festivo (borrado suave) para que aparezcan las clases ese día
                        ex.type = 'Festivo Anulado';
                        await NurseDB.put('exceptions', ex);
                        UI.toast('Festivo anulado. Tus clases vuelven a ser visibles.', 'info');
                    } else {
                        // Si es un Examen u "Otro", borramos normalmente de forma permanente
                        if (await UI.confirm('Eliminar', '¿Eliminar este evento permanentemente?', 'Eliminar', true)) {
                            await NurseDB.remove('exceptions', id);
                            UI.toast('Eliminado', 'info');
                        } else return;
                    }
                    renderView();
                    // Si tenemos abierto el panel lateral de Excepciones, lo refrescamos
                    if (state.slideOverOpen && state.slideOverView === 'exceptions') {
                        renderSlideOverContent('exceptions');
                    }
                }
            }
            else if (action === 'cancelClassDate') {
                const classTitle = actionBtn.dataset.title;
                if(await UI.confirm('Suspender clase', `¿Marcar "${classTitle}" como suspendida/cancelada solo para el día ${dateFmt(state.calendarSelectedDate)}?`, 'Sí, suspender', true)) {
                    await NurseDB.put('exceptions', {
                        id: uid(), 
                        date: state.calendarSelectedDate, 
                        type: 'Cancelación', 
                        classId: id,
                        title: `Clase suspendida: ${classTitle}`
                    });
                    renderView();
                    UI.toast('Clase suspendida para esta fecha');
                }
            }
            else if (action === 'deleteTask') { await NurseDB.remove('tasks', id); state.slideOverOpen=false; renderView(); }
            else if (action === 'deleteCase') { if(await UI.confirm('Peligro', '¿Eliminar caso clínico permanentemente?', 'Borrar', true)) { await NurseDB.remove('cases', id); state.slideOverOpen=false; renderView(); } }
            else if (action === 'deleteMed') { await NurseDB.remove('meds', id); state.slideOverOpen=false; renderView(); UI.toast('Eliminado'); }
            else if (action === 'deleteCard') { await NurseDB.remove('flashcards', id); state.slideOverOpen=false; renderView(); }
            else if (action === 'createCardFromTag') { await NurseDB.put('flashcards', {id:uid(), q:`Repasar: ${val}`, a:'Completa esta tarjeta con apuntes fiables.', topic:'Prácticum', due:getLocalISOToday(), ease:2.5, interval:0, reps:0}); actionBtn.classList.add('primary'); UI.toast('Flashcard creada'); }
            
            else if (action === 'openMedRemote') {
                const m = JSON.parse(actionBtn.dataset.json);
                UI.alert('Cargando...', 'Descargando ficha técnica oficial...');
                try {
                    const bundle = await fetchCIMAData(m.registration); 
                    const d = bundle.med||m.raw||{}; 
                    const s = bundle.seg||[];
                    
                    const active = (d.principiosActivos||[]).map(p=>`${p.nombre} ${p.cantidad||''} ${p.unidad||''}`).join(', ') || m.active || 'No especificado';
                    
                    const info = { 
                        indicaciones: extractCIMASection(s, '4.1'), 
                        posology: extractCIMASection(s,'4.2'), 
                        incompatibilities: extractCIMASection(s,'6.2'), 
                        handling: extractCIMASection(s,'6.6'), 
                        contraindications: extractCIMASection(s,'4.3'), 
                        warnings: extractCIMASection(s,'4.4'), 
                        interactions: extractCIMASection(s,'4.5'), 
                        adverse: extractCIMASection(s,'4.8'), 
                        storage: extractCIMASection(s,'6.4') 
                    };
                    
                    const block = (title, text, danger=false) => text ? `<div class="clinical-section ${danger?'critical':''}"><h3>${danger ? '⚠ ' : ''}${title}</h3><p>${esc(text)}</p></div>` : '';
                    
                    const html = `
                        <div class="card">
                            <div class="sub muted">CIMA Registro ${m.registration}</div>
                            <h3 class="text-page mb-2">${esc(d.nombre||m.name)}</h3>
                            <div class="bg-color-mix-in-srgb-primary-10-transparent p-3 border-radius-radius-sm border-left-4px-solid-primary">
                                <strong class="text-primary display-block mb-1">Principio Activo:</strong>
                                <span>${esc(active)}</span>
                            </div>
                        </div>
                        ${block('Alergias y Contraindicaciones (FT 4.3)', info.contraindications, true)}
                        ${block('Advertencias y precauciones (FT 4.4)', info.warnings, true)}
                        ${block('Posología (FT 4.2)', info.posology)}
                        ${block('Interacciones (FT 4.5)', info.interactions)}
                        ${block('Reacciones Adversas (FT 4.8)', info.adverse)}
                        ${block('Incompatibilidades (FT 6.2)', info.incompatibilities)}
                        ${block('Conservación (FT 6.4)', info.storage)}
                        ${block('Manipulación (FT 6.6)', info.handling)}
                        ${block('Para qué se usa (Indicaciones FT 4.1)', info.indicaciones)}
                        
                        <div class="display-flex gap-2 mt-6 position-sticky bottom-0 pt-4 bg-bg-card">
                            <button class="btn flex-1" id="closeModCima">Cerrar</button>
                            <button class="btn primary flex-2" id="saveMedLocal">★ Guardar Offline</button>
                        </div>`;
                    
                    $('#modalTitle').textContent = 'Ficha Técnica AEMPS'; 
                    $('#modalBody').innerHTML = html; 
                    $('#modalActions').innerHTML = '';
                    
                    $('#closeModCima').onclick = () => $('#modalOverlay').classList.remove('open');
                    $('#saveMedLocal').onclick = async () => {
                        await NurseDB.put('meds', {id: String(m.registration), name: d.nombre||m.name, registration: m.registration, active, clinical: info, savedAt: new Date().toISOString()});
                        $('#modalOverlay').classList.remove('open'); UI.toast('Guardado en Botiquín Local'); renderView();
                    };
                } catch(e) { UI.alert('Error', 'No se pudo cargar la ficha desde CIMA. Comprueba tu conexión.'); }
            }
        });

        const saveSettings = async () => { await NurseDB.put('settings', {id: 'main', value: state.settings}); };
        
        $('#fileImport').onchange = async e => {
            const f = e.target.files?.[0]; if(!f) return;
            try { const data = JSON.parse(await f.text()); if(await UI.confirm('Importar', 'Esto sobreescribirá todos tus datos actuales.', 'Importar', true)) { await NurseDB.importAll(data); location.reload(); } }
            catch(err) { UI.toast('Archivo inválido'); } finally { e.target.value=''; }
        };

        const initLockScreen = () => {
            if (!state.settings.lockEnabled) { renderView(); return; }
            state.unlocked = false; $('#appLock').classList.remove('hidden');
            if (state.settings.lockMethod === 'pin') {
                let pin = ''; const draw = () => $('#pinDots').textContent = '•'.repeat(pin.length);
                $('#pinGrid').innerHTML = [1,2,3,4,5,6,7,8,9,'C',0,'OK'].map(x => `<button data-pin="${x}">${x}</button>`).join('');
                $('#pinGrid').onclick = async e => {
                    if(e.target.tagName !== 'BUTTON') return; const v = e.target.dataset.pin;
                    if(v === 'C') pin = pin.slice(0,-1);
                    else if(v === 'OK') { if(await hashText(pin) === state.settings.pinHash) unlock(); else { pin = ''; $('#lockMsg').textContent = 'PIN Incorrecto (Mín 6 dígitos)'; $('#lockMsg').classList.add('text-danger'); } }
                    else if(pin.length < 8) pin += v; draw();
                };
            } else {
                $('#pinDots').classList.add('hidden'); $('#pinGrid').classList.add('hidden'); $('#bioUnlockBtn').classList.remove('hidden');
                $('#bioUnlockBtn').onclick = async () => {
                    try { const raw = Uint8Array.from(atob(state.settings.credentialId||''), c=>c.charCodeAt(0)); await navigator.credentials.get({publicKey:{challenge:crypto.getRandomValues(new Uint8Array(32)),allowCredentials:[{type:'public-key',id:raw}],userVerification:'required'}}); unlock(); }
                    catch(e) { UI.toast('Fallo biométrico'); }
                };
            }
        };
        const unlock = () => { state.unlocked = true; state.lastActive = Date.now(); $('#appLock').classList.add('hidden'); renderView(); };

        setInterval(() => { if(state.settings.lockEnabled && state.unlocked && state.settings.autoLock > 0 && (Date.now() - state.lastActive > state.settings.autoLock * 60000)) initLockScreen(); }, 10000);

        const Tutorial = (() => {
    const steps = [
        'Bienvenida',
        'Perfil',
        'Clases',
        'Tareas',
        'Prácticas',
        'Preferencias',
        'Cómo usar NurseFlow'
    ];

    const days = [
        'Domingo', 'Lunes', 'Martes', 'Miércoles',
        'Jueves', 'Viernes', 'Sábado'
    ];

    let step = 0;
    let schedule = [];
    let tasks = [];
    let editing = null;
    let busy = false;

    const root = () => $('#onboardingView');

    const field = (
        name, label, value = '', type = 'text', required = false
    ) => `
        <label for="tour-${name}">${esc(label)}</label>
        <input
            class="field"
            id="tour-${name}"
            name="${name}"
            type="${type}"
            value="${esc(value)}"
            ${required ? 'required' : ''}
        >
    `;

    const button = (action, text, extra = '') => `
        <button
            type="button"
            class="btn"
            data-tour="${action}"
            ${extra}
        >${esc(text)}</button>
    `;

    async function settings(changes) {
        const value = { ...state.settings, ...changes };

        await NurseDB.put('settings', {
            id: 'main',
            value
        });

        state.settings = value;
    }

    function notice(message) {
        $('#tourError').textContent = message;
    }

    async function run(fn) {
        if (busy) return;
        busy = true;

        const controls = [
            ...root().querySelectorAll('button,input,select,textarea')
        ];

        const disabled = controls.map(el => el.disabled);

        controls.forEach(el => {
            if (el.tagName === 'BUTTON') el.disabled = true;
        });

        try {
            notice('');
            await fn();
        } catch (e) {
            notice(
                e.message ||
                'No se pudieron guardar los cambios. Inténtalo de nuevo.'
            );
        } finally {
            controls.forEach((el, i) => {
                el.disabled = disabled[i];
            });
            busy = false;
        }
    }

    function body() {
        const s = state.settings;

        if (step === 0) return `
            <p>
                Vamos a preparar NurseFlow para tu día a día.
                Podrás añadir tus clases, tareas y prácticas mientras
                conoces la aplicación.
            </p>

            <p>
                Los datos se guardan en este dispositivo.
                Las consultas de medicamentos y CIE-11 necesitan conexión.
            </p>

            <div class="notice">
                Uso académico y de apoyo. No sustituye protocolos,
                prescripción ni valoración clínica.
                No introduzcas nombres, SIP, cama u otros
                identificadores de pacientes.
            </div>

            <label class="check-row">
                <input
                    name="legal"
                    type="checkbox"
                    required
                    ${s.legalAccepted ? 'checked' : ''}
                >
                He leído y acepto el aviso de uso responsable.
            </label>
        `;

        if (step === 1) return `
            <p>
                Estos datos personalizan la pantalla Hoy
                y tu perfil académico.
            </p>

            ${field('name', 'Tu nombre (opcional)', s.profileName)}

            ${field(
                'uni',
                'Universidad o centro de formación',
                s.university,
                'text',
                true
            )}

            <label for="tour-course">Curso</label>
            <select class="field" name="course" id="tour-course">
                ${[1, 2, 3, 4].map(n => `
                    <option
                        value="${n}"
                        ${String(s.courseNumber) === String(n)
                            ? 'selected' : ''}
                    >${n}º Enfermería</option>
                `).join('')}
            </select>
        `;

        if (step === 2) {
            const c = schedule.find(x => x.id === editing);

            const isUCV = /ucv|cat[óo]lica de valencia/i.test(s.university);
            let titleFieldHtml = field('title', 'Asignatura o actividad', c?.title || '');
            
            if (isUCV) {
                let opts = '<option value="">Selecciona asignatura...</option>';
                for (const [cNum, subs] of Object.entries(NURSE_DATA.ucv.subjects)) {
                    // Excluimos las asignaturas de practicum del horario regular
                    const classSubs = subs.filter(s => !s[1].toLowerCase().includes('practicum'));
                    if (classSubs.length > 0) {
                        opts += `<optgroup label="${cNum}º Curso">`;
                        classSubs.forEach(sub => {
                            const selected = c?.title === sub[1] ? 'selected' : '';
                            opts += `<option value="${esc(sub[1])}" ${selected}>${esc(sub[1])}</option>`;
                        });
                        opts += `</optgroup>`;
                    }
                }
                const isCustom = c?.title && !Object.values(NURSE_DATA.ucv.subjects).flat().filter(s => !s[1].toLowerCase().includes('practicum')).some(sub => sub[1] === c.title);
                opts += `<option value="__custom" ${isCustom ? 'selected' : ''}>Otra actividad...</option>`;

                titleFieldHtml = `
                    <label>Asignatura (UCV)</label>
                    <select class="field" name="titleSelect" id="tour-title-select">
                        ${opts}
                    </select>
                    <input class="field ${isCustom ? '' : 'hidden'}" id="tour-title" name="title" placeholder="Nombre de la actividad" value="${esc(c?.title || '')}">
                `;
            }

            return `
                <p>
                    Añade una asignatura o actividad y marca los días
                    en los que se repite cada semana.
                    El calendario y Hoy utilizarán este horario.
                </p>

                ${titleFieldHtml}

                ${field('room', 'Aula (opcional)', c?.room || '')}

                <fieldset>
                    <legend>Días de la semana</legend>
                    <div class="tour-days">
                        ${[1, 2, 3, 4, 5, 6, 0].map(n => `
                            <label>
                                <input
                                    type="checkbox"
                                    name="days"
                                    value="${n}"
                                    ${c && Number(c.day) === n
                                        ? 'checked' : ''}
                                >
                                ${days[n]}
                            </label>
                        `).join('')}
                    </div>
                </fieldset>

                <div class="tour-columns">
                    ${field(
                        'start', 'Hora de inicio',
                        c?.start || '09:00', 'time'
                    )}
                    ${field(
                        'end', 'Hora de fin',
                        c?.end || '11:00', 'time'
                    )}
                </div>

                ${button(
                    'class',
                    c ? 'Guardar cambios de la clase' : 'Añadir clase'
                )}

                ${c ? button('cancelEdit', 'Cancelar edición') : ''}

                <h3>Clases configuradas (${schedule.length})</h3>

                <div class="tour-list">
                    ${schedule.map(x => `
                        <div>
                            <strong>${esc(x.title)}</strong>
                            <p>
                                ${days[Number(x.day)]} ·${esc(x.start)}–${esc(x.end)}${esc(x.room || '')}
                            </p>

                            ${button(
                                'edit', 'Editar',
                                `data-id="${esc(x.id)}"`
                            )}

                            ${button(
                                'deleteClass', 'Eliminar',
                                `data-id="${esc(x.id)}"`
                            )}
                        </div>
                    `).join('') || `
                        <p>
                            Aún no hay clases. Puedes configurarlas ahora
                            o más adelante desde Universidad.
                        </p>
                    `}
                </div>
            `;
        }

        if (step === 3) return `
            <p>
                Las tareas aparecerán en Hoy y las que tengan fecha
                también en el calendario. Puedes añadir entregas,
                exámenes o recordatorios.
            </p>

            ${field('task', 'Primera tarea (opcional)')}
            ${field('due', 'Fecha límite (opcional)', '', 'date')}

            ${button('task', 'Añadir tarea')}

            <h3>
                Tareas pendientes (${tasks.filter(t => !t.done).length})
            </h3>

            <div class="tour-list">
                ${tasks.filter(t => !t.done).map(t => `
                    <div>
                        <strong>${esc(t.title)}</strong>
                        <p>${t.due ? esc(dateFmt(t.due)) : 'Sin fecha'}</p>
                        ${button(
                            'deleteTask', 'Eliminar',
                            `data-id="${esc(t.id)}"`
                        )}
                    </div>
                `).join('') || '<p>No hay tareas pendientes.</p>'}
            </div>
        `;

        if (step === 4) {
            const isUCV = /ucv|cat[óo]lica de valencia/i.test(s.university);
            let practicumFieldHtml = field(
                'practicum', 'Asignatura de prácticas',
                s.practicum, 'text', true
            );

            if (isUCV) {
                let practicums = [];
                for (const subs of Object.values(NURSE_DATA.ucv.subjects)) {
                    practicums.push(...subs.filter(sub => sub[1].toLowerCase().includes('practicum')).map(sub => sub[1]));
                }
                let opts = '<option value="">Selecciona Prácticum...</option>';
                practicums.forEach(p => {
                    const selected = s.practicum === p ? 'selected' : '';
                    opts += `<option value="${esc(p)}" ${selected}>${esc(p)}</option>`;
                });
                
                practicumFieldHtml = `
                    <label for="tour-practicum">Asignatura de prácticas</label>
                    <select class="field" name="practicum" id="tour-practicum" required>
                        ${opts}
                    </select>
                `;
            }

            return `
            <p>
                Configura prácticas si tienes un periodo asignado.
                Puedes dejarlas desactivadas y añadirlas después
                desde Ajustes.
            </p>

            <label class="check-row">
                <input
                    type="checkbox"
                    name="has"
                    id="tour-has"
                    ${s.hasPracticum ? 'checked' : ''}
                >
                Tengo prácticas asignadas
            </label>

            <fieldset
                id="tour-prac"
                ${s.hasPracticum ? '' : 'disabled'}
            >
                ${practicumFieldHtml}

                ${field(
                    'hospital', 'Hospital o centro',
                    s.hospital, 'text', true
                )}

                ${field(
                    'service', 'Servicio o unidad (opcional)',
                    s.service
                )}

                ${field(
                    'from', 'Fecha de inicio',
                    s.periodStart, 'date', true
                )}

                ${field(
                    'to', 'Fecha de finalización',
                    s.periodEnd, 'date', true
                )}
            </fieldset>
        `};

        if (step === 5) return `
            <label for="tour-theme">Apariencia</label>

            <select class="field" name="theme" id="tour-theme">
                ${[
                    ['system', 'Automático'],
                    ['light', 'Claro'],
                    ['dark', 'Oscuro']
                ].map(([v, t]) => `
                    <option
                        value="${v}"
                        ${s.theme === v ? 'selected' : ''}
                    >${t}</option>
                `).join('')}
            </select>

            <label class="check-row">
                <input
                    type="checkbox"
                    name="gloves"
                    ${s.glovesMode ? 'checked' : ''}
                >
                Modo guantes: controles más grandes
            </label>

            <label class="check-row">
                <input
                    type="checkbox"
                    name="warnings"
                    ${s.showClinicalWarnings ? 'checked' : ''}
                >
                Mostrar avisos de uso clínico
            </label>

            <p>
                En Ajustes → Privacidad puedes configurar PIN o biometría.
                En Ajustes → Base de Datos puedes exportar
                una copia de seguridad.
            </p>
        `;

        return `
            <p>
                Tu configuración está preparada.
                Así puedes utilizar cada sección:
            </p>

            <div class="tour-list">
                ${[
                    [
                        'Hoy',
                        'Consulta clases del día y pendientes; durante las prácticas puedes registrar tu jornada.'
                    ],
                    [
                        'Universidad',
                        'Consulta semana o mes. Toca un día para añadir o editar clases, tareas y excepciones. “Suspender hoy” cancela una clase solo en esa fecha.'
                    ],
                    [
                        'Prácticas',
                        'Registra casos anonimizados y tu asistencia. Los procedimientos alimentan el portfolio; marca casos para la memoria final.'
                    ],
                    [
                        'La Batea',
                        'Busca técnicas, materiales y notas. Verifica siempre el protocolo de tu unidad.'
                    ],
                    [
                        'Estudio',
                        'Crea tarjetas, repasa las pendientes y practica los test disponibles.'
                    ],
                    [
                        'Consulta',
                        'Busca medicamentos en CIMA, patologías CIE-11 y calculadoras. Los medicamentos guardados se pueden consultar sin conexión.'
                    ],
                    [
                        'Ajustes',
                        'Modifica tu perfil, prácticas, apariencia y privacidad. Vuelve a abrir este asistente cuando lo necesites.'
                    ]
                ].map(([t, p]) => `
                    <div>
                        <h3>${esc(t)}</h3>
                        <p>${esc(p)}</p>
                    </div>
                `).join('')}
            </div>

            <h3>Tu configuración</h3>
            <p>${esc(s.university)} · ${esc(s.course)}</p>
            <p>
                ${schedule.length} clases ·
                ${tasks.filter(t => !t.done).length} tareas pendientes ·
                Prácticas ${s.hasPracticum ? 'activadas' : 'desactivadas'}
            </p>

            <p>
                Antes de cambiar de dispositivo, exporta una
                copia de seguridad desde Ajustes.
            </p>
        `;
    }

    function render() {
        root().innerHTML = `
            <div class="tour-shell">
                <p class="muted">
                    Asistente de NurseFlow ·
                    Paso ${step + 1} de ${steps.length}
                </p>

                <progress
                    max="${steps.length}"
                    value="${step + 1}"
                    aria-label="Progreso del asistente"
                ></progress>

                <h1 id="tourHeading" tabindex="-1">${steps[step]}</h1>

                <form id="obForm" class="card">
                    ${body()}

                    <p
                        id="tourError"
                        class="form-error"
                        role="alert"
                    ></p>

                    <div class="tour-actions">
                        ${step ? button('back', 'Anterior') : ''}

                        <button type="submit" class="btn primary">
                            ${step === steps.length - 1
                                ? 'Terminar y abrir NurseFlow'
                                : 'Guardar y continuar'}
                        </button>
                    </div>

                    ${state.settings.legalAccepted
                        ? button(
                            'later',
                            'Guardar y continuar más tarde'
                        )
                        : ''}
                </form>
            </div>
        `;

        root().scrollTop = 0;
        $('#tourHeading').focus();

        const sel = $('#tour-title-select');
        const inp = $('#tour-title');
        if (sel && inp) {
            const update = () => {
                if (sel.value === '__custom') {
                    inp.classList.remove('hidden');
                    if (inp.value === '__custom') inp.value = '';
                } else {
                    inp.classList.add('hidden');
                    inp.value = sel.value;
                }
            };
            sel.addEventListener('change', update);
            if (!inp.value && sel.value !== '__custom') update();
        }

        $('#tour-has')?.addEventListener('change', e => {
            $('#tour-prac').disabled = !e.target.checked;
        });

        $('#obForm').onsubmit = e => {
            e.preventDefault();
            run(() => navigate(1));
        };

        root().onclick = e => {
            const b = e.target.closest('[data-tour]');
            if (!b) return;

            run(async () => {
                if (b.dataset.tour === 'back') {
                    return navigate(-1);
                }

                if (b.dataset.tour === 'later') {
                    await saveStep();
                    await settings({ tutorialStep: step });
                    close();
                    return;
                }

                if (b.dataset.tour === 'class') {
                    await saveClass(true);
                    render();
                    return;
                }

                if (b.dataset.tour === 'task') {
                    await saveTask(true);
                    render();
                    return;
                }

                if (b.dataset.tour === 'edit') {
                    await saveClass(false);
                    editing = b.dataset.id;
                    render();
                    return;
                }

                if (b.dataset.tour === 'cancelEdit') {
                    editing = null;
                    render();
                    return;
                }

                if (
                    b.dataset.tour === 'deleteClass' &&
                    window.confirm('¿Eliminar esta clase del horario?')
                ) {
                    await NurseDB.remove('schedule', b.dataset.id);

                    schedule = schedule.filter(
                        x => x.id !== b.dataset.id
                    );

                    if (editing === b.dataset.id) editing = null;
                    render();
                }

                if (
                    b.dataset.tour === 'deleteTask' &&
                    window.confirm('¿Eliminar esta tarea?')
                ) {
                    await NurseDB.remove('tasks', b.dataset.id);
                    tasks = tasks.filter(x => x.id !== b.dataset.id);
                    render();
                }
            });
        };
    }

    async function saveClass(required) {
        const f = new FormData($('#obForm'));
        let title = String(f.get('title') || '').trim();
        if (f.has('titleSelect') && f.get('titleSelect') !== '__custom') {
            title = String(f.get('titleSelect')).trim();
        }

        if (!title && !required && !editing) return;

        const selected = f.getAll('days').map(Number);
        const start = String(f.get('start') || '');
        const end = String(f.get('end') || '');

        if (!title || !selected.length || !start || !end) {
            throw new Error(
                'Completa la asignatura, los días y ambas horas.'
            );
        }

        if (end <= start) {
            throw new Error(
                'La hora final debe ser posterior a la inicial.'
            );
        }

        for (const day of selected) {
            const conflict = schedule.find(x =>
                x.id !== editing &&
                Number(x.day) === day &&
                start < x.end &&
                end > x.start
            );

            if (conflict) {
                throw new Error(
                    `Solapamiento el ${days[day]} con ` +
                    `${conflict.title} (${conflict.start}–${conflict.end}).`
                );
            }
        }

        const rows = selected.map((day, i) => ({
            id: editing && i === 0 ? editing : uid(),
            title,
            day,
            room: String(f.get('room') || '').trim(),
            start,
            end
        }));

        await NurseDB.bulkPut('schedule', rows);

        schedule = [
            ...schedule.filter(x => x.id !== editing),
            ...rows
        ];

        editing = null;

        $('#tour-title').value = '';
        $('#tour-room').value = '';

        $('#obForm').querySelectorAll('[name="days"]').forEach(x => {
            x.checked = false;
        });
    }

    async function saveTask(required) {
        const f = new FormData($('#obForm'));
        const title = String(f.get('task') || '').trim();

        if (!title && !required) return;
        if (!title) throw new Error('Escribe el título de la tarea.');

        const due = String(f.get('due') || '');

        if (tasks.some(t =>
            !t.done &&
            t.title.toLowerCase() === title.toLowerCase() &&
            (t.due || '') === due
        )) {
            throw new Error(
                'Esa tarea ya está en la lista de pendientes.'
            );
        }

        const row = {
            id: uid(),
            title,
            due,
            category: 'Universidad',
            done: false
        };

        await NurseDB.put('tasks', row);
        tasks.push(row);

        $('#tour-task').value = '';
        $('#tour-due').value = '';
    }

    async function saveStep() {
        const f = new FormData($('#obForm'));

        if (step === 0) {
            if (f.get('legal') !== 'on') {
                throw new Error('Acepta el aviso para continuar.');
            }

            await settings({
                legalAccepted: true,
                legalAcceptedAt:
                    state.settings.legalAcceptedAt ||
                    new Date().toISOString()
            });
        }

        if (step === 1) {
            await settings({
                profileName: String(f.get('name') || '').trim(),
                university: String(f.get('uni') || '').trim(),
                courseNumber: f.get('course'),
                course: `${f.get('course')}º Enfermería`
            });
        }

        if (step === 2) await saveClass(false);
        if (step === 3) await saveTask(false);

        if (step === 4) {
            const has = f.get('has') === 'on';
            const from = String(f.get('from') || '');
            const to = String(f.get('to') || '');

            if (has && from && to && to < from) {
                throw new Error(
                    'La finalización no puede ser anterior al inicio.'
                );
            }

            const changes = { hasPracticum: has };

            if (has) {
                Object.assign(changes, {
                    practicum: String(f.get('practicum') || '').trim(),
                    hospital: String(f.get('hospital') || '').trim(),
                    service: String(f.get('service') || '').trim(),
                    periodStart: from,
                    periodEnd: to
                });
            }

            await settings(changes);
        }

        if (step === 5) {
            await settings({
                theme: f.get('theme'),
                glovesMode: f.get('gloves') === 'on',
                showClinicalWarnings: f.get('warnings') === 'on'
            });

            document.documentElement.setAttribute(
                'data-theme',
                state.settings.theme
            );

            document.documentElement.classList.toggle(
                'gloves-mode',
                state.settings.glovesMode
            );
        }
    }

    async function navigate(delta) {
        if (delta > 0 && !$('#obForm').reportValidity()) return;

        if (
            delta > 0 &&
            step === 1 &&
            !$('#tour-uni').value.trim()
        ) {
            throw new Error(
                'Escribe la universidad o centro de formación.'
            );
        }

        await saveStep();

        if (step === steps.length - 1 && delta > 0) {
            await settings({
                onboardingComplete: true,
                tutorialCompleted: true,
                tutorialStep: 0
            });

            close();
            return;
        }

        const next = Math.max(
            0,
            Math.min(steps.length - 1, step + delta)
        );

        await settings({ tutorialStep: next });
        step = next;
        render();
    }

    function close() {
        root().classList.add('hidden');
        root().innerHTML = '';
        root().onclick = null;
        initLockScreen();
    }

    async function open(restart = false) {
        if (state.readOnlyMode) {
            return UI.toast(
                'Desactiva Solo lectura para configurar NurseFlow.',
                'info'
            );
        }

        try {
            [schedule, tasks] = await Promise.all([
                NurseDB.all('schedule'),
                NurseDB.all('tasks')
            ]);

            const saved = Number(state.settings.tutorialStep);

            step = (
                restart ||
                !state.settings.legalAccepted ||
                !Number.isInteger(saved)
            )
                ? 0
                : Math.max(0, Math.min(steps.length - 1, saved));

            editing = null;
            state.slideOverOpen = false;

            root().setAttribute('role', 'dialog');
            root().setAttribute('aria-modal', 'true');
            root().setAttribute('aria-labelledby', 'tourHeading');

            root().classList.remove('hidden');
            render();
        } catch (e) {
            UI.toast(
                'No se pudo abrir el asistente: ' + e.message,
                'error'
            );
        }
    }

    return { open };
    })();

        async function boot() {
            try {
                const saved = await NurseDB.get('settings', 'main');
                if (saved) state.settings = { ...state.settings, ...saved.value };
                
                document.documentElement.setAttribute('data-theme', state.settings.theme);
                if (state.settings.glovesMode) document.documentElement.classList.add('gloves-mode');

                if ((await NurseDB.all('procedures')).length === 0) await NurseDB.bulkPut('procedures', NURSE_DATA.procedures);
                if ((await NurseDB.all('quiz')).length === 0) await NurseDB.bulkPut('quiz', NURSE_DATA.quiz);

                if (
    !state.settings.onboardingComplete ||
    !state.settings.legalAccepted
) {
    await Tutorial.open();
} else {
    initLockScreen();
}
                // Arrancar el chequeo de autoguardado en segundo plano
                AutoBackup.run(false);
                if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
            } catch (e) {
                $('#app').innerHTML = UIHelpers.notice(`Fallo Crítico: ${e.message}`, false, true);
            }
        }

        document.addEventListener('DOMContentLoaded', boot);
