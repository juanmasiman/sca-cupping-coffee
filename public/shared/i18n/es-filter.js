/* Spanish for filter. Keys are the English exactly as written in the code
   and markup; values are what a Spanish phone draws. See /shared/i18n.js.

   Keys of the form 'context|word' are read by ctx() in filter/app.js: one
   English word that is two in Spanish (Close the sheet, Close the valve).

   The vocabulary is held still on purpose: brew = preparación, pour =
   vertido, bloom = bloom, drawdown = drenado, window = ventana, grinder =
   molino, grind = molienda, ratio = proporción, current recipe = receta
   actual. The advice is read twice over a kettle; the same thing should
   always be called the same. */

(function () {
  /* "por debajo de el bloom" → "por debajo del bloom" */
  const de = w => ('de ' + w).replace(/^de el /, 'del ');

  LentoI18n.add({
    /* ---------- page ---------- */
    'Filter brew log — lento': 'Registro de filtrado — lento',
    'Keep the record of a pour-over: coffee, water, time, grind and the pour schedule, with what changed between one brew and the next.':
      'Lleva el registro de un pour-over: café, agua, tiempo, molienda y los vertidos, con lo que cambió de una preparación a la siguiente.',
    'All lento tools': 'Todas las herramientas de lento',
    'Your profile': 'Tu perfil',
    'Settings': 'Ajustes',
    'Close': 'Cerrar',
    'Close without saving': 'Cerrar sin guardar',
    'Done': 'Listo',
    'Save': 'Guardar',
    'Skip': 'Omitir',
    'About': 'Acerca de',
    'Undo': 'Deshacer',
    'Edit.': 'Editar.',
    'Next': 'Siguiente',

    /* ---------- board ---------- */
    'No coffee yet': 'Aún no hay café',
    'Unnamed coffee': 'Café sin nombre',
    'tap to add one': 'toca para añadir uno',
    'tap to name it': 'toca para ponerle nombre',
    'Log a brew': 'Registrar una preparación',
    'Start brewing': 'Empezar a preparar',
    'Continue the brew': 'Seguir con la preparación',
    '{n} brew': '{n} preparación',
    '{n} brews': '{n} preparaciones',
    'Aiming at': 'Objetivo',
    'Works with no signal and no account.': 'Funciona sin cobertura y sin cuenta.',
    'Works with no signal and no account. <button type="button" class="empty-link" data-signin>Sign in</button> only to carry your log between devices.':
      'Funciona sin cobertura y sin cuenta. <button type="button" class="empty-link" data-signin>Inicia sesión</button> solo para llevar tu registro entre dispositivos.',
    'Your profile, signed in as {who}': 'Tu perfil, con sesión iniciada como {who}',
    'Your profile, signed out': 'Tu perfil, sin sesión iniciada',
    'TDS added to every sheet': 'TDS añadido a todas las hojas',
    'No TDS field — change it any time in your setup': 'Sin campo de TDS — cámbialo cuando quieras en tu equipo',

    'What are you brewing on?': '¿Con qué preparas?',
    'Asked once, so the brew sheet only asks about what you can change.': 'Se pregunta una vez, para que la hoja de preparación solo pregunte por lo que puedes cambiar.',
    'Set up my kit': 'Configurar mi equipo',
    'Skip — a V60, a plain kettle, a scale': 'Omitir — una V60, un hervidor normal, una balanza',
    'Set to a V60 — change it in My setup': 'Configurado con una V60 — cámbialo en Mi equipo',
    'Nothing on the shelf': 'No hay nada en el estante',
    'Start brewing and name the coffee later, or add the bag first. Either way this becomes its board — every brew, what changed between them, and the recipe you settle on.':
      'Empieza a preparar y ponle nombre al café después, o añade primero la bolsa. De cualquier forma esto se convierte en su tablero: cada preparación, lo que cambió entre una y otra, y la receta con la que te quedes.',
    'Add the coffee first': 'Añadir primero el café',
    'Back where you left this brew': 'De vuelta donde dejaste esta preparación',

    /* where to start */
    'Where to start': 'Por dónde empezar',
    'at {temp}': 'a {temp}',
    'Bloom with {g}g': 'Bloom con {g} g',
    'pour to {g}g': 'vierte hasta {g} g',
    'pour to {g}g at {t}': 'vierte hasta {g} g en {t}',
    'Bloom with about {g}g and give it thirty to forty-five seconds, then pour the rest in two or three goes.':
      'Haz el bloom con unos {g} g y dale entre treinta y cuarenta y cinco segundos; luego vierte el resto en dos o tres tandas.',
    'Wet all the grounds first and give them thirty to forty-five seconds, then pour the rest in two or three goes.':
      'Moja primero todo el café molido y dale entre treinta y cuarenta y cinco segundos; luego vierte el resto en dos o tres tandas.',
    'Stir once when the water is in, leave it, and press or decant at the time you set.':
      'Remueve una vez cuando esté toda el agua, déjalo, y presiona o decanta en el tiempo que hayas fijado.',
    'Set the grinder wherever it is and brew one. If it is done well before {lo}, go finer; if it is still dripping after {hi}, go coarser.':
      'Deja el molino donde esté y prepara una. Si termina mucho antes de {lo}, ve más fino; si sigue goteando después de {hi}, ve más grueso.',
    'Grind is what changes the extraction here, not the clock: coarser if it comes out harsh, finer if it comes out sharp.':
      'Aquí lo que cambia la extracción es la molienda, no el reloj: más grueso si sale áspero, más fino si sale punzante.',
    'This is the log’s default. For a {roast} roast the bag points to {what}.':
      'Es el valor por defecto del registro. Para un tueste {roast}, la bolsa apunta a {what}.',
    'Start at {what}': 'Empezar en {what}',
    '{a} and {b}': '{a} y {b}',
    '{dose}g coffee to {water}g water (1:{ratio}){temp}, in {lo}–{hi}.': '{dose} g de café para {water} g de agua (1:{ratio}){temp}, en {lo}–{hi}.',
    'Aim for {lo}–{hi} from first pour to last drip{temp}.': 'Apunta a {lo}–{hi} del primer vertido a la última gota{temp}.',
    'If it runs fast or slow': 'Si va rápida o lenta',
    'Starting point applied': 'Punto de partida aplicado',
    'That is the recipe. Brew it the same way.': 'Esa es la receta. Prepárala igual.',
    'It is pinned above the board with its grind. When the bag ages and the same setting starts running quick, set where the grinder is today on the recipe card rather than rewriting the recipe.':
      'Está fijada encima del tablero con su molienda. Cuando la bolsa envejezca y el mismo punto empiece a ir rápido, anota dónde está hoy el molino en la tarjeta de la receta en vez de reescribir la receta.',
    'Add the time to that brew.': 'Añade el tiempo a esa preparación.',
    'Tap the brew below and put it in. How long it ran is the number this app reasons from: it is what the grind changes in a brewer that drains, and it decides whether “finer” or “coarser” is the right answer.':
      'Toca la preparación de abajo y escríbelo. Lo que tardó es el número con el que razona esta app: es lo que cambia la molienda en un método que drena, y decide si la respuesta es “más fino” o “más grueso”.',
    'Why this': 'Por qué',

    /* keeper */
    'Current recipe': 'Receta actual',
    'g coffee': 'g de café',
    'g water': 'g de agua',
    'total': 'total',
    'grind {g}': 'molienda {g}',
    'no grind recorded': 'sin molienda registrada',
    '{ey}% extraction': '{ey}% de extracción',
    'Grinder today': 'El molino hoy',
    '{d} from the recipe': '{d} respecto a la receta',
    'on the recipe': 'en la receta',
    'same as the recipe': 'igual que la receta',
    'Roasted today': 'Tostado hoy',
    'One day off roast': 'Un día desde el tueste',
    '{n} days off roast': '{n} días desde el tueste',
    'still degassing, so expect it to move.': 'aún desgasificando, así que espera que se mueva.',

    /* ey card */
    'Extraction': 'Extracción',
    'box: target': 'caja: objetivo',
    'ring: current recipe': 'anillo: receta actual',
    'Brew': 'Preparación',
    'Add a TDS reading and the weight in the cup to a brew and it lands here, against the usual filter box: 18–22% extraction at 1.15–1.45% TDS.':
      'Añade una lectura de TDS y el peso en la taza a una preparación y aparecerá aquí, frente a la caja habitual del filtrado: 18–22% de extracción con 1.15–1.45% de TDS.',
    '<strong>under-extracted</strong>, below 18%.': '<strong>subextraída</strong>, por debajo del 18%.',
    '<strong>over-extracted</strong>, above 22%.': '<strong>sobreextraída</strong>, por encima del 22%.',
    '<strong>in the band</strong>, on the weak side.': '<strong>dentro de la franja</strong>, del lado débil.',
    '<strong>in the band</strong>, on the strong side.': '<strong>dentro de la franja</strong>, del lado intenso.',
    '<strong>in the band</strong>.': '<strong>dentro de la franja</strong>.',
    'Brew {n}: {ey}% extraction at {tds}% TDS — {where}': 'Preparación {n}: {ey}% de extracción con {tds}% de TDS — {where}',

    /* brew cards */
    'Brew {n}': 'Preparación {n}',
    '{dose} grams to {water}': '{dose} gramos para {water}',
    'grind {g} clicks': 'molienda {g} clics',
    'grind {d}': 'molienda {d}',
    'grind': 'molienda',
    'click': 'clic',
    'clicks': 'clics',
    'the recipe': 'la receta',
    'in the window': 'en la ventana',
    '{off}s quick': '{off} s rápida',
    '{off}s long': '{off} s larga',
    '{off}s quick, near enough': '{off} s rápida, casi',
    '{off}s long, near enough': '{off} s larga, casi',
    'The schedule ends at {a}g, and the water says {b}g.': 'Los vertidos terminan en {a} g, y el agua dice {b} g.',
    'no scale': 'sin balanza',
    'drawdown': 'drenado',
    '(from the bag)': '(de la bolsa)',
    'tasted {list}': 'sabía a {list}',
    'changed {list}': 'cambió {list}',
    'notes: {notes}': 'notas: {notes}',
    'The bloom': 'El bloom',
    'the bloom': 'el bloom',
    '{label} says {value}g, below {prev} at {prevValue}g — the schedule is a running total.':
      v => `${v.label} marca ${v.value} g, por debajo ${de(v.prev)} en ${v.prevValue} g — los vertidos son un total acumulado.`,
    '{label} says {value}g, which is below {prev} at {prevValue}g. The column is the running total, so it only goes up.':
      v => `${v.label} marca ${v.value} g, que es menos que ${v.prev} en ${v.prevValue} g. La columna es el total acumulado, así que solo sube.`,
    'Nothing recorded on this brew yet.': 'Aún no hay nada registrado en esta preparación.',
    'No {names} recorded, so this brew has no {lost}.': 'Falta registrar {names}, así que esta preparación no tiene {lost}.',
    'No {names} recorded.': 'Falta registrar {names}.',
    'and no': 'y',
    'join-lost|and no': 'ni',
    'missing|dose': 'dosis',
    'missing|water': 'agua',
    'missing|time': 'tiempo',
    'missing|ratio': 'proporción',
    'missing|drawdown': 'drenado',
    'or': 'o',

    /* fields named in sentences */
    'field|grind': 'la molienda',
    'field|temp': 'la temperatura',
    'field|dose': 'la dosis',
    'field|water': 'el agua',

    /* ---------- the brew sheet ---------- */
    'This brew': 'Esta preparación',
    'What are you changing?': '¿Qué estás cambiando?',
    'The pours': 'Los vertidos',
    'Water is the running total on the scale, the way a recipe is written — not the weight of each pour.':
      'El agua es el total acumulado en la balanza, como se escribe una receta — no el peso de cada vertido.',
    'How it tasted': 'Cómo supo',
    'Sour or bitter?': '¿Ácido o amargo?',
    'Thin or strong?': '¿Aguado o intenso?',
    'What did you taste?': '¿A qué te supo?',
    'Flavour wheel': 'Rueda de sabores',
    'Keep it?': '¿Te la quedas?',
    'Notes and the rest': 'Notas y lo demás',
    'Refractometer, notes and the rest': 'Refractómetro, notas y lo demás',
    'Remove this brew': 'Quitar esta preparación',
    'Save the brew': 'Guardar la preparación',
    'Stop and save': 'Parar y guardar',
    'Brew time': 'Tiempo de preparación',
    'Changes you had not saved, back where you left them.': 'Cambios que no habías guardado, donde los dejaste.',
    'The brew you had not saved, back where you left it.': 'La preparación que no habías guardado, donde la dejaste.',
    'Discard the changes': 'Descartar los cambios',
    'Start a fresh brew': 'Empezar una preparación nueva',
    'Kept as a draft — Log a brew picks it up': 'Guardada como borrador — Registrar una preparación la retoma',
    'Brew {n}: changes kept — open it to finish': 'Preparación {n}: cambios guardados — ábrela para terminar',
    'Brew {n} removed': 'Preparación {n} quitada',
    'Brew {n} is back': 'La preparación {n} ha vuelto',
    'Brew {n} saved': 'Preparación {n} guardada',
    'Brew {n} saved without {what}': 'Preparación {n} guardada sin {what}',
    'Brew {n} updated': 'Preparación {n} actualizada',
    'Add the taste': 'Añadir el sabor',
    'Nothing recorded yet — add the water, the time or how it tasted': 'Aún no hay nada registrado — añade el agua, el tiempo o cómo supo',
    'Nothing recorded yet — add the time or how it tasted': 'Aún no hay nada registrado — añade el tiempo o cómo supo',

    /* clock */
    'Stop': 'Parar',
    'Another pour': 'Otro vertido',
    '{step} now': '{step} ahora',
    'Open now': 'Abrir ahora',
    'Close now': 'Cerrar ahora',
    'Resume': 'Reanudar',
    'Resumed': 'Reanudado',
    'Time it again': 'Cronometrar de nuevo',
    'Start the clock': 'Iniciar el reloj',
    '{what} at {t}': '{what} en {t}',
    'Opened at {t}': 'Abierta en {t}',
    'Closed at {t}': 'Cerrada en {t}',
    'Stopped at {t}': 'Parado en {t}',
    'Time {t} recorded': 'Tiempo {t} registrado',

    /* numbers */
    'Coffee': 'Café',
    'Water': 'Agua',
    'Time': 'Tiempo',
    'Grind': 'Molienda',
    'Temp': 'Temp.',
    'At': 'En',
    'To': 'Hasta',
    /* the scale column of a pour row, where "Hasta" does not fit */
    'pour|To': 'A',
    'From': 'Desde',
    'Ratio 1:': 'Proporción 1:',
    'Less {label}': 'Menos {label}',
    'More {label}': 'Más {label}',
    '“{typed}” is not a number, so nothing is recorded here.': '“{typed}” no es un número, así que aquí no se registra nada.',
    '“{typed}” is not a time, so nothing is recorded here.': '“{typed}” no es un tiempo, así que aquí no se registra nada.',
    '{lo}{unit} or more': '{lo}{unit} o más',
    '{lo} to {hi}{unit}': 'de {lo} a {hi}{unit}',
    '{label} takes {range}. Nothing is recorded until it is.': '{label} admite {range}. No se registra nada hasta entonces.',
    'from the last pour': 'del último vertido',

    /* pours */
    'Bloom': 'Bloom',
    'Pour {n}': 'Vertido {n}',
    'valve|Open': 'Apertura',
    'valve|Close': 'Cierre',
    'valve|open': 'apertura',
    'valve|close': 'cierre',
    '{label}, at': '{label}, en',
    '{label}, scale reads': '{label}, la balanza marca',
    'Remove the {label} at {t}': 'Quitar la {label} en {t}',
    'Remove {label}': 'Quitar {label}',
    '+{g}g in this pour': '+{g} g en este vertido',
    'nothing added in this pour': 'nada añadido en este vertido',
    'below the total before it': 'por debajo del total anterior',
    '＋ Another pour': '＋ Otro vertido',
    '＋ Start with the bloom': '＋ Empezar con el bloom',

    /* intent */
    'Finer': 'Más fino',
    'Coarser': 'Más grueso',
    'Hotter': 'Más caliente',
    'Cooler': 'Más fría',
    'More water': 'Más agua',
    'Less water': 'Menos agua',
    'Different pours': 'Otros vertidos',
    'Same again': 'Igual otra vez',
    'Marked “different pours”, but the schedule is the same as the last brew.':
      'Marcado “otros vertidos”, pero los vertidos son los mismos que en la preparación anterior.',
    'Marked “same again”, but {list} changed since the last brew.':
      v => `Marcado “igual otra vez”, pero ${v.list} ${v.n > 1 ? 'cambiaron' : 'cambió'} desde la preparación anterior.`,
    'Marked “{intent}”, but no {field} is recorded on both brews, so there is nothing to compare.':
      'Marcado “{intent}”, pero {field} no está registrada en las dos preparaciones, así que no hay nada que comparar.',
    'Marked “{intent}”, but the {field} is the same as the last brew.': 'Marcado “{intent}”, pero {field} es igual que en la preparación anterior.',
    'Marked “{intent}”, but the {field} moved the other way.': 'Marcado “{intent}”, pero {field} se movió en sentido contrario.',

    /* taste */
    'sour': 'ácido',
    'bitter': 'amargo',
    'thin': 'aguado',
    'strong': 'intenso',
    'not tasted yet': 'aún sin probar',
    'not said yet': 'aún sin decir',
    'taste|sharp, sour': 'punzante, ácido',
    'taste|sour': 'ácido',
    'taste|a little sour': 'un poco ácido',
    'taste|neither': 'equilibrado',
    'taste|a little bitter': 'un poco amargo',
    'taste|bitter': 'amargo',
    'taste|harsh, drying': 'áspero, secante',
    'body|thin, watery': 'flojo, aguado',
    'body|thin': 'aguado',
    'body|a little thin': 'un poco aguado',
    'body|neither': 'equilibrado',
    'body|a little strong': 'un poco intenso',
    'body|strong': 'intenso',
    'body|thick, syrupy': 'denso, almibarado',

    /* flavour */
    '{got} of {said} from the bag.': '{got} de {said} de la bolsa.',
    '{got} of {said} from the bag': '{got} de {said} de la bolsa',
    'The bag says {words} — tap the ones you got.': 'La bolsa dice {words} — toca los que encontraste.',
    '{word}, from the bag': '{word}, de la bolsa',
    '{word}, from the bag — tasted': '{word}, de la bolsa — encontrado',
    '{word} — remove': '{word} — quitar',
    'Tap a word to write it down. The inner ring is the coarse version, and it is a real answer — plenty of mornings the honest note is "fruity".':
      'Toca una palabra para anotarla. El anillo interior es la versión gruesa, y es una respuesta válida — muchas mañanas la nota honesta es "afrutado".',
    'Whole wheel': 'Rueda completa',
    'Zoom in to read': 'Acercar para leer',
    'a whole family, if that is as far as it got': 'una familia entera, si no llegó más lejos',
    'writes the word down': 'anota la palabra',
    '{n} word down': '{n} palabra anotada',
    '{n} words down': '{n} palabras anotadas',
    'Tap a wedge to write it down': 'Toca una porción para anotarla',
    'Zoomed in — tap “{word}” again to write it down': 'Acercado — toca “{word}” otra vez para anotarla',
    '“{word}” removed': '“{word}” quitada',
    '“{word}” written down': '“{word}” anotada',

    /* verdict */
    'Off': 'Mala',
    'pour it away': 'tírala',
    'Drinkable': 'Bebible',
    'not there yet': 'aún no está',
    'brew it again': 'repítela',

    /* more */
    'TDS %': 'TDS %',
    'In the cup': 'En la taza',
    'e.g. 1.38': 'p. ej. 1.38',
    'g on the scale': 'g en la balanza',
    'Extraction yield needs both: the bed keeps roughly twice its own weight, so the water you poured is not the drink you got. Weigh the cup.':
      'El rendimiento de extracción necesita ambos: la cama retiene más o menos el doble de su peso, así que el agua que vertiste no es la bebida que obtuviste. Pesa la taza.',
    'Notes': 'Notas',
    'what you noticed': 'lo que notaste',
    'Brewed in': 'Preparada en',

    /* readout */
    'ratio': 'proporción',
    'aiming 1:{r}': 'objetivo 1:{r}',
    'bloom': 'bloom',
    'extraction yield': 'rendimiento de extracción',
    'extraction · check the TDS: a filter cup reads about 1.1–1.6%': 'extracción · revisa el TDS: una taza de filtrado ronda 1.1–1.6%',
    'extraction · needs TDS and the cup weighed': 'extracción · necesita el TDS y la taza pesada',
    'window {lo}–{hi}': 'ventana {lo}–{hi}',
    'in the {lo}–{hi} window': 'dentro de la ventana {lo}–{hi}',
    '{off}s quicker than the window': '{off} s más rápida que la ventana',
    '{off}s longer than the window': '{off} s más larga que la ventana',

    /* ---------- advice ---------- */
    'at 1:{r}': 'a 1:{r}',
    'Under-extracted — but not for want of grind.': 'Subextraída — pero no por falta de molienda.',
    'Sour and thin is the picture of an under-extracted brew and finer is the usual answer, except this one already ran past the window: finer would only slow it further. Water that sits that long and still takes little with it is going round the bed rather than through it — look at how level the bed is and at whether the pours are cutting a channel in it.':
      'Ácido y aguado es el retrato de una preparación subextraída y lo habitual es moler más fino, salvo que esta ya se pasó de la ventana: más fino solo la haría más lenta. Agua que se queda tanto tiempo y aun así se lleva poco está rodeando la cama en vez de atravesarla — mira lo nivelada que está la cama y si los vertidos le abren un canal.',
    'Grind finer{grind}.': 'Muele más fino{grind}.',
    'Grind coarser{grind}.': 'Muele más grueso{grind}.',
    'Grind finer.': 'Muele más fino.',
    'Grind coarser.': 'Muele más grueso.',
    'Sour and thin together are one fault, not two — not enough came out of the bed, so the cup is sharp and weak at the same time. Finer is the single change that moves both, and it slows the brew back into the window on the way.':
      'Ácido y aguado juntos son un solo fallo, no dos — no salió suficiente de la cama, así que la taza es punzante y débil a la vez. Más fino es el único cambio que mueve las dos cosas, y de paso devuelve la preparación a la ventana.',
    'Sour and thin together are one fault, not two — not enough came out of the bed, so the cup is sharp and weak at the same time. Finer is the single change that moves both, with the steep time exactly where you set it.':
      'Ácido y aguado juntos son un solo fallo, no dos — no salió suficiente de la cama, así que la taza es punzante y débil a la vez. Más fino es el único cambio que mueve las dos cosas, con el tiempo de infusión justo donde lo fijaste.',
    'Sour and thin together are one fault, not two — not enough came out of the bed, so the cup is sharp and weak at the same time. Finer is the single change that moves both.':
      'Ácido y aguado juntos son un solo fallo, no dos — no salió suficiente de la cama, así que la taza es punzante y débil a la vez. Más fino es el único cambio que mueve las dos cosas.',
    'Over-extracted — but not for want of grind.': 'Sobreextraída — pero no por falta de molienda.',
    'Bitter and strong is the picture of an over-extracted brew and coarser is the usual answer, except this one already came in short of the window: coarser would only make it faster. Water that drains that quickly and still takes too much is running through part of the bed and not the rest — a gentler pour and a flatter bed before anything else.':
      'Amargo e intenso es el retrato de una preparación sobreextraída y lo habitual es moler más grueso, salvo que esta ya se quedó corta de la ventana: más grueso solo la haría más rápida. Agua que drena tan rápido y aun así se lleva demasiado está pasando por una parte de la cama y no por el resto — un vertido más suave y una cama más plana antes que nada.',
    'Bitter and strong together are one fault, not two — too much came out of the bed, so the cup is harsh and heavy with it. Coarser is the single change that moves both, and it brings the brew back into the window on the way.':
      'Amargo e intenso juntos son un solo fallo, no dos — salió demasiado de la cama, así que la taza es áspera y pesada. Más grueso es el único cambio que mueve las dos cosas, y de paso devuelve la preparación a la ventana.',
    'Bitter and strong together are one fault, not two — too much came out of the bed, so the cup is harsh and heavy with it. Coarser is the single change that moves both, with the steep time exactly where you set it.':
      'Amargo e intenso juntos son un solo fallo, no dos — salió demasiado de la cama, así que la taza es áspera y pesada. Más grueso es el único cambio que mueve las dos cosas, con el tiempo de infusión justo donde lo fijaste.',
    'Bitter and strong together are one fault, not two — too much came out of the bed, so the cup is harsh and heavy with it. Coarser is the single change that moves both.':
      'Amargo e intenso juntos son un solo fallo, no dos — salió demasiado de la cama, así que la taza es áspera y pesada. Más grueso es el único cambio que mueve las dos cosas.',
    'More water.': 'Más agua.',
    'Less water.': 'Menos agua.',
    'A bigger cup, same coffee.': 'Una taza más grande, el mismo café.',
    'Less water, same coffee.': 'Menos agua, el mismo café.',
    'Sour and strong{at} is the ratio rather than the grind: there was not enough water to finish taking what it came for, and what it did take is packed into a small cup. Pour {g}g more onto the same dose and both ends move together. Leave the grinder where it is.':
      'Ácido e intenso{at} es la proporción, no la molienda: no hubo agua suficiente para terminar de llevarse lo que venía a buscar, y lo que sí se llevó está concentrado en una taza pequeña. Vierte {g} g más sobre la misma dosis y los dos extremos se mueven juntos. Deja el molino donde está.',
    'Sour and strong is the ratio rather than the grind: too little water for that much coffee, so it is both under-extracted and concentrated. More water on the same scoop, and leave the grinder where it is.':
      'Ácido e intenso es la proporción, no la molienda: poca agua para tanto café, así que está subextraída y concentrada a la vez. Más agua con la misma cucharada, y deja el molino donde está.',
    'Bitter and thin{at} is the ratio rather than the grind: the last of the water was pulling the harsh end out of the bed and diluting what you already had. Stop {g}g earlier on the same dose and both ends move together. Leave the grinder where it is.':
      'Amargo y aguado{at} es la proporción, no la molienda: la última agua estaba sacando lo áspero de la cama y diluyendo lo que ya tenías. Para {g} g antes con la misma dosis y los dos extremos se mueven juntos. Deja el molino donde está.',
    'Bitter and thin is the ratio rather than the grind: too much water through too little coffee, so it is over-extracted and dilute at once. Less water on the same scoop, and leave the grinder where it is.':
      'Amargo y aguado es la proporción, no la molienda: demasiada agua por muy poco café, así que está sobreextraída y diluida a la vez. Menos agua con la misma cucharada, y deja el molino donde está.',

    'This is the recipe.': 'Esta es la receta.',
    'Tasting of neither wall. It is pinned at the top of the board; brew the next one to it and change nothing.':
      'No sabe a ninguno de los dos extremos. Está fijada arriba del tablero; prepara la siguiente igual y no cambies nada.',
    'This is your recipe.': 'Esta es tu receta.',
    'Tasting of neither wall, and nothing about the cup is asking to be moved. Make it your current recipe and it pins to the top of this board.':
      'No sabe a ninguno de los dos extremos, y nada en la taza pide moverse. Hazla tu receta actual y quedará fijada arriba de este tablero.',
    'This is your recipe — mark it Current recipe.': 'Esta es tu receta — márcala como Receta actual.',
    'It ran quicker than the window but tastes of neither wall, which is worth more than the window is. Make it your current recipe; if the next one tastes the same at this time, move the window to fit this coffee.':
      'Fue más rápida que la ventana pero no sabe a ninguno de los dos extremos, y eso vale más que la ventana. Hazla tu receta actual; si la siguiente sabe igual con este tiempo, mueve la ventana para que encaje con este café.',
    'It ran longer than the window but tastes of neither wall, which is worth more than the window is. Make it your current recipe; if the next one tastes the same at this time, move the window to fit this coffee.':
      'Fue más larga que la ventana pero no sabe a ninguno de los dos extremos, y eso vale más que la ventana. Hazla tu receta actual; si la siguiente sabe igual con este tiempo, mueve la ventana para que encaje con este café.',
    'It tastes sour, and in a brewer that steeps the grind is what changes how much comes out — the clock is where you set it, so it is not in this answer. Finer exposes more of the bean in the same four minutes. One step at a time, and taste again before moving anything else.':
      'Sabe ácido, y en un método de inmersión lo que cambia cuánto sale es la molienda — el reloj está donde lo fijaste, así que no entra en esta respuesta. Más fino expone más grano en los mismos cuatro minutos. Un paso cada vez, y vuelve a probar antes de mover otra cosa.',
    'It tastes bitter, and in a brewer that steeps the grind is what changes how much comes out — the clock is where you set it, so it is not in this answer. Coarser exposes less. One step at a time, and taste again before moving anything else.':
      'Sabe amargo, y en un método de inmersión lo que cambia cuánto sale es la molienda — el reloj está donde lo fijaste, así que no entra en esta respuesta. Más grueso expone menos. Un paso cada vez, y vuelve a probar antes de mover otra cosa.',
    'It drained short of the window and tasted sour — the water was through the bed before it had taken enough with it. Grind is the variable that fixes both at once.':
      'Drenó antes de la ventana y supo ácida — el agua atravesó la cama antes de llevarse lo suficiente. La molienda es la variable que arregla las dos cosas a la vez.',
    'It ran past the window and tasted bitter — the water spent too long in the bed. Grind is the variable that fixes both at once.':
      'Se pasó de la ventana y supo amarga — el agua estuvo demasiado tiempo en la cama. La molienda es la variable que arregla las dos cosas a la vez.',
    'Not grind, this time.': 'Esta vez no es la molienda.',
    'Sour and slow together do not point at grind: going finer would slow it further. That pattern is usually the bed — a channel down one side, or fines choking the base. Look at the water temperature too, and at how long ago the bag was roasted.':
      'Ácida y lenta a la vez no apuntan a la molienda: ir más fino la haría aún más lenta. Ese patrón suele ser la cama — un canal por un lado, o finos atascando la base. Mira también la temperatura del agua, y cuánto hace que se tostó la bolsa.',
    'Sour and slow together do not point at grind: going finer would slow it further. That pattern is usually the bed — a channel down one side, or fines choking the base. Look also at how long ago the bag was roasted.':
      'Ácida y lenta a la vez no apuntan a la molienda: ir más fino la haría aún más lenta. Ese patrón suele ser la cama — un canal por un lado, o finos atascando la base. Mira también cuánto hace que se tostó la bolsa.',
    'Bitter and fast together do not point at grind: going coarser would make it faster still. Water that gets through quickly and still over-extracts has found a short path through the bed, so look at how the pours land and how level the bed is before you touch the grinder.':
      'Amarga y rápida a la vez no apuntan a la molienda: ir más grueso la haría aún más rápida. Agua que pasa rápido y aun así sobreextrae ha encontrado un atajo por la cama, así que mira cómo caen los vertidos y lo nivelada que está la cama antes de tocar el molino.',
    'Tastes sour.': 'Sabe ácida.',
    'Tastes bitter.': 'Sabe amarga.',
    'Add the brew time and the app can say whether that is the grind or something else — sour and quick is a different problem from sour and slow, and they have opposite answers.':
      'Añade el tiempo de preparación y la app podrá decir si es la molienda u otra cosa — ácida y rápida es un problema distinto de ácida y lenta, y tienen respuestas opuestas.',
    'Leave the grind. Try hotter water next.': 'Deja la molienda. Prueba con agua más caliente la próxima vez.',
    'Leave the grind. Try cooler water next.': 'Deja la molienda. Prueba con agua menos caliente la próxima vez.',
    'Leave the grind. Pour more vigorously, or add water, next.': 'Deja la molienda. La próxima vez vierte con más energía, o añade agua.',
    'Leave the grind. Pour more gently, or use less water, next.': 'Deja la molienda. La próxima vez vierte con más suavidad, o usa menos agua.',
    'a degree or two': 'un grado o dos',
    'The brew is in the window and still tastes sour. Grind moves time; this is the part grind does not reach. Water temperature is the usual next variable — up {nudge} — and after that the ratio.':
      'La preparación está en la ventana y aun así sabe ácida. La molienda mueve el tiempo; esta es la parte a la que la molienda no llega. La temperatura del agua es la siguiente variable habitual — sube {nudge} — y después la proporción.',
    'The brew is in the window and still tastes bitter. Grind moves time; this is the part grind does not reach. Water temperature is the usual next variable — down {nudge} — and after that the ratio.':
      'La preparación está en la ventana y aun así sabe amarga. La molienda mueve el tiempo; esta es la parte a la que la molienda no llega. La temperatura del agua es la siguiente variable habitual — baja {nudge} — y después la proporción.',
    'The brew is in the window and still tastes sour. Grind moves time, and this is the part grind does not reach — and your kettle holds one temperature, so the variables are the pour and the ratio: pour higher and more agitatedly to wet the bed evenly, or give it more water.':
      'La preparación está en la ventana y aun así sabe ácida. La molienda mueve el tiempo, y esta es la parte a la que no llega — y tu hervidor tiene una sola temperatura, así que las variables son el vertido y la proporción: vierte desde más alto y con más agitación para mojar la cama por igual, o dale más agua.',
    'The brew is in the window and still tastes bitter. Grind moves time, and this is the part grind does not reach — and your kettle holds one temperature, so the variables are the pour and the ratio: pour more gently to agitate the bed less, or give it less water.':
      'La preparación está en la ventana y aun así sabe amarga. La molienda mueve el tiempo, y esta es la parte a la que no llega — y tu hervidor tiene una sola temperatura, así que las variables son el vertido y la proporción: vierte con más suavidad para agitar menos la cama, o dale menos agua.',

    'Taste it — the clock cannot help here.': 'Pruébala — aquí el reloj no ayuda.',
    'Your brewer steeps, so the steep is the time you set the timer to rather than something the coffee did. It tells the app nothing it can act on. Sour or bitter on the sheet is what points at the grind; thin or strong is what points at the ratio.':
      'Tu método es de inmersión, así que la infusión dura lo que pusiste en el temporizador, no algo que hizo el café. No le dice a la app nada sobre lo que pueda actuar. Ácido o amargo en la hoja es lo que apunta a la molienda; aguado o intenso es lo que apunta a la proporción.',
    'Your brewer steeps, so the {t} is the time you set the timer to rather than something the coffee did. It tells the app nothing it can act on. Sour or bitter on the sheet is what points at the grind; thin or strong is what points at the ratio.':
      'Tu método es de inmersión, así que {t} es el tiempo que pusiste en el temporizador, no algo que hizo el café. No le dice a la app nada sobre lo que pueda actuar. Ácido o amargo en la hoja es lo que apunta a la molienda; aguado o intenso es lo que apunta a la proporción.',
    'It drained {off}s short of the {lo}–{hi} window, so the water was through the bed before it had taken much with it. Finer slows the flow, and it is the variable that does.{grindWhy} Say how it tasted and the app can check the one case this does not fix: a brew that is both quick and bitter has found a channel through the bed, and finer makes that worse.':
      'Drenó {off} s antes de la ventana de {lo}–{hi}, así que el agua atravesó la cama antes de llevarse gran cosa. Más fino frena el flujo, y es la variable que lo hace.{grindWhy} Di cómo supo y la app podrá comprobar el único caso que esto no arregla: una preparación rápida y amarga a la vez ha encontrado un canal en la cama, y más fino lo empeora.',
    'It ran {off}s past the {lo}–{hi} window, so the water spent longer in the bed than the recipe asks for. Coarser opens it up.{grindWhy} Say how it tasted and the app can check the one case this does not fix: a brew that is both slow and sour usually means the bed clogged or the water went round it.':
      'Se pasó {off} s de la ventana de {lo}–{hi}, así que el agua estuvo en la cama más de lo que pide la receta. Más grueso la abre.{grindWhy} Di cómo supo y la app podrá comprobar el único caso que esto no arregla: una preparación lenta y ácida a la vez suele significar que la cama se atascó o que el agua la rodeó.',
    'The clock is right. Now taste it.': 'El reloj está bien. Ahora pruébala.',
    '{t} is inside the {lo}–{hi} window, which is the part the grinder controls and the part this app can measure. Whether it is any good is the other half, and nothing but your mouth answers that. Mark it sour or bitter and the next move gets specific; mark it neither and this is your recipe.':
      '{t} está dentro de la ventana de {lo}–{hi}, que es la parte que controla el molino y la parte que esta app puede medir. Si está buena es la otra mitad, y eso solo lo responde tu boca. Márcala ácida o amarga y el siguiente paso se vuelve concreto; márcala equilibrada y esta es tu receta.',

    'More coffee, or less water.': 'Más café, o menos agua.',
    'Less coffee, or more water.': 'Menos café, o más agua.',
    'Thin is about how much coffee is in the cup, not how much came out of the bed. One more scoop, or a smaller cup — one at a time, so you can read which did it.':
      'Aguado tiene que ver con cuánto café hay en la taza, no con cuánto salió de la cama. Una cucharada más, o una taza más pequeña — de una en una, para saber cuál lo hizo.',
    'Strong is about how much coffee is in the cup, not how much came out of the bed. Half a scoop less, or a bigger cup — one at a time, so you can read which did it.':
      'Intenso tiene que ver con cuánto café hay en la taza, no con cuánto salió de la cama. Media cucharada menos, o una taza más grande — de una en una, para saber cuál lo hizo.',
    'Thin{at} is about how much coffee ended up in the cup rather than how much came out of the bed, so the grinder is not the variable — it is the ratio. Stop {g}g earlier on the same dose, or put a gram or two more coffee under the same water.':
      'Aguado{at} tiene que ver con cuánto café acabó en la taza, no con cuánto salió de la cama, así que la variable no es el molino — es la proporción. Para {g} g antes con la misma dosis, o pon uno o dos gramos más de café con la misma agua.',
    'Strong{at} is about how much coffee ended up in the cup rather than how much came out of the bed, so the grinder is not the variable — it is the ratio. Pour {g}g more on the same dose, or put a gram less coffee under the same water.':
      'Intenso{at} tiene que ver con cuánto café acabó en la taza, no con cuánto salió de la cama, así que la variable no es el molino — es la proporción. Vierte {g} g más con la misma dosis, o pon un gramo menos de café con la misma agua.',

    'The bloom was short.': 'El bloom fue corto.',
    'The bloom was long.': 'El bloom fue largo.',
    '{x}× the dose leaves part of the bed dry through the bloom, and dry grounds do not degas. Two to three times the dose is the usual range — the point is to wet all of it, not to brew any of it yet.':
      '{x}× la dosis deja parte de la cama seca durante el bloom, y el café seco no desgasifica. Entre dos y tres veces la dosis es lo habitual — se trata de mojarlo todo, no de extraer nada todavía.',
    '{x}× the dose is a pour rather than a bloom: enough water to start drawing through before the bed has finished degassing. Two to three times the dose wets everything without brewing it.':
      '{x}× la dosis es un vertido más que un bloom: agua suficiente para empezar a pasar antes de que la cama termine de desgasificar. Entre dos y tres veces la dosis lo moja todo sin extraerlo.',

    'It came in short of the window and you called it thin. Those are one fault: the water was through the bed before it had taken much with it, so there is little in the cup and it is probably sharp with it. Finer moves both, and brings the time up on the way.':
      'Se quedó corta de la ventana y dijiste que estaba aguada. Es un solo fallo: el agua atravesó la cama antes de llevarse gran cosa, así que hay poco en la taza y probablemente sea punzante. Más fino mueve las dos cosas, y de paso sube el tiempo.',
    'It ran past the window and you called it strong. Those are one fault: the water sat in the bed taking more than it should, and what it took is all in the cup. Coarser moves both, and brings the time back on the way.':
      'Se pasó de la ventana y dijiste que estaba intensa. Es un solo fallo: el agua se quedó en la cama sacando más de la cuenta, y todo lo que sacó está en la taza. Más grueso mueve las dos cosas, y de paso recupera el tiempo.',
    'Short of the window and strong is the ratio rather than the grind: the brew was stopped before the water had finished, and what it did take is packed into a small cup. Leave the grinder where it is and more water.':
      'Corta de la ventana e intensa es la proporción, no la molienda: la preparación se paró antes de que el agua terminara, y lo que sí sacó está concentrado en una taza pequeña. Deja el molino donde está y usa más agua.',
    'Past the window and thin is the ratio rather than the grind: the end of it was adding water and harshness and nothing else. Leave the grinder where it is and less water.':
      'Pasada de la ventana y aguada es la proporción, no la molienda: el final solo añadía agua y aspereza. Deja el molino donde está y usa menos agua.',

    'Back to 1:{ratio} — {water}g water on {dose}g coffee, same grind.': 'Vuelve a 1:{ratio} — {water} g de agua sobre {dose} g de café, la misma molienda.',
    'This one ran at 1:{ran}, more water than the 1:{ratio} you are aiming at, so the cup is being judged at a different strength from the recipe and the grind gets blamed for it. Put the ratio back first; then the grind and the water have a fair test.':
      'Esta fue a 1:{ran}, más agua que el 1:{ratio} al que apuntas, así que la taza se está juzgando con otra intensidad que la de la receta y la culpa se la lleva la molienda. Primero recupera la proporción; así la molienda y el agua tienen una prueba justa.',
    'This one ran at 1:{ran}, less water than the 1:{ratio} you are aiming at, so the cup is being judged at a different strength from the recipe and the grind gets blamed for it. Put the ratio back first; then the grind and the water have a fair test.':
      'Esta fue a 1:{ran}, menos agua que el 1:{ratio} al que apuntas, así que la taza se está juzgando con otra intensidad que la de la receta y la culpa se la lleva la molienda. Primero recupera la proporción; así la molienda y el agua tienen una prueba justa.',
    'Tastes right, reads under-extracted ({ey}%). Grind finer{grind}.': 'Sabe bien, pero mide subextraída ({ey}%). Muele más fino{grind}.',
    'Tastes right, reads over-extracted ({ey}%). Grind coarser{grind}.': 'Sabe bien, pero mide sobreextraída ({ey}%). Muele más grueso{grind}.',
    'Reads under-extracted ({ey}%). Grind finer{grind}.': 'Mide subextraída ({ey}%). Muele más fino{grind}.',
    'Reads over-extracted ({ey}%). Grind coarser{grind}.': 'Mide sobreextraída ({ey}%). Muele más grueso{grind}.',
    '{ey}% extraction is below the 18–22% a filter cup usually tastes best at. It tasted right, so this is a test: brew the next one finer and taste them side by side.':
      'Un {ey}% de extracción está por debajo del 18–22% en el que una taza de filtrado suele saber mejor. Supo bien, así que esto es una prueba: prepara la siguiente más fina y pruébalas una junto a otra.',
    '{ey}% extraction is below the 18–22% a filter cup usually tastes best at. The grinder is the change that moves extraction most directly.':
      'Un {ey}% de extracción está por debajo del 18–22% en el que una taza de filtrado suele saber mejor. El molino es el cambio que mueve la extracción más directamente.',
    '{ey}% extraction is above the 18–22% a filter cup usually tastes best at. It tasted right, so this is a test: brew the next one coarser and taste them side by side.':
      'Un {ey}% de extracción está por encima del 18–22% en el que una taza de filtrado suele saber mejor. Supo bien, así que esto es una prueba: prepara la siguiente más gruesa y pruébalas una junto a otra.',
    '{ey}% extraction is above the 18–22% a filter cup usually tastes best at. The grinder is the change that moves extraction most directly.':
      'Un {ey}% de extracción está por encima del 18–22% en el que una taza de filtrado suele saber mejor. El molino es el cambio que mueve la extracción más directamente.',
    'The refractometer: {ey}% extraction, under the 18–22% band.': 'El refractómetro: {ey}% de extracción, por debajo de la franja de 18–22%.',
    'The refractometer: {ey}% extraction, over the 18–22% band.': 'El refractómetro: {ey}% de extracción, por encima de la franja de 18–22%.',
    'The refractometer: {ey}% extraction, inside the 18–22% band.': 'El refractómetro: {ey}% de extracción, dentro de la franja de 18–22%.',
    'Hotter is used up. Grind finer{grind}.': 'Calentar más ya no da más. Muele más fino{grind}.',
    'At {t}{unit} there is little left to gain from heat, so the next variable is the grind: finer gives the water more surface to work on. Keep the water where it is.':
      'A {t}{unit} queda poco que ganar con el calor, así que la siguiente variable es la molienda: más fino le da al agua más superficie con la que trabajar. Deja el agua donde está.',
    'The last step hotter did not take the sourness out, so the next variable is the grind: finer gives the water more surface to work on. Keep the water where it is.':
      'El último paso a más temperatura no quitó la acidez, así que la siguiente variable es la molienda: más fino le da al agua más superficie con la que trabajar. Deja el agua donde está.',
    '{step} degrees hotter — {to}{unit}, same grind.': '{step} grados más caliente — {to}{unit}, la misma molienda.',
    '{step} degrees hotter, same grind.': '{step} grados más caliente, la misma molienda.',
    'Cooler is used up. Grind coarser{grind}.': 'Enfriar más ya no da más. Muele más grueso{grind}.',
    'At {t}{unit} there is little left to take off with temperature, so the next variable is the grind.':
      'A {t}{unit} queda poco que quitar con la temperatura, así que la siguiente variable es la molienda.',
    '{step} degrees cooler — {to}{unit}, same grind.': '{step} grados menos — {to}{unit}, la misma molienda.',
    '{step} degrees cooler, same grind.': '{step} grados menos, la misma molienda.',
    'Grind a touch finer{grind}.': 'Muele un poco más fino{grind}.',
    'Grind a touch coarser{grind}.': 'Muele un poco más grueso{grind}.',
    'Same grind — level the bed and keep the pours off the walls.': 'La misma molienda — nivela la cama y no viertas sobre las paredes.',
    'Same grind — pour more gently onto a level bed.': 'La misma molienda — vierte con más suavidad sobre una cama nivelada.',

    'Record when you opened it.': 'Registra cuándo la abriste.',
    'A {brewer} brews closed and then drains, and this schedule has no open or close in it. Without one the drawdown is measured from your last pour, which counts the whole steep as drawdown — so the number above is longer than anything that actually happened in the bed.':
      'Un {brewer} prepara cerrado y luego drena, y estos vertidos no tienen ni apertura ni cierre. Sin ellos el drenado se mide desde tu último vertido, lo que cuenta toda la infusión como drenado — así que el número de arriba es más largo que cualquier cosa que pasara de verdad en la cama.',
    'once': 'una vez',
    '{n} times': '{n} veces',
    'A {brewer} wants more than that.': 'Un {brewer} pide más que eso.',
    'A {brewer} asks for fewer.': 'Un {brewer} pide menos.',
    'Its method pours {want} after the bloom; this brew went in all at once. Not wrong — but it asks something different of the bed, so it is worth knowing which of the two the next brew is being compared with.':
      'Su método vierte {want} después del bloom; esta preparación entró toda de golpe. No está mal — pero le pide otra cosa a la cama, así que conviene saber con cuál de las dos se compara la siguiente.',
    'Its method pours {want} after the bloom; this brew poured {got}. Not wrong — but it asks something different of the bed, so it is worth knowing which of the two the next brew is being compared with.':
      'Su método vierte {want} después del bloom; esta preparación vertió {got}. No está mal — pero le pide otra cosa a la cama, así que conviene saber con cuál de las dos se compara la siguiente.',
    'Its method pours {want} after the bloom and this went in {got} goes. Each pause is time the bed spent draining rather than extracting, which is what makes a heavily pulsed brew hard to read off the clock.':
      'Su método vierte {want} después del bloom y esta entró en {got} tandas. Cada pausa es tiempo que la cama pasó drenando en vez de extrayendo, y eso es lo que hace que una preparación con muchos pulsos sea difícil de leer en el reloj.',
    'Roasted today.': 'Tostado hoy.',
    'One day off roast.': 'Un día desde el tueste.',
    '{n} days off roast.': '{n} días desde el tueste.',
    'Still full of gas, which lifts the bed, runs the water round it rather than through it, and makes the clock read short. Expect it to keep moving for a few days yet, and do not chase it far with the grinder — you would only have to walk it back.':
      'Todavía lleno de gas, que levanta la cama, hace que el agua la rodee en vez de atravesarla y que el reloj marque corto. Espera que siga moviéndose unos días más, y no lo persigas mucho con el molino — solo tendrías que deshacer el camino.',
    'Past six weeks the carbon dioxide that gave the bed its resistance has gone, so it drains fast and tastes flat however it is ground. That is the bag rather than the grinder, and going finer mostly buys bitterness on top of it.':
      'Pasadas seis semanas el dióxido de carbono que daba resistencia a la cama se ha ido, así que drena rápido y sabe plano lo muelas como lo muelas. Es la bolsa, no el molino, y moler más fino sobre todo te añade amargor.',
    '{head}, in particular.': '{head}, en concreto.',
    'Advice follows your newest brew.': 'Los consejos siguen a tu preparación más reciente.',
    'This is an earlier brew. What to change next is worked out from the newest one, on the board.':
      'Esta es una preparación anterior. Qué cambiar después se calcula a partir de la más reciente, en el tablero.',

    'Decaf drinks fast: the bean is opened up by the process, so it gives up flavour sooner and drains sooner. Expect a shorter brew than the grind suggests, and tighten the ratio before you chase it finer.':
      'El descafeinado se extrae rápido: el proceso abre el grano, así que suelta el sabor antes y drena antes. Espera una preparación más corta de lo que sugiere la molienda, y ajusta la proporción antes de perseguirlo más fino.',
    'With a lot this heavily processed, the flavour you paid for is the one the process put there, and pushing extraction burns it off. If it comes out sour, going coarser is as likely to fix it as going finer.':
      'En un lote con un proceso tan marcado, el sabor por el que pagaste es el que puso el proceso, y forzar la extracción lo quema. Si sale ácido, ir más grueso tiene tantas posibilidades de arreglarlo como ir más fino.',
    'This bag has lost the gas that gave the bed its resistance, so it will drain fast and taste thin. That is the bag, not the grinder.':
      'Esta bolsa ha perdido el gas que daba resistencia a la cama, así que drenará rápido y sabrá aguada. Es la bolsa, no el molino.',

    /* passed into /shared/grind.js */
    'point on your dial': 'punto del dial',
    'brew': 'preparación',

    /* ---------- grinder today ---------- */
    'Where the grinder is sitting now, which is not the same thing as the recipe. Beans degas, so a brew dialled on day five runs quicker on day fourteen at the same setting — the move belongs on the grinder, and the recipe stays where you found it.':
      'Dónde está el molino ahora, que no es lo mismo que la receta. El grano desgasifica, así que una preparación ajustada el quinto día va más rápida el día catorce con el mismo punto — el ajuste va en el molino, y la receta se queda como la encontraste.',
    'Where the grinder is sitting now, which is not the same thing as the recipe. Beans degas, so a brew dialled on day five runs quicker on day fourteen at the same setting — the move belongs on the grinder, and the recipe stays where you found it: <strong>{g}</strong>.':
      'Dónde está el molino ahora, que no es lo mismo que la receta. El grano desgasifica, así que una preparación ajustada el quinto día va más rápida el día catorce con el mismo punto — el ajuste va en el molino, y la receta se queda como la encontraste: <strong>{g}</strong>.',

    /* ---------- coffees ---------- */
    'My coffees': 'Mis cafés',
    'Add a coffee': 'Añadir un café',
    'Nothing on the shelf yet. Add the bag you are brewing and the board is yours.': 'Aún no hay nada en el estante. Añade la bolsa que estás preparando y el tablero es tuyo.',
    'roasted today': 'tostado hoy',
    '{n} day off roast': '{n} día desde el tueste',
    'dialled at {r}': 'ajustado a {r}',
    'also on the dial-in': 'también en el ajuste de espresso',
    'Brew {coffee}': 'Preparar {coffee}',
    'Edit {coffee}': 'Editar {coffee}',
    'roast-word|Light': 'tueste claro',
    'roast-word|Medium-light': 'tueste medio-claro',
    'roast-word|Medium': 'tueste medio',
    'roast-word|Medium-dark': 'tueste medio-oscuro',
    'roast-word|Dark': 'tueste oscuro',

    'The coffee': 'El café',
    'Remove this coffee': 'Quitar este café',
    'Name': 'Nombre',
    'e.g. Ethiopia Guji': 'p. ej. Etiopía Guji',
    'Roaster': 'Tostador',
    'optional': 'opcional',
    'Roast date': 'Fecha de tueste',
    'Roast level': 'Nivel de tueste',
    'Light': 'Claro',
    'Medium-light': 'Medio-claro',
    'Medium': 'Medio',
    'Medium-dark': 'Medio-oscuro',
    'Dark': 'Oscuro',
    'What else the bag says': 'Qué más dice la bolsa',
    'All optional. Process and how high it grew move the starting point; origin and variety say what to expect and which way to go when it disappoints. Everything stays as the bag printed it.':
      'Todo opcional. El proceso y la altitud mueven el punto de partida; el origen y la variedad dicen qué esperar y hacia dónde ir cuando decepciona. Todo queda tal como lo imprimió la bolsa.',
    'Origin': 'Origen',
    'e.g. Ethiopia, Guji': 'p. ej. Etiopía, Guji',
    'Variety': 'Variedad',
    'e.g. Heirloom, Gesha': 'p. ej. Heirloom, Gesha',
    'Process': 'Proceso',
    'e.g. Washed': 'p. ej. Lavado',
    'How it was processed': 'Cómo se procesó',
    'Grown at': 'Cultivado a',
    'whatever the bag prints, or nothing': 'lo que diga la bolsa, o nada',
    'How high it grew': 'A qué altitud creció',
    'It says it tastes like': 'Dice que sabe a',
    'e.g. peach, jasmine, honey': 'p. ej. durazno, jazmín, miel',
    'What you are aiming at': 'A qué apuntas',
    'A brew is only quick or long against a window, so this app will not call one long until you have said what the window is. 1:16 in {lo}–{hi} is where most pour-over recipes start, not where they have to stay.':
      'Una preparación solo es rápida o larga respecto a una ventana, así que esta app no dirá que es larga hasta que digas cuál es la ventana. 1:16 en {lo}–{hi} es donde empiezan la mayoría de las recetas de pour-over, no donde tienen que quedarse.',
    'A brew is only quick or long against a window, so this app will not call one long until you have said what the window is. 1:16 in {lo}–{hi} is where most immersion recipes start, not where they have to stay.':
      'Una preparación solo es rápida o larga respecto a una ventana, así que esta app no dirá que es larga hasta que digas cuál es la ventana. 1:16 en {lo}–{hi} es donde empiezan la mayoría de las recetas de inmersión, no donde tienen que quedarse.',
    'A brew is only quick or long against a window, so this app will not call one long until you have said what the window is. {lo}–{hi} is where most pour-over recipes start, not where they have to stay.':
      'Una preparación solo es rápida o larga respecto a una ventana, así que esta app no dirá que es larga hasta que digas cuál es la ventana. {lo}–{hi} es donde empiezan la mayoría de las recetas de pour-over, no donde tienen que quedarse.',
    'A brew is only quick or long against a window, so this app will not call one long until you have said what the window is. {lo}–{hi} is where most immersion recipes start, not where they have to stay.':
      'Una preparación solo es rápida o larga respecto a una ventana, así que esta app no dirá que es larga hasta que digas cuál es la ventana. {lo}–{hi} es donde empiezan la mayoría de las recetas de inmersión, no donde tienen que quedarse.',
    'What to expect': 'Qué esperar',
    'A place to start': 'Un punto de partida',
    '{roast} roasts usually take <strong>{temp}</strong> and <strong>{ratio}</strong>. Your grinder, water and palate finish the job.':
      v => `Los tuestes ${String(v.roast).toLowerCase()} suelen ir con <strong>${v.temp}</strong> y <strong>${v.ratio}</strong>. Tu molino, tu agua y tu paladar terminan el trabajo.`,
    'Your setup has a kettle with one temperature (change it in Settings), so the ratio is the part of this you can take.':
      'Tu equipo tiene un hervidor de una sola temperatura (cámbialo en Ajustes), así que la proporción es la parte de esto que puedes aprovechar.',
    'You are not brewing by weight, so the temperature is the part you can take.': 'No preparas por peso, así que la temperatura es la parte que puedes aprovechar.',
    'Moved from there because {why}.': 'Se movió de ahí porque {why}.',
    'Take the schedule': 'Usar los vertidos',
    'Start from this method': 'Empezar con este método',
    'The ratio and the temperature stay as the roast set them above — this writes the pours and the window.':
      'La proporción y la temperatura se quedan como las fijó el tueste arriba — esto escribe los vertidos y la ventana.',
    'The ratio and the temperature stay as the roast set them above — this writes the pours.':
      'La proporción y la temperatura se quedan como las fijó el tueste arriba — esto escribe los vertidos.',
    'How a {brewer} wants to be used': 'Cómo quiere usarse un {brewer}',
    'Schedule applied': 'Vertidos aplicados',
    'Method applied': 'Método aplicado',
    'Give the coffee a name — it is how the board finds it.': 'Ponle nombre al café — así lo encuentra el tablero.',
    'Its {n} brew goes with it': 'Su {n} preparación se va con él',
    'Its {n} brews go with it': 'Sus {n} preparaciones se van con él',
    'Nothing has been brewed with it': 'No se ha preparado nada con él',
    'The bag stays on the shelf — the dial-in still pulls it.': 'La bolsa se queda en el estante — el ajuste de espresso todavía la usa.',
    'The bag goes off the shelf too, and there is no undo.': 'La bolsa también sale del estante, y no se puede deshacer.',
    'Remove {coffee} from the brew log? {what}. {fate}': '¿Quitar {coffee} del registro de filtrado? {what}. {fate}',
    'Off the brew log — still on the dial-in': 'Fuera del registro de filtrado — sigue en el ajuste de espresso',
    'Removed': 'Quitado',
    'Brewed with': 'Se prepara con',
    'Espresso': 'Espresso',
    'Filter': 'Filtrado',
    'There is {n} brew logged here. Use Remove below, which says what goes with it.': 'Hay {n} preparación registrada aquí. Usa Quitar, abajo, que dice qué se va con ella.',
    'There are {n} brews logged here. Use Remove below, which says what goes with it.': 'Hay {n} preparaciones registradas aquí. Usa Quitar, abajo, que dice qué se va con ellas.',
    'Marked for this tool. Mark it for the other and it appears there too, with its own target.':
      'Marcado para esta herramienta. Márcalo para la otra y aparecerá allí también, con su propio objetivo.',
    'On both shelves. What the bag says is shared; the target and the log are this tool’s.':
      'En los dos estantes. Lo que dice la bolsa se comparte; el objetivo y el registro son de esta herramienta.',
    'Mark the other tool and this bag appears there too, with its own target and an empty log.':
      'Marca la otra herramienta y esta bolsa aparecerá allí también, con su propio objetivo y un registro vacío.',

    /* ---------- kit ---------- */
    'Your setup': 'Tu equipo',
    'My setup': 'Mi equipo',
    'Asked once. The brew sheet then asks only about what you can change.': 'Se pregunta una vez. Después la hoja de preparación solo pregunta por lo que puedes cambiar.',
    'What you brew on. The brew sheet is built from it, so changing something here changes what the sheet asks for next time.':
      'Con qué preparas. La hoja de preparación se construye a partir de esto, así que cambiar algo aquí cambia lo que la hoja pregunta la próxima vez.',
    'What you brew in': 'En qué preparas',
    'Add every one you use; each brew keeps the one that made it.': 'Añade todos los que uses; cada preparación guarda el que la hizo.',
    'Add a brewer': 'Añadir un método',
    'Add a brewer…': 'Añadir un método…',
    'Something else': 'Otro',
    'Choose…': 'Elige…',
    'Water passes through — pour over, drip, moka': 'El agua pasa a través — pour-over, goteo, moka',
    'Immersion — the coffee steeps': 'Inmersión — el café reposa en el agua',
    'Switch — a valve does both': 'Switch — una válvula hace las dos cosas',
    'Yours, for filter': 'Tuyos, para filtrado',
    'Yours, used elsewhere': 'Tuyos, usados en otra parte',
    'Hand grinders': 'Molinos manuales',
    'Electric grinders': 'Molinos eléctricos',
    'Type to find your brewer': 'Escribe para buscar tu método',
    'Type to find your grinder': 'Escribe para buscar tu molino',
    'What do you call it': 'Cómo lo llamas',
    'e.g. Flower Dripper': 'p. ej. Flower Dripper',
    'Add it': 'Añadirlo',
    'The rest of the counter': 'El resto de la encimera',
    'Kettle': 'Hervidor',
    'e.g. Fellow Stagg EKG': 'p. ej. Fellow Stagg EKG',
    'Grinder': 'Molino',
    'Which one': 'Cuál',
    'e.g. Comandante C40': 'p. ej. Comandante C40',
    'Nothing on the shelf yet.': 'Aún no hay nada en el estante.',
    'Already on the shelf': 'Ya está en el estante',
    '{name} added': '{name} añadido',
    'Remove {name}': 'Quitar {name}',
    'Filled in from your grinder': 'Completado a partir de tu molino',
    'When the water goes in, does it drain out?': 'Cuando entra el agua, ¿sale por abajo?',
    'Does the water drain out': '¿Sale el agua por abajo?',
    'It decides what this app may say about the clock. Draining, the grind sets how long it takes. Steeping, the time is whatever you set the timer to.':
      'Decide lo que esta app puede decir del reloj. Si drena, la molienda marca cuánto tarda. Si reposa, el tiempo es el que pongas en el temporizador.',
    'It drains as you pour': 'Drena mientras viertes',
    'It sits until you decide': 'Reposa hasta que decidas',
    'It steeps, then you open it': 'Reposa y luego lo abres',
    'drains through': 'drena',
    'steeps': 'reposa',
    'steeps, then drains': 'reposa y luego drena',
    'press, AeroPress': 'prensa, AeroPress',
    'Kettle temperature': 'Temperatura del hervidor',
    'Most kettles have one setting. Say so and the temperature field leaves the brew sheet, and nothing here tells you to raise it.':
      'La mayoría de los hervidores tienen una sola temperatura. Dilo y el campo de temperatura desaparece de la hoja de preparación, y nada aquí te dirá que la subas.',
    'Off the boil': 'Recién hervida',
    'I set it': 'La elijo yo',
    'The grind dial': 'El dial de molienda',
    'Only so the app uses your words for it. It moves you from where you are — a few clicks finer — and never hands you someone else’s setting.':
      'Solo para que la app use tus palabras. Te mueve desde donde estás — unos clics más fino — y nunca te da el punto de otra persona.',
    'A number': 'Un número',
    'Clicks': 'Clics',
    'Brewing by weight': 'Preparar por peso',
    'A ratio built from a scoop is not a ratio. Without a scale this app records grind, time and taste and prints no ratio anywhere — which is still a useful log, and an honest one.':
      'Una proporción hecha con una cucharada no es una proporción. Sin balanza esta app registra molienda, tiempo y sabor y no muestra ninguna proporción — y sigue siendo un registro útil, y honesto.',
    'On a scale': 'Con balanza',
    'By eye': 'A ojo',
    'Refractometer': 'Refractómetro',
    'With one, every brew sheet takes a TDS reading and, with the cup weighed, the board works out extraction. The same answer applies in the espresso dial-in.':
      'Con uno, cada hoja de preparación acepta una lectura de TDS y, con la taza pesada, el tablero calcula la extracción. La misma respuesta vale en el ajuste de espresso.',
    'No': 'No',
    'I have one': 'Tengo uno',
    'Saved — set to a V60, change it in My setup': 'Guardado — configurado con una V60, cámbialo en Mi equipo',
    'Setup saved': 'Equipo guardado',

    /* ---------- settings ---------- */
    'Sign in': 'Iniciar sesión',
    'Nothing on the shelf yet': 'Aún no hay nada en el estante',
    '{n} coffee': '{n} café',
    '{n} coffees': '{n} cafés',
    'on {coffee}': 'con {coffee}',
    '{n} brewers': '{n} métodos',
    'Not set — the sheet is using the defaults': 'Sin configurar — la hoja usa los valores por defecto',
    'Adds a TDS field and a place for the weight of the cup, and shows extraction yield, here and in the dial-in, on every device you sign in on. Off, the app works on coffee, water and time — which is what most kitchens have.':
      'Añade un campo de TDS y un sitio para el peso de la taza, y muestra el rendimiento de extracción, aquí y en el ajuste de espresso, en todos los dispositivos donde inicies sesión. Apagado, la app trabaja con café, agua y tiempo — que es lo que tienen la mayoría de las cocinas.',
    'Appearance': 'Apariencia',
    'Auto': 'Automático',
    'Language': 'Idioma',
    'What the numbers mean': 'Qué significan los números',
    'Refractometer on — in both the dial-in and the brew log': 'Refractómetro activado — en el ajuste de espresso y en el registro de filtrado',
    'Refractometer off — in both instruments': 'Refractómetro desactivado — en las dos herramientas',
    'Synced': 'Sincronizado',
    'Synced · {list}': 'Sincronizado · {list}',
    '{n} brew on this device, backed up as you log them.': '{n} preparación en este dispositivo, con copia a medida que registras.',
    '{n} brews on this device, backed up as you log them.': '{n} preparaciones en este dispositivo, con copia a medida que las registras.',
    'Brews back up as you log them.': 'Las preparaciones se copian a medida que las registras.',

    /* ---------- help ---------- */
    '<strong>Ratio</strong> is water divided by coffee. 15g and 250g is 1:16.7. It describes the brew; it is not a measure of how much was taken out of the bed.':
      'La <strong>proporción</strong> es el agua dividida por el café. 15 g y 250 g es 1:16.7. Describe la preparación; no mide cuánto se sacó de la cama.',
    '<strong>Drawdown</strong> is the time between your last pour landing and the bed running dry. It is the number that moves first when the grind moves, and a bed that takes ninety seconds to clear is telling you something the taste will not say for another minute.':
      'El <strong>drenado</strong> es el tiempo entre que cae tu último vertido y que la cama se queda seca. Es el número que se mueve primero cuando se mueve la molienda, y una cama que tarda noventa segundos en vaciarse te está diciendo algo que el sabor no dirá hasta un minuto después.',
    '<strong>The pours</strong> are kept as the running total on the scale, the way a recipe is written: a bloom to 30g, then to 150g, then to 240g. Not the weight of each pour — that is the number the app works out and shows you, because the scale on your counter is already doing the adding.':
      '<strong>Los vertidos</strong> se guardan como el total acumulado en la balanza, como se escribe una receta: un bloom hasta 30 g, luego hasta 150 g, luego hasta 240 g. No el peso de cada vertido — ese es el número que la app calcula y te muestra, porque la balanza de tu encimera ya está sumando.',
    '<strong>The bloom</strong> is the first pour, and what matters is its size against the dose — two to three times is the working range. Less and part of the bed never wets; more and you are brewing before the coffee has finished degassing.':
      '<strong>El bloom</strong> es el primer vertido, y lo que importa es su tamaño respecto a la dosis — entre dos y tres veces es el rango de trabajo. Menos y parte de la cama nunca se moja; más y estás extrayendo antes de que el café termine de desgasificar.',
    '<strong>Extraction yield</strong> is the share of the dry coffee that ended up dissolved in the cup. It needs a refractometer <em>and</em> the cup on a scale: the bed keeps roughly twice its own weight, so the water you poured is not the drink you got. Every tool that computes filter yield from coffee and water alone is estimating that retention and printing it as a reading. This one returns nothing without both.':
      'El <strong>rendimiento de extracción</strong> es la parte del café seco que acabó disuelta en la taza. Necesita un refractómetro <em>y</em> la taza en una balanza: la cama retiene más o menos el doble de su peso, así que el agua que vertiste no es la bebida que obtuviste. Toda herramienta que calcula el rendimiento del filtrado solo con café y agua está estimando esa retención y presentándola como una lectura. Esta no devuelve nada sin las dos cosas.',
    '<strong>How far to move the grinder</strong> is the question most brewing advice dodges, because the number on your grinder means nothing on anybody else\'s. It means something on yours: two brews that differ only in grind are a measurement of it, and once this board has a couple it tells you how many clicks rather than "a step", and what the clock should read afterwards. It only does this where the water passes through the bed — in a brewer that steeps, the time is what you set the timer to, so there is no seconds-per-click to find and the app does not invent one.':
      '<strong>Cuánto mover el molino</strong> es la pregunta que esquivan la mayoría de los consejos, porque el número de tu molino no significa nada en el de otra persona. En el tuyo sí: dos preparaciones que solo difieren en la molienda son una medida de él, y cuando este tablero tiene un par te dice cuántos clics en vez de "un paso", y qué debería marcar el reloj después. Solo lo hace donde el agua atraviesa la cama — en un método de inmersión, el tiempo es el que pones en el temporizador, así que no hay segundos por clic que encontrar y la app no se los inventa.',
    '<strong>The window</strong> is yours, per coffee. Nothing here calls a brew quick or long until you have said what it is being measured against.':
      '<strong>La ventana</strong> es tuya, por café. Nada aquí llama rápida o larga a una preparación hasta que digas contra qué se mide.',
    '<strong>Sour, bitter, thin, strong</strong> are two questions, not four, and the app asks them separately because they are answered separately.':
      '<strong>Ácido, amargo, aguado, intenso</strong> son dos preguntas, no cuatro, y la app las hace por separado porque se responden por separado.',
    '<strong>Sour and bitter</strong> are the extraction walls. Sour is water that did not take enough out of the bed; bitter is water that took too much. Grind is the variable.':
      '<strong>Ácido y amargo</strong> son los extremos de la extracción. Ácido es agua que no sacó suficiente de la cama; amargo es agua que sacó demasiado. La variable es la molienda.',
    '<strong>Thin and strong</strong> are the concentration walls, and grind is not the variable. A brew can be extracted perfectly and still be thin, because thin is about how much coffee ended up in the cup: that is the ratio. Thin means less water or more coffee; strong means the other way.':
      '<strong>Aguado e intenso</strong> son los extremos de la concentración, y la variable no es la molienda. Una preparación puede estar perfectamente extraída y aun así ser aguada, porque aguado tiene que ver con cuánto café acabó en la taza: eso es la proporción. Aguado significa menos agua o más café; intenso, lo contrario.',
    'A cup can sit on one wall, both, or neither, which is why they get a scale each rather than one word for the whole brew.':
      'Una taza puede estar en un extremo, en los dos o en ninguno, por eso cada uno tiene su propia escala en vez de una sola palabra para toda la preparación.',
    '<strong>Your setup</strong> decides what this app asks you for. Say the coffee steeps rather than drains and the app stops treating the clock as a symptom — in an immersion brewer the time is a decision you made, so grinding finer does not lengthen it. Say your kettle holds one temperature and the temperature field leaves the sheet. Change it any time in Settings.':
      '<strong>Tu equipo</strong> decide lo que esta app te pide. Di que el café reposa en vez de drenar y la app deja de tratar el reloj como un síntoma — en un método de inmersión el tiempo es una decisión tuya, así que moler más fino no lo alarga. Di que tu hervidor tiene una sola temperatura y el campo de temperatura desaparece de la hoja. Cámbialo cuando quieras en Ajustes.',
    'Everything is stored on this device and works with no signal. An account is optional, and all it does is copy the log to the other devices you sign in on.':
      'Todo se guarda en este dispositivo y funciona sin cobertura. La cuenta es opcional, y lo único que hace es copiar el registro a los otros dispositivos donde inicies sesión.',
  });
})();
