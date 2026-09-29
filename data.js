/**
 * NurseFlow static reference data.
 *
 * Clinical content in this file is intentionally limited to educational
 * checklists and navigation helpers. Medication-specific information is
 * retrieved from CIMA/AEMPS at runtime and cached locally when requested.
 */
window.NURSE_DATA = {
  /** UCV curriculum snapshot used to accelerate timetable setup. */
  ucv: {
    source: 'https://www.ucv.es/oferta-academica/facultades/facultad-de-medicina-y-ciencias-de-la-salud/grado-en-enfermeria#estudios',
    academicYear: '2026-2027',
    planByCourse: { '1': '2025', '2': '2025', '3': '2022', '4': '2022' },
    subjects: {
      '1': [
        ['1211101','Anatomía Humana y Funcional',1,6],
        ['1210104','Antropología',1,6],
        ['1211104','Bioquímica Clínica',1,6],
        ['1211108','Fundamentos en Enfermería',1,6],
        ['1211107','Psicología del Cuidado',1,6],
        ['1210105','Atención a la Salud de la Comunidad',2,6],
        ['1211103','Bioestadística y Metodología de la Investigación',2,6],
        ['1211105','Fisiología Humana',2,6],
        ['1211106','Inglés',2,6],
        ['1211109','Metodología Enfermera',2,6]
      ],
      '2': [
        ['1210206','Ciencia, Razón y Fe',1,6],
        ['1211206','Farmacología',1,6],
        ['1211203','Fisiopatología',1,6],
        ['1210204','Nutrición y Dietética',1,6],
        ['1210205','Cuidados a las Personas Mayores',2,6],
        ['1210201','Cuidados del Adulto I',2,6],
        ['1210202','Cuidados en la Infancia y Adolescencia',2,6],
        ['1210207','Moral Social-Deontología',2,6],
        ['1213203','Practicum I','Anual',12]
      ],
      '3': [
        ['1210308','Cuidados a las Mujeres',1,4.5],
        ['1210303','Cuidados del Adulto II',1,6],
        ['1210307','Cuidados Paliativos',1,6],
        ['1210301','Atención a la Salud de la Comunidad II',2,4.5],
        ['1210306','Legislación y Gestión de los Servicios de Enfermería',2,4.5],
        ['1213305','Practicum II','Anual',12],
        ['1213304','Practicum III','Anual',18],
        ['1212003','TICs',1,4.5]
      ],
      '4': [
        ['1210401','Cuidados en Salud Mental',1,6],
        ['1213403','Practicum IV','Anual',18],
        ['1213404','Practicum V','Anual',24],
        ['1214402','Trabajo Fin de Grado','Anual',6],
        ['1212001','Soporte Vital y Atención a la Urgencia',1,6]
      ]
    }
  },

  procedures: [
    ['higiene-manos','Higiene de manos',['Solución hidroalcohólica o agua y jabón según indicación'],['Aplicar la técnica indicada por el protocolo del centro.']],
    ['constantes','Toma de constantes',['Tensiómetro','Pulsioxímetro','Termómetro','Reloj/cronómetro'],['Verificar identidad y registrar según protocolo.']],
    ['glucemia','Glucemia capilar',['Glucómetro','Tira reactiva','Lanceta','Gasas','Guantes','Contenedor punzantes'],['Usar el dispositivo y procedimiento aprobado por la unidad.']],
    ['med-oral','Administración de medicación oral',['Medicación prescrita','Vaso/agua si procede','Guantes si procede'],['Comprobar prescripción, identidad, alergias y registro.']],
    ['med-sc','Administración subcutánea',['Medicación prescrita','Jeringa/dispositivo','Aguja si procede','Antiséptico según protocolo','Guantes','Contenedor punzantes'],['Verificar zona, técnica y registro según protocolo.']],
    ['med-im','Administración intramuscular',['Medicación prescrita','Jeringa','Aguja adecuada','Antiséptico según protocolo','Guantes','Contenedor punzantes'],['Seguir protocolo de localización y administración del centro.']],
    ['med-iv','Administración intravenosa',['Medicación prescrita','Material de preparación','Sistema de administración','Suero si procede','Guantes'],['Confirmar dilución, velocidad y compatibilidad en la ficha técnica/protocolo vigente antes de administrar.']],
    ['via-periferica','Canalización de vía periférica',['Guantes','Compresor','Antiséptico','Catéter venoso periférico','Gasas','Apósito','Alargadera/llave según unidad','Suero fisiológico','Contenedor punzantes'],['Mantener técnica aséptica y seguir protocolo de la unidad.']],
    ['extraccion','Extracción sanguínea',['Guantes','Compresor','Antiséptico','Aguja/sistema de extracción','Tubos prescritos','Gasas','Etiquetas','Contenedor punzantes'],['Confirmar tubos, orden y etiquetado según protocolo.']],
    ['hemocultivos','Hemocultivos',['Guantes','Antiséptico indicado','Frascos de hemocultivo','Sistema de extracción','Gasas','Etiquetas'],['Seguir estrictamente el protocolo local para antisepsia, volumen y secuencia.']],
    ['oxigenoterapia','Oxigenoterapia',['Fuente de oxígeno','Dispositivo prescrito','Pulsioxímetro'],['Administrar solo según prescripción/protocolo y vigilar respuesta.']],
    ['nebulizacion','Nebulización',['Nebulizador','Medicación prescrita','Fuente de aire/oxígeno según sistema','Mascarilla o boquilla'],['Preparar y administrar según prescripción y dispositivo.']],
    ['cura-heridas','Cura de heridas',['Guantes','Material estéril según cura','Suero/solución indicada','Gasas','Apósito','Contenedor de residuos'],['La técnica y productos dependen del tipo de herida y protocolo.']],
    ['cambio-aposito','Cambio de apósito',['Guantes','Material estéril','Solución indicada','Gasas','Apósito'],['Valorar la herida y documentar según protocolo.']],
    ['sondaje-vesical','Sondaje vesical',['Kit de sondaje','Sonda del calibre indicado','Lubricante','Antiséptico según protocolo','Bolsa colectora','Guantes estériles'],['Procedimiento invasivo: realizar solo con indicación, entrenamiento y supervisión adecuados.']],
    ['sondaje-ng','Sondaje nasogástrico',['Sonda','Lubricante','Guantes','Material de fijación','Jeringa adecuada','Sistema de comprobación según protocolo'],['Confirmar colocación con el método establecido por el centro antes de usarla.']],
    ['balance','Balance hídrico',['Hoja/app de registro','Recipientes graduados si procede'],['Registrar entradas y salidas según criterio de la unidad.']],
    ['ecg','ECG de 12 derivaciones',['Electrocardiógrafo','Electrodos','Material para preparar piel si procede'],['Colocar electrodos siguiendo el estándar y protocolo del centro.']],
    ['movilizacion','Movilización y transferencias',['Ayudas técnicas según necesidad','Calzado seguro','Personal de apoyo si procede'],['Valorar riesgo de caída y ergonomía antes de movilizar.']],
    ['upp','Prevención de lesiones por presión',['Superficie/ayudas según riesgo','Material de higiene e hidratación cutánea'],['Aplicar cambios posturales y medidas según valoración y protocolo.']],
    ['aspiracion','Aspiración de secreciones',['Sistema de aspiración','Sonda/catéter adecuado','Guantes','EPI según riesgo'],['Realizar solo con indicación y técnica protocolizada.']],
    ['traqueostomia','Cuidados de traqueostomía',['Guantes','Material estéril según protocolo','Gasas/apósito','Sistema de aspiración si precisa'],['Mantener vía aérea y técnica según protocolo específico.']],
    ['ostomia','Cuidados de ostomía',['Guantes','Dispositivo colector','Material de limpieza','Plantilla/medidor si procede'],['Valorar estoma y piel periestomal.']],
    ['enema','Administración de enema',['Producto prescrito','Guantes','Empapador','Lubricante'],['Confirmar indicación y contraindicaciones antes de realizar.']],
    ['nutricion-enteral','Nutrición enteral',['Fórmula prescrita','Sistema de administración','Bomba si procede','Jeringa adecuada'],['Confirmar posición/acceso, pauta y tolerancia según protocolo.']],
    ['insulina','Administración de insulina',['Insulina prescrita','Dispositivo/jeringa','Aguja','Glucómetro si procede','Contenedor punzantes'],['Doble comprobación y relación con glucemia/comida según protocolo.']],
    ['transfusion','Transfusión de hemoderivados',['Hemoderivado prescrito','Equipo específico','Acceso venoso','Material de monitorización'],['Procedimiento de alto riesgo: seguir identificación, compatibilidad y vigilancia del centro.']],
    ['muestras','Recogida de muestras',['Recipiente específico','Etiquetas','Guantes','Material de transporte'],['Comprobar tipo de muestra, condiciones y etiquetado.']],
    ['higiene-paciente','Higiene del paciente',['Material de higiene','Guantes','Ropa limpia','Material de protección de cama'],['Preservar intimidad, autonomía y seguridad.']],
    ['cambios-posturales','Cambios posturales',['Ayudas de movilización según necesidad','Almohadas/cojines'],['Aplicar según valoración y tolerancia.']]
  ],

  labs: [
    ['Hemoglobina','Hb','g/dL','Adultos: el rango depende de sexo, laboratorio y contexto clínico.','Hemograma'],
    ['Leucocitos','WBC','×10⁹/L','Aproximadamente 4–11 en muchos laboratorios; comprobar siempre el informe local.','Hemograma'],
    ['Plaquetas','PLT','×10⁹/L','Aproximadamente 150–450 en muchos laboratorios; puede variar.','Hemograma'],
    ['Sodio','Na⁺','mmol/L','Aproximadamente 135–145 en muchos laboratorios.','Bioquímica'],
    ['Potasio','K⁺','mmol/L','Aproximadamente 3,5–5,0 en muchos laboratorios.','Bioquímica'],
    ['Creatinina','Cr','mg/dL','Interpretar con edad, sexo, masa muscular y eGFR; usar el rango del laboratorio.','Bioquímica'],
    ['Glucosa','Gluc','mg/dL','La interpretación depende de ayuno, momento y situación clínica.','Bioquímica'],
    ['Proteína C reactiva','PCR','mg/L','El rango y la interpretación dependen del laboratorio y contexto.','Inflamación'],
    ['INR','INR','','Interpretar según indicación clínica y anticoagulación.','Coagulación'],
    ['pH arterial','pH','','Habitualmente alrededor de 7,35–7,45; interpretar junto con gasometría completa.','Gasometría']
  ],

  glossary: [
    ['SV','Signos vitales'],['SatO₂','Saturación periférica de oxígeno'],['TA','Tensión arterial'],['FC','Frecuencia cardiaca'],['FR','Frecuencia respiratoria'],
    ['PRN','Según necesidad / cuando sea necesario (según contexto de prescripción)'],['VO','Vía oral'],['IV','Vía intravenosa'],['IM','Vía intramuscular'],['SC','Vía subcutánea'],
    ['NPT','Nutrición parenteral total'],['SNG','Sonda nasogástrica'],['SVU','Sonda vesical urinaria'],['CVP','Catéter venoso periférico'],['CVC','Catéter venoso central'],
    ['EPOC','Enfermedad pulmonar obstructiva crónica'],['ICC','Insuficiencia cardiaca congestiva'],['PCR','Puede significar proteína C reactiva o parada cardiorrespiratoria según contexto'],['ACV','Accidente cerebrovascular'],['IAM','Infarto agudo de miocardio']
  ],

  quiz: [
    {id:'q1',topic:'Seguridad',q:'Antes de administrar una medicación, ¿qué principio es prioritario?',o:['Confirmar prescripción, identidad, alergias y vía','Prepararla con antelación sin revisar cambios','Administrarla si el paciente la reconoce','Usar siempre la misma dilución'],a:0,e:'La administración segura parte de verificar la prescripción vigente, la identidad, alergias y condiciones de administración.'},
    {id:'q2',topic:'Infección',q:'¿Cuándo debe priorizarse la higiene de manos?',o:['Solo al inicio del turno','Antes y después del contacto según los momentos indicados','Solo si se usan guantes','Únicamente tras técnicas invasivas'],a:1,e:'Los guantes no sustituyen la higiene de manos y esta se realiza en los momentos indicados.'},
    {id:'q3',topic:'Prácticum',q:'En esta app, ¿qué dato NO debe registrarse en un caso académico?',o:['Patología','Procedimiento observado','Nombre del paciente','Aprendizaje personal'],a:2,e:'El diario se ha diseñado para aprendizaje anonimizado, sin identificadores del paciente.'},
    {id:'q4',topic:'Cálculo',q:'Una bomba debe pasar 500 mL en 4 horas. ¿Qué velocidad corresponde?',o:['80 mL/h','100 mL/h','125 mL/h','200 mL/h'],a:2,e:'500 ÷ 4 = 125 mL/h.'},
    {id:'q5',topic:'Oxigenación',q:'Una lectura de pulsioximetría debe interpretarse junto con:',o:['Solo la edad','El contexto clínico y la calidad de la señal','El color del pulsioxímetro','La hora del día únicamente'],a:1,e:'La lectura aislada puede ser engañosa; el contexto y la calidad de señal son fundamentales.'},
    {id:'q6',topic:'Registro',q:'Si observas un procedimiento realizado por una enfermera, en el portfolio conviene marcarlo como:',o:['Realizado por mí','Observado','No registrarlo nunca','Realizado sin supervisión'],a:1,e:'El grado de participación debe reflejar lo ocurrido realmente.'},
    {id:'q7',topic:'Farmacología',q:'Si una ficha rápida de la app contradice el protocolo vigente de la unidad:',o:['Se usa la ficha de la app','Se ignora la prescripción','Se verifica la fuente oficial y el protocolo vigente','Se elige la opción más rápida'],a:2,e:'La app es apoyo académico; prevalecen la prescripción, ficha técnica, protocolos vigentes y supervisión clínica.'},
    {id:'q8',topic:'Escalas',q:'Una escala clínica automatizada en la app:',o:['Sustituye la valoración profesional','Debe utilizarse con el contexto clínico y la versión/protocolo correspondiente','Siempre determina un diagnóstico','No necesita comprobarse'],a:1,e:'El resultado orienta dentro del instrumento, pero no sustituye una valoración clínica completa.'},
    {id:'q9',topic:'Privacidad',q:'¿Cuál es el enfoque más seguro para el diario académico?',o:['Guardar iniciales y número de habitación','Guardar una foto de la hoja clínica','Registrar solo información anonimizada necesaria para aprender','Copiar la evolución completa'],a:2,e:'La minimización de datos reduce riesgos de confidencialidad.'},
    {id:'q10',topic:'Prácticum',q:'El registro personal de la app sobre asistencia:',o:['Sustituye UCVEvalúa','Es solo un recordatorio; el registro oficial sigue en la plataforma correspondiente','Lo valida automáticamente el hospital','Se envía a la universidad'],a:1,e:'NurseFlow no sustituye el registro oficial de la universidad o centro.'}
  ]
};
